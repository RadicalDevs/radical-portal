"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { validateApacScores, computeDePoortDecision } from "@/lib/apac/processApacScores";
import { calculateMaxScores, evaluateVetoTriggers, buildVetoEmailHtml } from "@/lib/apac/scoring";
import type { ApacScores, ApacMaxScores, ApacDimension, ApacFormConfig, VetoDetail } from "@/lib/apac/types";
import { APAC_DIMENSIONS } from "@/lib/apac/types";
import { sendEmail, sendApacResultsEmail } from "@/lib/email";
import { emailWrap, datumNL, buildApacScoreTable, buildDePoortBadge, buildCtaButton, BADGE, STATUS_KLEUR } from "@/lib/email/templates";
import { getNotifiableUsers } from "@/lib/automation/emailVoorkeuren";

// ---------------------------------------------------------------------------
// Form config (public read)
// ---------------------------------------------------------------------------

export async function getPublicFormConfig(): Promise<ApacFormConfig | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("apac_form_config")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as ApacFormConfig;
}

// ---------------------------------------------------------------------------
// Turnstile verification
// ---------------------------------------------------------------------------

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // In development zonder key: laat door
    console.warn("[Turnstile] No secret key configured — skipping verification");
    return true;
  }
  if (!token) {
    // Captcha kon niet laden (bijv. ad blocker) — laat door met warning
    console.warn("[Turnstile] Empty token received — captcha may have failed to load, bypassing");
    return true;
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  const data = await res.json();
  return data.success === true;
}

// ---------------------------------------------------------------------------
// 1. Create session
// ---------------------------------------------------------------------------

const CreateSessionSchema = z.object({
  turnstileToken: z.string(),
  source: z.enum(["website", "email", "social_media", "linkedin", "direct"]).default("website"),
  firstName: z.string().min(1, "Voornaam is verplicht").max(100),
  email: z.string().email("Ongeldig e-mailadres"),
});

export type CreateSessionResult =
  | { success: true; sessionId: string; sessionToken: string; kandidaatId: string }
  | { success: false; error: string };

export async function createApacSession(
  formData: FormData
): Promise<CreateSessionResult> {
  const parsed = CreateSessionSchema.safeParse({
    turnstileToken: formData.get("turnstileToken"),
    source: formData.get("source") || "website",
    firstName: formData.get("firstName"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Verify captcha
  const valid = await verifyTurnstile(parsed.data.turnstileToken);
  if (!valid) {
    return { success: false, error: "Captcha verificatie mislukt. Probeer het opnieuw." };
  }

  const supabase = createServiceClient();
  const { firstName, email, source } = parsed.data;

  // --- Kandidaat opzoeken of aanmaken ---
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
        voornaam: firstName,
        achternaam: "",
        email,
        pool_status: "prospect",
        apac_source: "portal",
      })
      .select("id")
      .single();

    if (createErr || !created) {
      console.error("[createApacSession] kandidaat create error:", createErr);
      return { success: false, error: "Kon gegevens niet opslaan. Probeer het opnieuw." };
    }
    kandidaatId = created.id;
  }

  // --- Portal session aanmaken ---
  const sessionToken = crypto.randomUUID();

  const { data, error } = await supabase
    .from("portal_sessions")
    .insert({
      session_token: sessionToken,
      source,
      apac_completed: false,
      linked_kandidaat_id: kandidaatId,
      linked_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createApacSession] session create error:", error);
    return { success: false, error: "Er ging iets mis. Probeer het opnieuw." };
  }

  return { success: true, sessionId: data.id, sessionToken, kandidaatId };
}

// ---------------------------------------------------------------------------
// 2. Fetch questions
// ---------------------------------------------------------------------------

export interface ApacQuestion {
  id: string;
  question_text: string;
  options: { label: string; value: number }[];
  variable: ApacDimension;
  weight: number;
  sort_order: number;
}

export async function getApacQuestions(): Promise<ApacQuestion[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("apac_questions")
    .select("id, question_text, options, variable, weight, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getApacQuestions] DB error:", error);
    return [];
  }

  return (data ?? []) as ApacQuestion[];
}

