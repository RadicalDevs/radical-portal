"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { validateApacScores, computeDePoortDecision } from "@/lib/apac/processApacScores";
import type { ApacScores, ApacDimension, ApacFormConfig } from "@/lib/apac/types";
import { APAC_DIMENSIONS } from "@/lib/apac/types";
import { sendEmail } from "@/lib/email";

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
  turnstileToken: z.string().min(1, "Captcha verificatie is verplicht"),
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
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { sessionId, sessionToken, answers } = parsed.data;
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

  // Fetch questions to calculate weighted scores
  const { data: questions, error: qError } = await supabase
    .from("apac_questions")
    .select("id, variable, weight")
    .eq("is_active", true);

  if (qError || !questions || questions.length === 0) {
    return { success: false, error: "Kan vragen niet ophalen." };
  }

  // Calculate weighted average per dimension (APAC + B5)
  const allDimensions = [
    ...APAC_DIMENSIONS,
    "b5_openness", "b5_conscientiousness", "b5_extraversion", "b5_agreeableness", "b5_stability",
  ];
  const dimensionTotals: Record<string, { weightedSum: number; totalWeight: number }> = {};
  for (const dim of allDimensions) {
    dimensionTotals[dim] = { weightedSum: 0, totalWeight: 0 };
  }

  for (const q of questions) {
    const answerValue = answers[q.id];
    if (answerValue === undefined) {
      return { success: false, error: `Vraag ${q.id} is niet beantwoord.` };
    }
    const dim = q.variable as string;
    if (dimensionTotals[dim]) {
      dimensionTotals[dim].weightedSum += answerValue * (q.weight ?? 1);
      dimensionTotals[dim].totalWeight += q.weight ?? 1;
    }
  }

  // Compute APAC scores (1–10 scale)
  const scores: ApacScores = {
    adaptability: 0,
    personality: 0,
    awareness: 0,
    connection: 0,
  };

  for (const dim of APAC_DIMENSIONS) {
    const t = dimensionTotals[dim];
    scores[dim] =
      t.totalWeight > 0
        ? Math.round((t.weightedSum / t.totalWeight) * 10) / 10
        : 1;
  }

  // Clamp APAC scores to 1-10 range (DB constraint: >= 1 AND <= 10)
  for (const dim of APAC_DIMENSIONS) {
    scores[dim] = Math.max(1, Math.min(10, scores[dim]));
  }

  // Compute B5 scores (stored in session metadata, not in apac_resultaten)
  const b5Scores: Record<string, number> = {};
  for (const dim of allDimensions.filter((d) => d.startsWith("b5_"))) {
    const t = dimensionTotals[dim];
    b5Scores[dim] =
      t.totalWeight > 0
        ? Math.round((t.weightedSum / t.totalWeight) * 10) / 10
        : 0;
  }

  // Validate computed scores
  const validation = validateApacScores(scores);
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

  // 1. INSERT apac_resultaten (matches actual DB schema: individual score columns)
  const { error: insertError } = await supabase.from("apac_resultaten").insert({
    kandidaat_id: kandidaatId,
    adaptability: scores.adaptability,
    personality: scores.personality,
    awareness: scores.awareness,
    connection: scores.connection,
    bron: "portal",
    is_seed: false,
    portal_session_id: sessionId,
  });

  if (insertError) {
    console.error("[submitApacTest] apac_resultaten insert error:", insertError);
  }

  // 2. UPDATE kandidaten.pool_status via De Poort beslissing
  //    Leerfase → "prospect" (Nelieke reviewt handmatig)
  //    Actieve fase → pool_status op basis van drempelscores
  //    Mapping: "pool" → "in_selectie", "pending_review" → "prospect"
  const poolStatusMap: Record<string, string> = {
    pool: "in_selectie",
    pending_review: "prospect",
  };
  const newPoolStatus = poolStatusMap[poortDecision.newPoolStatus] ?? "prospect";

  await supabase
    .from("kandidaten")
    .update({
      pool_status: newPoolStatus,
      apac_source: "portal",
    })
    .eq("id", kandidaatId);

  // 3. UPDATE portal_sessions — store all scores (APAC + B5) as JSONB
  const allScores = { ...scores, ...b5Scores };
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

  // 4. Log in activiteiten (CRM ziet dit in kandidaat-detail)
  await supabase.from("activiteiten").insert({
    type: "notitie",
    beschrijving: `APAC-test voltooid via portal. Scores: A=${scores.adaptability} P=${scores.personality} A=${scores.awareness} C=${scores.connection}. De Poort: ${poortDecision.leerfase ? "leerfase" : "actieve fase"}.`,
    kandidaat_id: kandidaatId,
    metadata: { scores, b5Scores, bron: "portal", poort: poortDecision },
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
    .from("profiles")
    .select("id")
    .in("role", ["superadmin", "admin"]);

  if (admins && admins.length > 0) {
    const notificaties = admins.map((admin) => ({
      user_id: admin.id,
      titel: "Nieuwe APAC-test via portal",
      bericht: `Een kandidaat heeft de APAC-test voltooid via het portal. Scores: A=${scores.adaptability} P=${scores.personality} A=${scores.awareness} C=${scores.connection}.`,
      type: "info",
      link: `/kandidaten/${kandidaatId}`,
    }));

    await supabase.from("notificaties").insert(notificaties);
  }

  // 7. E-mail notificaties naar geconfigureerde adressen
  const { data: formConfig } = await supabase
    .from("apac_form_config")
    .select("notification_emails")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const notifEmails: string[] = formConfig?.notification_emails ?? [];
  if (notifEmails.length > 0) {
    const { data: kandidaat } = await supabase
      .from("kandidaten")
      .select("voornaam, email")
      .eq("id", kandidaatId)
      .single();

    const naam = kandidaat?.voornaam ?? "Kandidaat";
    const email = kandidaat?.email ?? "";
    const gecombineerdScore = Math.round(
      ((scores.adaptability + scores.personality + scores.awareness + scores.connection) / 4) * 10
    ) / 10;

    await sendEmail({
      to: notifEmails,
      subject: `Nieuwe APAC-test voltooid — ${naam}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#1a2e1a;margin-bottom:8px">Nieuwe APAC-test voltooid</h2>
          <p style="color:#555;margin-bottom:24px">
            <strong>${naam}</strong> (${email}) heeft de APAC-test voltooid via het Radical Portal.
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

  // 8. Embedding wordt getriggerd via de CRM's bestaande embed pipeline.
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
  gecombineerd: number;
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

  const scores = data.scores as ApacScores;
  const gecombineerd =
    Math.round(
      ((scores.adaptability + scores.personality + scores.awareness + scores.connection) / 4) * 10
    ) / 10;

  return {
    scores,
    gecombineerd,
    completedAt: data.created_at,
  };
}
