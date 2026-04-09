import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateApacScores, computeDePoortDecision } from "@/lib/apac/processApacScores";
import { evaluateVetoTriggers, buildVetoEmailHtml } from "@/lib/apac/scoring";
import type { ApacScores, VetoDetail } from "@/lib/apac/types";
import { APAC_DIMENSIONS } from "@/lib/apac/types";
import { sendEmail } from "@/lib/email";
import { emailWrap, datumNL, buildApacScoreTable, buildDePoortBadge, buildCtaButton, BADGE, STATUS_KLEUR, ROW } from "@/lib/email/templates";
import { notifyAdmins } from "@/lib/automation/notifyAdmins";
import { getNotifiableUsers } from "@/lib/automation/emailVoorkeuren";

// ---------------------------------------------------------------------------
// Tally webhook payload types
// ---------------------------------------------------------------------------

interface TallyOption {
  id: string;
  text: string;
}

interface TallyField {
  key: string;
  label: string;
  type: string;
  value: string | string[] | null;
  options?: TallyOption[];
}

interface TallyWebhookPayload {
  eventId: string;
  eventType: string;
  createdAt: string;
  data: {
    responseId: string;
    submittedAt: string;
    fields: TallyField[];
  };
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/tally
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Optionele HMAC verificatie via TALLY_SIGNING_SECRET
  const signingSecret = process.env.TALLY_SIGNING_SECRET;
  if (signingSecret) {
    const signature = request.headers.get("tally-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const body = await request.text();
    const { createHmac } = await import("crypto");
    const expected = createHmac("sha256", signingSecret).update(body).digest("base64");
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    try {
      const payload = JSON.parse(body) as TallyWebhookPayload;
      return await processTallyPayload(payload);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  // Zonder signing secret: direct JSON parsen
  let payload: TallyWebhookPayload;
  try {
    payload = (await request.json()) as TallyWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  return await processTallyPayload(payload);
}

// ---------------------------------------------------------------------------
// Payload verwerking
// ---------------------------------------------------------------------------

async function processTallyPayload(payload: TallyWebhookPayload) {
  if (payload.eventType !== "FORM_RESPONSE") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {

  const fields = payload.data?.fields ?? [];
  const supabase = createServiceClient();

  // --- Extraheer e-mail en naam uit Tally velden ---
  const emailField = fields.find((f) =>
    f.type === "INPUT_EMAIL" || f.label.toLowerCase().includes("email") || f.label.toLowerCase().includes("e-mail")
  );
  const firstNameField = fields.find((f) =>
    f.type === "INPUT_TEXT" && (
      f.label.toLowerCase().includes("voornaam") ||
      f.label.toLowerCase().includes("naam") ||
      f.label.toLowerCase().includes("name") ||
      f.label.toLowerCase().includes("first")
    )
  );

  const email = typeof emailField?.value === "string" ? emailField.value.trim().toLowerCase() : null;
  const voornaam = typeof firstNameField?.value === "string" ? firstNameField.value.trim() : "Onbekend";

  // --- Extraheer education velden ---
  // Tally velden: "HBO or University" (DROPDOWN), "Bachelor, Master or not completed" (CHECKBOXES), "Education" (DROPDOWN)
  const educationField = fields.find((f) =>
    (f.type === "MULTIPLE_CHOICE" || f.type === "DROPDOWN" || f.type === "CHECKBOXES") &&
    (f.label.toLowerCase().includes("hbo or university") || f.label.toLowerCase().includes("hbo of universiteit"))
  );
  const educationLevelField = fields.find((f) =>
    (f.type === "MULTIPLE_CHOICE" || f.type === "DROPDOWN" || f.type === "CHECKBOXES") &&
    (f.label.toLowerCase().includes("bachelor") || f.label.toLowerCase().includes("master"))
  );
  const educationNameField = fields.find((f) =>
    (f.type === "DROPDOWN" || f.type === "MULTIPLE_CHOICE") &&
    f.label.toLowerCase() === "education"
  );

  const education = extractChoiceText(educationField);
  const educationLevel = extractChoiceText(educationLevelField);
  const educationName = extractChoiceText(educationNameField);

  // --- Extraheer opmerkingen/comments veld ---
  const commentField = fields.find((f) =>
    (f.type === "TEXTAREA" || f.type === "INPUT_TEXT") &&
    (f.label.toLowerCase().includes("comment") ||
     f.label.toLowerCase().includes("opmerkingen") ||
     f.label.toLowerCase().includes("opmerking") ||
     f.label.toLowerCase().includes("remarks") ||
     f.label.toLowerCase().includes("feedback"))
  );
  const respondentOpmerkingen = typeof commentField?.value === "string"
    ? commentField.value.trim() || null
    : null;

  if (!email) {
    console.warn("[tally-webhook] No email found in submission:", payload.data.responseId);
    return NextResponse.json({ error: "E-mailadres niet gevonden in formulier" }, { status: 422 });
  }

  // --- Extraheer scores direct uit Tally CALCULATED_FIELDS ---
  // Tally berekent scores per dimensie als som van vraagpunten.
  // Max per APAC-dimensie = 5 vragen × 10 punten = 50.
  const MAX_APAC_RAW = 50;

  function getTallyCalculatedScore(label: string): number | null {
    const field = fields.find(
      (f) => f.type === "CALCULATED_FIELDS" &&
             f.label.toLowerCase() === label.toLowerCase()
    );
    if (!field || typeof field.value !== "number") return null;
    return Math.max(1, Math.min(10, Math.round((field.value / MAX_APAC_RAW) * 100) / 10));
  }

  const adaptability = getTallyCalculatedScore("Adaptability");
  const personality  = getTallyCalculatedScore("Personality");
  const awareness    = getTallyCalculatedScore("Awareness");
  const connection   = getTallyCalculatedScore("Connection");

  if (adaptability === null || personality === null || awareness === null || connection === null) {
    console.warn("[tally-webhook] CALCULATED_FIELDS niet gevonden in submission:", payload.data.responseId);
    return NextResponse.json({ error: "Scores niet gevonden in Tally payload" }, { status: 422 });
  }

  const scores: ApacScores = { adaptability, personality, awareness, connection };

  const validation = validateApacScores(scores);
  if (!validation.valid) {
    console.error("[tally-webhook] Invalid scores:", validation.errors);
    return NextResponse.json({ error: "Ongeldige scores" }, { status: 422 });
  }

  // --- Veto detectie uit individuele Tally antwoorden ---
  let vetoDetails: VetoDetail[] = [];
  let vetoGetriggerd = false;

  const { data: vetoQuestions, error: vetoQErr } = await supabase
    .from("apac_questions")
    .select("id, question_text, is_veto, options, tally_field_id")
    .eq("is_veto", true)
    .eq("is_active", true);
  if (vetoQErr) console.error("[tally-webhook] apac_questions fetch error:", vetoQErr.message);

  if (vetoQuestions && vetoQuestions.length > 0) {
    const vetoChecks = [];
    for (const vq of vetoQuestions) {
      if (!vq.tally_field_id) {
        console.warn(`[tally-webhook] Veto question ${vq.id} has no tally_field_id — skipping`);
        continue;
      }
      // Match Tally field by key (= tally_field_id)
      const tallyField = fields.find((f) => f.key === vq.tally_field_id);
      if (!tallyField) continue;

      const options = (vq.options as { label: string; value: number; is_veto_fout?: boolean }[]) ?? [];
      const answerValue = extractNumericValue(tallyField, options);
      if (answerValue !== null) {
        vetoChecks.push({
          question: { id: vq.id, question_text: vq.question_text ?? "", options },
          answerValue,
        });
      }
    }
    vetoDetails = evaluateVetoTriggers(vetoChecks);
    vetoGetriggerd = vetoDetails.length > 0;
  }

  // Also check VetoTriggered calculated field as fallback
  if (!vetoGetriggerd) {
    const vetoCalcField = fields.find(
      (f) => f.type === "CALCULATED_FIELDS" && f.label === "VetoTriggered"
    );
    if (vetoCalcField && typeof vetoCalcField.value === "number" && vetoCalcField.value > 0) {
      vetoGetriggerd = true;
      // We don't have details from the calculated field, just the count
      console.warn(`[tally-webhook] VetoTriggered=${vetoCalcField.value} but no detail from individual questions`);
    }
  }

  // --- Kandidaat ophalen of aanmaken ---
  let kandidaatId: string;

  const { data: existing, error: existingErr } = await supabase
    .from("kandidaten")
    .select("id")
    .eq("email", email)
    .single();
  if (existingErr && existingErr.code !== "PGRST116") {
    console.error("[tally-webhook] kandidaat lookup error:", existingErr.message);
  }

  if (existing) {
    kandidaatId = existing.id;
  } else {
    const { data: created, error: createErr } = await supabase
      .from("kandidaten")
      .insert({
        voornaam,
        achternaam: "",
        email,
        pool_status: "prospect",
        apac_source: "tally",
        ...(education && { education }),
        ...(educationLevel && { education_level: educationLevel }),
        ...(educationName && { education_name: educationName }),
      })
      .select("id")
      .single();

    if (createErr || !created) {
      console.error("[tally-webhook] kandidaat create error:", createErr);
      return NextResponse.json({ error: "Kon kandidaat niet aanmaken" }, { status: 500 });
    }
    kandidaatId = created.id;

    // Notificatie: nieuwe kandidaat aangemeld
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";
    notifyAdmins({
      key: "nieuwe_kandidaat",
      subject: `Nieuwe kandidaat: ${voornaam}`,
      html: emailWrap("Nieuwe kandidaat aangemeld", datumNL(),
        `<table style="width:100%;border-collapse:collapse">
          ${ROW("Naam", voornaam)}
          ${ROW("E-mail", `<a href="mailto:${email}" style="color:#3498db">${email}</a>`, true)}
          ${ROW("Status", BADGE("PROSPECT", "#3498db"))}
          ${ROW("Bron", BADGE("TALLY", "#9b59b6"), true)}
        </table>
        ${buildCtaButton(`${siteUrl}/admin/candidates?id=${created.id}`, "Bekijk kandidaat")}`),
      bericht: `${voornaam} (${email}) aangemeld via Tally APAC-formulier`,
      link: `/admin/candidates?id=${created.id}`,
    }).catch(() => {});
  }

  // --- De Poort check ---
  let poortDecision: { leerfase: boolean; newPoolStatus: "pool" | "pending_review" } = {
    leerfase: true,
    newPoolStatus: "pool",
  };

  const { data: poortConfig } = await supabase
    .from("poort_config")
    .select("*")
    .limit(1)
    .single();

  if (poortConfig) {
    const { count, error: countErr } = await supabase
      .from("apac_resultaten")
      .select("kandidaat_id", { count: "exact", head: true })
      .eq("is_seed", false);
    if (countErr) console.error("[tally-webhook] apac_resultaten count error:", countErr.message);

    poortDecision = computeDePoortDecision({
      totalKandidaten: count ?? 0,
      config: poortConfig,
      scores,
    });
  }

  const submittedAt = payload.data.submittedAt ?? new Date().toISOString();

  // --- portal_session aanmaken voor traceerbaarheid ---
  const sessionToken = crypto.randomUUID();
  const { data: sessionData, error: sessionErr } = await supabase
    .from("portal_sessions")
    .insert({
      session_token: sessionToken,
      source: "tally",
      apac_completed: true,
      linked_kandidaat_id: kandidaatId,
      linked_at: submittedAt,
      scores: scores as unknown as Record<string, unknown>,
      created_at: submittedAt,
    })
    .select("id")
    .single();
  if (sessionErr) console.error("[tally-webhook] portal_session create error:", sessionErr.message);

  const sessionId = sessionData?.id ?? null;

  // --- apac_resultaten opslaan ---
  // Leerfase: altijd prospect (handmatige review door Nelieke)
  // Actieve fase: pool → in_selectie, pending_review → prospect
  const newPoolStatus = poortDecision.leerfase
    ? "prospect"
    : poortDecision.newPoolStatus === "pool"
      ? "in_selectie"
      : "prospect";

  const { error: resultatenError } = await supabase.from("apac_resultaten").upsert(
    {
      kandidaat_id: kandidaatId,
      adaptability: scores.adaptability,
      personality: scores.personality,
      awareness: scores.awareness,
      connection: scores.connection,
      bron: "tally",
      is_seed: false,
      portal_session_id: sessionId,
      created_at: submittedAt,
      veto_getriggerd: vetoGetriggerd,
      veto_details: vetoDetails,
      respondent_opmerkingen: respondentOpmerkingen,
    },
    { onConflict: "kandidaat_id" }
  );

  if (resultatenError) {
    console.error("[tally-webhook] apac_resultaten upsert error:", resultatenError);
    return NextResponse.json(
      { error: "Failed to save APAC results", details: resultatenError.message },
      { status: 500 }
    );
  }

  const { error: updateErr } = await supabase
    .from("kandidaten")
    .update({
      pool_status: newPoolStatus,
      apac_source: "tally",
      ...(education && { education }),
      ...(educationLevel && { education_level: educationLevel }),
      ...(educationName && { education_name: educationName }),
    })
    .eq("id", kandidaatId);
  if (updateErr) console.error("[tally-webhook] kandidaat update error:", updateErr.message);

  // Individuele antwoorden worden niet opgeslagen voor Tally-inzendingen
  // (Tally stuurt alleen CALCULATED_FIELDS, geen individuele antwoorden)

  // --- Activiteit loggen ---
  const vetoLogSuffix = vetoGetriggerd ? ` Veto: ${vetoDetails.length} getriggerd.` : "";
  const { error: actError } = await supabase.from("activiteiten").insert({
    type: "apac",
    beschrijving: `APAC-test voltooid via Tally. Scores: A=${scores.adaptability} P=${scores.personality} A=${scores.awareness} C=${scores.connection}.${vetoLogSuffix}`,
    kandidaat_id: kandidaatId,
    metadata: { scores, bron: "tally", poort: poortDecision, tallyResponseId: payload.data.responseId, vetoDetails, respondentOpmerkingen },
  });
  if (actError) console.error("[tally-webhook] activiteiten insert error:", actError.message);

  // --- CRM-notificaties naar admins ---
  const { data: admins } = await supabase
    .from("portal_users")
    .select("auth_user_id")
    .eq("role", "admin");

  if (admins && admins.length > 0) {
    const vetoNotifSuffix = vetoGetriggerd ? ` ⚠ Veto: ${vetoDetails.length} getriggerd!` : "";
    const commentNotifSuffix = respondentOpmerkingen ? ` Opmerking: "${respondentOpmerkingen.slice(0, 100)}${respondentOpmerkingen.length > 100 ? "…" : ""}"` : "";
    const notificaties = admins.map((admin) => ({
      user_id: admin.auth_user_id,
      titel: vetoGetriggerd ? "Nieuwe APAC-test via Tally ⚠ Veto" : "Nieuwe APAC-test via Tally",
      bericht: `${voornaam} (${email}) heeft de APAC-test voltooid via Tally. Scores: A=${scores.adaptability} P=${scores.personality} A=${scores.awareness} C=${scores.connection}.${vetoNotifSuffix}${commentNotifSuffix}`,
      type: vetoGetriggerd ? "warning" : "info",
      link: `/kandidaten/${kandidaatId}`,
    }));

    const { error: notifErr } = await supabase.from("notificaties").insert(notificaties);
    if (notifErr) console.error("[tally-webhook] notificaties insert error:", notifErr.message);
  }

  // --- E-mail notificatie naar admins met apac_voltooid voorkeur aan ---
  const notifiableUsers = await getNotifiableUsers("apac_voltooid");
  if (notifiableUsers.length > 0) {
    const notifEmails = notifiableUsers.map((u) => u.email);
    const gecombineerdScore = Math.round(
      ((scores.adaptability + scores.personality + scores.awareness + scores.connection) / 4) * 10
    ) / 10;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";
    const profileUrl = `${siteUrl}/admin/candidates?id=${kandidaatId}`;

    const vetoEmailHtml = buildVetoEmailHtml(vetoDetails);

    const poortBadge = buildDePoortBadge(newPoolStatus, poortDecision.leerfase);
    const statusBadge = BADGE(newPoolStatus.toUpperCase(), STATUS_KLEUR[newPoolStatus] || "#888");

    await sendEmail({
      to: notifEmails,
      subject: vetoGetriggerd
        ? `Nieuwe aanmelding — ${voornaam} ⚠ Veto getriggerd`
        : `Nieuwe aanmelding — ${voornaam}`,
      html: emailWrap(
        vetoGetriggerd ? `Nieuwe aanmelding — ${voornaam} ⚠ Veto` : `Nieuwe aanmelding — ${voornaam} (Tally)`,
        datumNL(),
        `<p style="color:#555;margin-bottom:16px">
            <strong>${voornaam}</strong> (${email}) heeft de APAC-test voltooid via Tally.
          </p>
          ${vetoEmailHtml}
          <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
            <tr><td style="padding:10px 12px;border-bottom:1px solid #eee"><strong>De Poort</strong></td><td style="padding:10px 12px;border-bottom:1px solid #eee">${poortBadge}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:10px 12px;border-bottom:1px solid #eee"><strong>Pool status</strong></td><td style="padding:10px 12px;border-bottom:1px solid #eee">${statusBadge}</td></tr>
          </table>
          ${buildApacScoreTable(scores)}
          ${respondentOpmerkingen ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0">
            <p style="color:#0369a1;font-weight:bold;margin:0 0 4px 0;font-size:13px">Opmerkingen van kandidaat</p>
            <p style="color:#0c4a6e;margin:0;font-size:14px;white-space:pre-wrap">${respondentOpmerkingen.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>` : ""}
          ${buildCtaButton(profileUrl, "Bekijk kandidaat")}`
      ),
    });
  }

  return NextResponse.json({ ok: true, kandidaatId, scores });
  } catch (error) {
    console.error("[tally-webhook] Processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tally verwerking mislukt" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Hulpfunctie: extraheer numerieke waarde uit een Tally veld
// ---------------------------------------------------------------------------

function extractChoiceText(field: TallyField | undefined): string | null {
  if (!field) return null;
  if (typeof field.value === "string") return field.value.trim() || null;
  if (Array.isArray(field.value) && field.options) {
    // Map selected option IDs to their text labels
    const texts = field.value
      .map((id) => field.options!.find((o) => o.id === id)?.text?.trim())
      .filter(Boolean);
    return texts.length > 0 ? texts.join(", ") : null;
  }
  return null;
}

function extractNumericValue(
  field: TallyField,
  options: { label: string; value: number }[]
): number | null {
  // Directe numerieke waarde
  if (typeof field.value === "number") {
    return field.value;
  }

  // String die een getal is
  if (typeof field.value === "string") {
    const n = parseFloat(field.value);
    if (!isNaN(n)) return n;
  }

  // MULTIPLE_CHOICE: value is array van geselecteerde option ID's
  // Match de geselecteerde optie-tekst met onze options (label → value)
  if (Array.isArray(field.value) && field.options) {
    const selectedId = field.value[0]; // single choice
    const tallyOption = field.options.find((o) => o.id === selectedId);
    if (!tallyOption) return null;

    // Koppel de tekst aan onze opties via label match
    const matched = options.find(
      (o) => o.label.toLowerCase().trim() === tallyOption.text.toLowerCase().trim()
    );
    return matched?.value ?? null;
  }

  return null;
}