// ---------------------------------------------------------------------------
// 3. Submit APAC test
// ---------------------------------------------------------------------------

const AnswerSchema = z.record(z.string(), z.number());

const SubmitSchema = z.object({
  sessionId: z.string().uuid("Ongeldige sessie"),
  sessionToken: z.string().min(1, "Sessie token ontbreekt"),
  opmerkingen: z.string().max(2000).optional(),
  answers: z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      const result = AnswerSchema.safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ongeldige antwoorden" });
        return z.NEVER;
      }
      return result.data;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ongeldige JSON" });
      return z.NEVER;
    }
  }),
});

export type SubmitApacResult =
  | { success: true; sessionId: string }
  | { success: false; error: string };

export async function submitApacTest(formData: FormData): Promise<SubmitApacResult> {
  const parsed = SubmitSchema.safeParse({
    sessionId: formData.get("sessionId"),
    sessionToken: formData.get("sessionToken"),
    answers: formData.get("answers"),
    opmerkingen: formData.get("opmerkingen") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { sessionId, sessionToken, answers, opmerkingen } = parsed.data;
  const supabase = createServiceClient();

  // Verify session exists and is not yet completed
  const { data: session, error: sessionError } = await supabase
    .from("portal_sessions")
    .select("id, apac_completed, linked_kandidaat_id")
    .eq("id", sessionId)
    .eq("session_token", sessionToken)
    .single();

  if (sessionError || !session) {
    return { success: false, error: "Sessie niet gevonden of verlopen." };
  }

  if (session.apac_completed) {
    return { success: false, error: "Deze test is al ingestuurd." };
  }

  // Fetch questions to calculate total point scores (+ veto info)
  const { data: questions, error: qError } = await supabase
    .from("apac_questions")
    .select("id, variable, weight, options, question_text, is_veto")
    .eq("is_active", true);

  if (qError || !questions || questions.length === 0) {
    return { success: false, error: "Kan vragen niet ophalen." };
  }

  // Calculate TOTAAL PUNTEN per dimension: score = SUM(antwoord × gewicht)
  const allDimensions = [
    ...APAC_DIMENSIONS,
    "b5_openness", "b5_conscientiousness", "b5_extraversion", "b5_agreeableness", "b5_stability",
  ];
  const dimensionTotals: Record<string, { weightedSum: number }> = {};
  for (const dim of allDimensions) {
    dimensionTotals[dim] = { weightedSum: 0 };
  }

  for (const q of questions) {
    const answerValue = answers[q.id];
    if (answerValue === undefined) {
      return { success: false, error: `Vraag ${q.id} is niet beantwoord.` };
    }
    const dim = q.variable as string;
    if (dimensionTotals[dim]) {
      dimensionTotals[dim].weightedSum += answerValue * (q.weight ?? 1);
    }
  }

  // Compute APAC scores as TOTAL POINTS (no normalization)
  const scores: ApacScores = {
    adaptability: 0,
    personality: 0,
    awareness: 0,
    connection: 0,
  };

  for (const dim of APAC_DIMENSIONS) {
    scores[dim] = Math.round(dimensionTotals[dim].weightedSum * 10) / 10;
  }

  // Calculate max scores per dimension from question options
  const maxScores: ApacMaxScores = calculateMaxScores(
    questions.map((q) => ({
      variable: q.variable,
      options: (q.options as { value: number }[]) ?? [],
      weight: q.weight ?? 1,
    }))
  );

  // Compute B5 scores as total points (stored in session metadata)
  const b5Scores: Record<string, number> = {};
  for (const dim of allDimensions.filter((d) => d.startsWith("b5_"))) {
    b5Scores[dim] = Math.round(dimensionTotals[dim].weightedSum * 10) / 10;
  }

  // ---- Veto evaluatie ----
  const vetoChecks = questions
    .filter((q) => q.is_veto === true)
    .map((q) => ({
      question: {
        id: q.id,
        question_text: q.question_text ?? "",
        options: (q.options as { label: string; value: number; is_veto_fout?: boolean }[]) ?? [],
      },
      answerValue: answers[q.id],
    }));

  const vetoDetails: VetoDetail[] = evaluateVetoTriggers(vetoChecks);
  const vetoGetriggerd = vetoDetails.length > 0;

  // Validate computed scores against max
  const validation = validateApacScores(scores, maxScores);
  if (!validation.valid) {
    return { success: false, error: `Score validatie mislukt: ${validation.errors.join(", ")}` };
  }

  // ---- De Poort check ----
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

  // ---- Persist results ----
  const kandidaatId = session.linked_kandidaat_id;

  // 1. UPSERT apac_resultaten (unique constraint on kandidaat_id)
  const { error: insertError } = await supabase.from("apac_resultaten").upsert(
    {
      kandidaat_id: kandidaatId,
      adaptability: scores.adaptability,
      personality: scores.personality,
      awareness: scores.awareness,
      connection: scores.connection,
      bron: "portal",
      is_seed: false,
      portal_session_id: sessionId,
      veto_getriggerd: vetoGetriggerd,
      veto_details: vetoDetails,
      respondent_opmerkingen: opmerkingen || null,
    },
    { onConflict: "kandidaat_id" }
  );

  if (insertError) {
    console.error("[submitApacTest] apac_resultaten upsert error:", insertError);
    return { success: false, error: "Kon APAC-resultaten niet opslaan. Probeer het opnieuw." };
  }

  // 1b. INSERT apac_antwoorden — individuele antwoorden per vraag
  const antwoordRows = questions.map((q) => ({
    session_id: sessionId,
    kandidaat_id: kandidaatId,
    question_id: q.id,
    answer_value: answers[q.id],
  }));

  const { error: antwoordError } = await supabase
    .from("apac_antwoorden")
    .insert(antwoordRows);

  if (antwoordError) {
    console.error("[submitApacTest] apac_antwoorden insert error:", antwoordError);
    return { success: false, error: "Kon antwoorden niet opslaan. Probeer het opnieuw." };
  }

  // 2. UPDATE kandidaten.pool_status via De Poort beslissing
  //    Leerfase → "prospect" (Nelieke reviewt handmatig)
  //    Actieve fase → pool_status op basis van drempelscores
  //    Mapping: "pool" → "in_selectie", "pending_review" → "prospect"
  // Leerfase: altijd prospect (handmatige review door Nelieke)
  // Actieve fase: pool → in_selectie, pending_review → prospect
  const newPoolStatus = poortDecision.leerfase
    ? "prospect"
    : poortDecision.newPoolStatus === "pool"
      ? "in_selectie"
      : "prospect";

  await supabase
    .from("kandidaten")
    .update({
      pool_status: newPoolStatus,
      apac_source: "portal",
    })
    .eq("id", kandidaatId);

  // 3. UPDATE portal_sessions — store all scores + maxScores as JSONB
  const allScores = { ...scores, ...b5Scores, maxScores };
  const { error: updateError } = await supabase
    .from("portal_sessions")
    .update({
      apac_completed: true,
      scores: allScores as unknown as Record<string, unknown>,
    })
    .eq("id", sessionId);

  if (updateError) {
    console.error("[submitApacTest] portal_sessions update error:", updateError);
    return { success: false, error: "Kon resultaten niet opslaan." };
  }

  // Pre-compute totals for logging and notifications
  const totaalScore = scores.adaptability + scores.personality + scores.awareness + scores.connection;
  const totaalMax = maxScores.adaptability + maxScores.personality + maxScores.awareness + maxScores.connection;
  const percentage = totaalMax > 0 ? Math.round((totaalScore / totaalMax) * 100) : 0;

  // 4. Log in activiteiten (CRM ziet dit in kandidaat-detail)
  const vetoLogSuffix = vetoGetriggerd ? ` Veto: ${vetoDetails.length} getriggerd.` : "";
  await supabase.from("activiteiten").insert({
    type: "apac",
    beschrijving: `APAC-test voltooid via portal. Scores: A=${scores.adaptability}/${maxScores.adaptability} P=${scores.personality}/${maxScores.personality} Aw=${scores.awareness}/${maxScores.awareness} C=${scores.connection}/${maxScores.connection}. De Poort: ${poortDecision.leerfase ? "leerfase" : "actieve fase"}.${vetoLogSuffix}`,
    kandidaat_id: kandidaatId,
    metadata: { scores, maxScores, b5Scores, bron: "portal", poort: poortDecision, vetoDetails, respondentOpmerkingen: opmerkingen || null },
  });

  // 5. Log user event (portal tracking)
  await supabase.from("user_events").insert({
    session_id: sessionId,
    event_type: "test_completed",
    page: "/apac/test",
    metadata: { scores, b5Scores, poort: poortDecision },
  });

  // 6. Notificatie naar alle admins (CRM notificatiebel)
  const { data: admins } = await supabase
    .from("portal_users")
    .select("auth_user_id")
    .eq("role", "admin");

  if (admins && admins.length > 0) {
    const vetoNotifSuffix = vetoGetriggerd ? ` ⚠ Veto: ${vetoDetails.length} getriggerd!` : "";
    const commentNotifSuffix = opmerkingen ? ` Opmerking: "${opmerkingen.slice(0, 100)}${opmerkingen.length > 100 ? "…" : ""}"` : "";
    const notificaties = admins.map((admin) => ({
      user_id: admin.auth_user_id,
      titel: vetoGetriggerd ? "Nieuwe APAC-test via portal ⚠ Veto" : "Nieuwe APAC-test via portal",
      bericht: `Een kandidaat heeft de APAC-test voltooid via het portal. Scores: A=${scores.adaptability}/${maxScores.adaptability} P=${scores.personality}/${maxScores.personality} Aw=${scores.awareness}/${maxScores.awareness} C=${scores.connection}/${maxScores.connection} (${percentage}%).${vetoNotifSuffix}${commentNotifSuffix}`,
      type: vetoGetriggerd ? "warning" : "info",
      link: `/kandidaten/${kandidaatId}`,
    }));

    await supabase.from("notificaties").insert(notificaties);
  }

  // 7. E-mail notificaties naar admins met apac_voltooid voorkeur aan
  const notifiableUsers = await getNotifiableUsers("apac_voltooid");
  if (notifiableUsers.length > 0) {
    const notifEmails = notifiableUsers.map((u) => u.email);
    const { data: kandidaat } = await supabase
      .from("kandidaten")
      .select("voornaam, email")
      .eq("id", kandidaatId)
      .single();

    const naam = kandidaat?.voornaam ?? "Kandidaat";
    const email = kandidaat?.email ?? "";

    const vetoEmailHtml = buildVetoEmailHtml(vetoDetails);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";
    const poortBadge = buildDePoortBadge(newPoolStatus, poortDecision.leerfase);
    const statusBadge = BADGE(newPoolStatus.toUpperCase(), STATUS_KLEUR[newPoolStatus] || "#888");

    await sendEmail({
      to: notifEmails,
      subject: vetoGetriggerd
        ? `Nieuwe aanmelding — ${naam} ⚠ Veto getriggerd`
        : `Nieuwe aanmelding — ${naam}`,
      html: emailWrap(
        vetoGetriggerd ? `Nieuwe aanmelding — ${naam} ⚠ Veto` : `Nieuwe aanmelding — ${naam}`,
        datumNL(),
        `<p style="color:#555;margin-bottom:16px">
            <strong>${naam}</strong> (${email}) heeft de APAC-test voltooid via Radical Network.
          </p>
          ${vetoEmailHtml}
          <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
            <tr><td style="padding:10px 12px;border-bottom:1px solid #eee"><strong>De Poort</strong></td><td style="padding:10px 12px;border-bottom:1px solid #eee">${poortBadge}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:10px 12px;border-bottom:1px solid #eee"><strong>Pool status</strong></td><td style="padding:10px 12px;border-bottom:1px solid #eee">${statusBadge}</td></tr>
          </table>
          ${buildApacScoreTable(scores, maxScores)}
          ${opmerkingen ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:16px 0">
            <p style="color:#0369a1;font-weight:bold;margin:0 0 4px 0;font-size:13px">Opmerkingen van kandidaat</p>
            <p style="color:#0c4a6e;margin:0;font-size:14px;white-space:pre-wrap">${opmerkingen.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>` : ""}
          ${buildCtaButton(`${siteUrl}/kandidaten/${kandidaatId}`, "Bekijk kandidaat")}`
      ),
    });
  }

  // 8. E-mail met resultaten-preview naar de kandidaat
  {
    const { data: kand } = await supabase
      .from("kandidaten")
      .select("voornaam, email")
      .eq("id", kandidaatId)
      .single();

    if (kand?.email) {
      const sent = await sendApacResultsEmail({
        to: kand.email,
        firstName: kand.voornaam || "daar",
        scores: { adaptability: scores.adaptability, personality: scores.personality, awareness: scores.awareness, connection: scores.connection },
        maxScores: { adaptability: maxScores.adaptability, personality: maxScores.personality, awareness: maxScores.awareness, connection: maxScores.connection },
        sessionId,
      });
      if (!sent) console.error("[submitApacTest] Resultaten-email mislukt naar:", kand.email);
    }
  }

  // 9. Embedding wordt getriggerd via de CRM's bestaande embed pipeline.
  //    De CRM luistert op Supabase Realtime voor INSERT op apac_resultaten
  //    en UPDATE op kandidaten. Als dat niet automatisch gebeurt, moet
  //    embed_kandidaat() handmatig worden aangeroepen vanuit het CRM.

  return { success: true, sessionId };
}

// ---------------------------------------------------------------------------
// 4. Get session results (for results page)
// ---------------------------------------------------------------------------

export interface SessionResults {
  scores: ApacScores;
  maxScores: ApacMaxScores;
  totaal: number;
  totaalMax: number;
  percentage: number;
  completedAt: string;
}

export async function getSessionResults(
  sessionId: string
): Promise<SessionResults | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("portal_sessions")
    .select("scores, apac_completed, created_at")
    .eq("id", sessionId)
    .eq("apac_completed", true)
    .single();

  if (error || !data || !data.scores) {
    return null;
  }

  const rawScores = data.scores as Record<string, unknown>;
  const scores: ApacScores = {
    adaptability: (rawScores.adaptability as number) ?? 0,
    personality: (rawScores.personality as number) ?? 0,
    awareness: (rawScores.awareness as number) ?? 0,
    connection: (rawScores.connection as number) ?? 0,
  };

  // maxScores kan in de session JSONB zitten (nieuw) of moet uit apac_questions berekend worden
  let resolvedMaxScores: ApacMaxScores;
  const storedMax = rawScores.maxScores as ApacMaxScores | undefined;

  if (storedMax?.adaptability) {
    resolvedMaxScores = storedMax;
  } else {
    // Fallback: bereken uit actieve vragen
    const { data: questions } = await supabase
      .from("apac_questions")
      .select("variable, options, weight")
      .eq("is_active", true);

    resolvedMaxScores = calculateMaxScores(
      (questions ?? []).map((q) => ({
        variable: q.variable,
        options: (q.options as { value: number }[]) ?? [],
        weight: q.weight ?? 1,
      }))
    );
  }

  const totaal = scores.adaptability + scores.personality + scores.awareness + scores.connection;
  const totaalMax = resolvedMaxScores.adaptability + resolvedMaxScores.personality + resolvedMaxScores.awareness + resolvedMaxScores.connection;

  return {
    scores,
    maxScores: resolvedMaxScores,
    totaal,
    totaalMax,
    percentage: totaalMax > 0 ? Math.round((totaal / totaalMax) * 100) : 0,
    completedAt: data.created_at,
  };
}
