import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateApacScores, computeDePoortDecision } from "@/lib/apac/processApacScores";
import type { ApacScores } from "@/lib/apac/types";
import { APAC_DIMENSIONS } from "@/lib/apac/types";
import { sendEmail } from "@/lib/email";

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

  if (!email) {
    console.warn("[tally-webhook] No email found in submission:", payload.data.responseId);
    return NextResponse.json({ error: "E-mailadres niet gevonden in formulier" }, { status: 422 });
  }

  // --- Haal alle apac_questions op met tally_field_id ---
  const { data: questions, error: qErr } = await supabase
    .from("apac_questions")
    .select("id, variable, weight, tally_field_id, options")
    .not("tally_field_id", "is", null)
    .eq("is_active", true);

  if (qErr) {
    console.error("[tally-webhook] questions error:", qErr);
    return NextResponse.json({ error: "DB fout" }, { status: 500 });
  }

  if (!questions || questions.length === 0) {
    console.warn("[tally-webhook] No questions with tally_field_id configured");
    return NextResponse.json({ error: "Geen vraagkoppelingen geconfigureerd" }, { status: 422 });
  }

  // --- Map Tally veldwaarden naar numerieke antwoorden per vraag ---
  type QuestionRow = typeof questions[number];

  const tallyFieldMap = new Map<string, TallyField>(fields.map((f) => [f.key, f]));

  const mappedAnswers: { question: QuestionRow; answerValue: number }[] = [];

  for (const q of questions) {
    const tallyField = tallyFieldMap.get(q.tally_field_id!);
    if (!tallyField) continue;

    const numericValue = extractNumericValue(tallyField, q.options as { label: string; value: number }[]);
    if (numericValue === null) continue;

    mappedAnswers.push({ question: q, answerValue: numericValue });
  }

  if (mappedAnswers.length === 0) {
    console.warn("[tally-webhook] No matched answers for submission:", payload.data.responseId);
    return NextResponse.json({ error: "Geen gekoppelde vragen gevonden" }, { status: 422 });
  }

  // --- Bereken gewogen scores per dimensie ---
  const allDimensions = [
    ...APAC_DIMENSIONS,
    "b5_openness", "b5_conscientiousness", "b5_extraversion", "b5_agreeableness", "b5_stability",
  ];
  const dimensionTotals: Record<string, { weightedSum: number; totalWeight: number }> = {};
  for (const dim of allDimensions) {
    dimensionTotals[dim] = { weightedSum: 0, totalWeight: 0 };
  }

  for (const { question: q, answerValue } of mappedAnswers) {
    const dim = q.variable as string;
    if (dimensionTotals[dim]) {
      dimensionTotals[dim].weightedSum += answerValue * (q.weight ?? 1);
      dimensionTotals[dim].totalWeight += q.weight ?? 1;
    }
  }

  const scores: ApacScores = {
    adaptability: 0,
    personality: 0,
    awareness: 0,
    connection: 0,
  };

  for (const dim of APAC_DIMENSIONS) {
    const t = dimensionTotals[dim];
    scores[dim] = t.totalWeight > 0
      ? Math.max(1, Math.min(10, Math.round((t.weightedSum / t.totalWeight) * 10) / 10))
      : 1;
  }

  const validation = validateApacScores(scores);
  if (!validation.valid) {
    console.error("[tally-webhook] Invalid scores:", validation.errors);
    return NextResponse.json({ error: "Ongeldige scores" }, { status: 422 });
  }

  // --- Kandidaat ophalen of aanmaken ---
  let kandidaatId: string;

  const { data: existing } = await supabase
    .from("kandidaten")
    .select("id")
    .eq("email", email)
    .single();

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
      })
      .select("id")
      .single();

    if (createErr || !created) {
      console.error("[tally-webhook] kandidaat create error:", createErr);
      return NextResponse.json({ error: "Kon kandidaat niet aanmaken" }, { status: 500 });
    }
    kandidaatId = created.id;
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
    const { count } = await supabase
      .from("apac_resultaten")
      .select("kandidaat_id", { count: "exact", head: true })
      .eq("is_seed", false);

    poortDecision = computeDePoortDecision({
      totalKandidaten: count ?? 0,
      config: poortConfig,
      scores,
    });
  }

  const submittedAt = payload.data.submittedAt ?? new Date().toISOString();

  // --- portal_session aanmaken voor traceerbaarheid ---
  const sessionToken = crypto.randomUUID();
  const { data: sessionData } = await supabase
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

  const sessionId = sessionData?.id ?? null;

  // --- apac_resultaten opslaan ---
  const poolStatusMap: Record<string, string> = {
    pool: "in_selectie",
    pending_review: "prospect",
  };
  const newPoolStatus = poolStatusMap[poortDecision.newPoolStatus] ?? "prospect";

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

  await supabase
    .from("kandidaten")
    .update({ pool_status: newPoolStatus, apac_source: "tally" })
    .eq("id", kandidaatId);

  // --- Individuele antwoorden opslaan in apac_antwoorden ---
  if (sessionId) {
    const antwoordRows = mappedAnswers.map(({ question: q, answerValue }) => ({
      session_id: sessionId,
      kandidaat_id: kandidaatId,
      question_id: q.id,
      answer_value: answerValue,
      created_at: submittedAt,
    }));

    const { error: antwoordError } = await supabase
      .from("apac_antwoorden")
      .insert(antwoordRows);

    if (antwoordError) {
      console.error("[tally-webhook] apac_antwoorden error:", antwoordError);
    }
  }

  // --- Activiteit loggen ---
  await supabase.from("activiteiten").insert({
    type: "notitie",
    beschrijving: `APAC-test voltooid via Tally. Scores: A=${scores.adaptability} P=${scores.personality} A=${scores.awareness} C=${scores.connection}.`,
    kandidaat_id: kandidaatId,
    metadata: { scores, bron: "tally", poort: poortDecision, tallyResponseId: payload.data.responseId },
  });

  // --- CRM-notificaties naar admins ---
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["superadmin", "admin"]);

  if (admins && admins.length > 0) {
    const notificaties = admins.map((admin) => ({
      user_id: admin.id,
      titel: "Nieuwe APAC-test via Tally",
      bericht: `${voornaam} (${email}) heeft de APAC-test voltooid via Tally. Scores: A=${scores.adaptability} P=${scores.personality} A=${scores.awareness} C=${scores.connection}.`,
      type: "info",
      link: `/kandidaten/${kandidaatId}`,
    }));

    await supabase.from("notificaties").insert(notificaties);
  }

  // --- E-mail notificatie naar geconfigureerde adressen ---
  const { data: formConfig } = await supabase
    .from("apac_form_config")
    .select("notification_emails")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const notifEmails: string[] = formConfig?.notification_emails ?? [];
  if (notifEmails.length > 0) {
    const gecombineerdScore = Math.round(
      ((scores.adaptability + scores.personality + scores.awareness + scores.connection) / 4) * 10
    ) / 10;

    await sendEmail({
      to: notifEmails,
      subject: `Nieuwe APAC-test voltooid — ${voornaam}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#1a2e1a;margin-bottom:8px">Nieuwe APAC-test voltooid (Tally)</h2>
          <p style="color:#555;margin-bottom:24px">
            <strong>${voornaam}</strong> (${email}) heeft de APAC-test voltooid via Tally.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr style="background:#f4f4f4">
              <th style="text-align:left;padding:8px 12px;font-size:12px;color:#888;text-transform:uppercase">Dimensie</th>
              <th style="text-align:right;padding:8px 12px;font-size:12px;color:#888;text-transform:uppercase">Score</th>
            </tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #eee">Adaptability</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #eee">${scores.adaptability}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #eee">Personality</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #eee">${scores.personality}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #eee">Awareness</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #eee">${scores.awareness}</td></tr>
            <tr><td style="padding:8px 12px;border-bottom:1px solid #eee">Connection</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid #eee">${scores.connection}</td></tr>
            <tr style="background:#f4f4f4;font-weight:bold">
              <td style="padding:8px 12px">Gecombineerd</td>
              <td style="padding:8px 12px;text-align:right">${gecombineerdScore}</td>
            </tr>
          </table>
          <p style="color:#999;font-size:12px">
            Bekijk het kandidaatprofiel in het Radical Portal admin dashboard.
          </p>
        </div>
      `,
    });
  }

  return NextResponse.json({ ok: true, kandidaatId, scores });
}

// ---------------------------------------------------------------------------
// Hulpfunctie: extraheer numerieke waarde uit een Tally veld
// ---------------------------------------------------------------------------

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
