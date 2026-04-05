"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { ApacDimension, ApacFormConfig, ApacMaxScores } from "@/lib/apac/types";
import { calculateMaxScores } from "@/lib/apac/scoring";

// ---------------------------------------------------------------------------
// Shared types (Question Analytics)
// ---------------------------------------------------------------------------

export interface QuestionAnalyticsData {
  questions: QuestionAnalyticsItem[];
  totalRespondents: number;
  totalPortal: number;
  totalTally: number;
  totalManual: number;
}

export interface QuestionAnalyticsRespondent {
  kandidaatId: string;
  naam: string;
  email: string;
}

export interface QuestionAnalyticsItem {
  id: string;
  questionText: string;
  variable: string;
  weight: number;
  sortOrder: number;
  isActive: boolean;
  totalAnswers: number;
  averageScore: number;
  distribution: { label: string; value: number; count: number; percentage: number; respondents: QuestionAnalyticsRespondent[] }[];
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface RecentDeal {
  id: string;
  pipelineType: string;
  stage: string;
  klantNaam: string;
  potentieleOmzet: number | null;
  createdAt: string;
}

export interface AdminKpiData {
  totalKandidaten: number;
  apacThisWeek: number;
  apacThisMonth: number;
  apacTotal: number;
  poortFase: "learning" | "active";
  poortTeller: number;
  poortDrempel: number;
  recenteActiviteit: RecentActivity[];
  // CRM KPIs
  omzetMaand: number;
  omzetTotaal: number;
  pipelineWaarde: number;
  openVacatures: number;
  openstaandeTaken: number;
  recenteDeals: RecentDeal[];
}

export interface RecentActivity {
  id: string;
  type: string;
  beschrijving: string;
  kandidaatNaam: string | null;
  createdAt: string;
}

export interface AdminKandidaat {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string | null;
  telefoon: string | null;
  linkedinUrl: string | null;
  poolStatus: string;
  apacSource: string;
  createdAt: string;
  apacDate: string | null;
  adaptability: number | null;
  personality: number | null;
  awareness: number | null;
  connection: number | null;
  gecombineerd: number | null;
  education: string | null;
  educationLevel: string | null;
  educationName: string | null;
  cvUrl: string | null;
  vaardigheden: string[];
  tags: string[];
  beschikbaarheid: boolean | null;
  notities: string | null;
  vetoGetriggerd: boolean;
  vetoDetails: { question_id: string; question_text: string; answer_value: number; answer_label: string }[];
}

export interface PoortPageData {
  config: {
    fase: "learning" | "active";
    kandidaat_drempel: number;
    drempel_adaptability: number | null;
    drempel_personality: number | null;
    drempel_awareness: number | null;
    drempel_connection: number | null;
    drempel_gecombineerd: number | null;
  } | null;
  teller: number;
  stats: DimensionStats;
  histogramData: HistogramBin[];
}

export interface DimensionStats {
  adaptability: { avg: number; p50: number; p75: number; p90: number };
  personality: { avg: number; p50: number; p75: number; p90: number };
  awareness: { avg: number; p50: number; p75: number; p90: number };
  connection: { avg: number; p50: number; p75: number; p90: number };
  gecombineerd: { avg: number; p50: number; p75: number; p90: number };
}

export interface HistogramBin {
  bucket: string;
  adaptability: number;
  personality: number;
  awareness: number;
  connection: number;
}

export interface AdminApacQuestion {
  id: string;
  question_text: string;
  options: { label: string; value: number; is_veto_fout?: boolean }[];
  variable: string;
  weight: number;
  sort_order: number;
  is_active: boolean;
  is_veto: boolean;
  tally_field_id: string | null;
}

// ---------------------------------------------------------------------------
// 1. Admin home KPIs
// ---------------------------------------------------------------------------

export async function getAdminKpis(): Promise<AdminKpiData> {
  const db = createServiceClient();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: totalKandidaten },
    { count: apacThisWeek },
    { count: apacThisMonth },
    { count: apacTotal },
    { data: poortConfig },
    { count: poortTeller },
    { data: activiteiten },
    { data: facturenMaand },
    { data: facturenTotaal },
    { data: activeDeals },
    { count: openVacatures },
    { count: openstaandeTaken },
    { data: recenteDealsRaw },
  ] = await Promise.all([
    db.from("kandidaten").select("*", { count: "exact", head: true }),
    db
      .from("apac_resultaten")
      .select("*", { count: "exact", head: true })
      .eq("is_seed", false)
      .gte("created_at", weekAgo),
    db
      .from("apac_resultaten")
      .select("*", { count: "exact", head: true })
      .eq("is_seed", false)
      .gte("created_at", monthAgo),
    db
      .from("apac_resultaten")
      .select("*", { count: "exact", head: true })
      .eq("is_seed", false),
    db
      .from("poort_config")
      .select("fase, kandidaat_drempel")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("apac_resultaten")
      .select("*", { count: "exact", head: true })
      .eq("is_seed", false),
    db
      .from("activiteiten")
      .select("id, type, beschrijving, kandidaat_id, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    db
      .from("facturen")
      .select("totaal_bedrag")
      .eq("status", "betaald")
      .gte("betaaldatum", startOfMonth),
    db
      .from("facturen")
      .select("totaal_bedrag")
      .eq("status", "betaald"),
    db
      .from("deals")
      .select("potentiele_omzet")
      .eq("is_lost", false),
    db
      .from("vacatures")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    db
      .from("taken")
      .select("*", { count: "exact", head: true })
      .neq("status", "afgerond"),
    db
      .from("deals")
      .select("id, pipeline_type, stage, potentiele_omzet, klant_id, created_at")
      .eq("is_lost", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // Enrich activity with kandidaat names
  const recenteActiviteit: RecentActivity[] = [];
  if (activiteiten) {
    const kandidaatIds = [
      ...new Set(activiteiten.map((a) => a.kandidaat_id).filter(Boolean)),
    ];
    const { data: kandidaten } = kandidaatIds.length
      ? await db
          .from("kandidaten")
          .select("id, voornaam, achternaam")
          .in("id", kandidaatIds)
      : { data: [] };

    const nameMap = Object.fromEntries(
      (kandidaten ?? []).map((k) => [k.id, `${k.voornaam} ${k.achternaam}`.trim()])
    );

    for (const a of activiteiten) {
      recenteActiviteit.push({
        id: a.id,
        type: a.type,
        beschrijving: a.beschrijving,
        kandidaatNaam: a.kandidaat_id ? (nameMap[a.kandidaat_id] ?? null) : null,
        createdAt: a.created_at,
      });
    }
  }

  // CRM: compute aggregated values
  const omzetMaand = (facturenMaand ?? []).reduce(
    (sum, f) => sum + (f.totaal_bedrag ?? 0),
    0
  );
  const omzetTotaal = (facturenTotaal ?? []).reduce(
    (sum, f) => sum + (f.totaal_bedrag ?? 0),
    0
  );
  const pipelineWaarde = (activeDeals ?? []).reduce(
    (sum, d) => sum + (d.potentiele_omzet ?? 0),
    0
  );

  // Enrich recent deals with klant names
  const recenteDeals: RecentDeal[] = [];
  if (recenteDealsRaw && recenteDealsRaw.length > 0) {
    const klantIds = [...new Set(recenteDealsRaw.map((d) => d.klant_id).filter(Boolean))];
    const { data: klanten } = klantIds.length
      ? await db.from("klanten").select("id, bedrijfsnaam").in("id", klantIds)
      : { data: [] };
    const klantMap = Object.fromEntries(
      (klanten ?? []).map((k) => [k.id, k.bedrijfsnaam])
    );
    for (const d of recenteDealsRaw) {
      recenteDeals.push({
        id: d.id,
        pipelineType: d.pipeline_type,
        stage: d.stage,
        klantNaam: klantMap[d.klant_id] ?? "—",
        potentieleOmzet: d.potentiele_omzet ?? null,
        createdAt: d.created_at,
      });
    }
  }

  return {
    totalKandidaten: totalKandidaten ?? 0,
    apacThisWeek: apacThisWeek ?? 0,
    apacThisMonth: apacThisMonth ?? 0,
    apacTotal: apacTotal ?? 0,
    poortFase: poortConfig?.fase ?? "learning",
    poortTeller: poortTeller ?? 0,
    poortDrempel: poortConfig?.kandidaat_drempel ?? 150,
    recenteActiviteit,
    omzetMaand,
    omzetTotaal,
    pipelineWaarde,
    openVacatures: openVacatures ?? 0,
    openstaandeTaken: openstaandeTaken ?? 0,
    recenteDeals,
  };
}

// ---------------------------------------------------------------------------
// 2. Kandidaten list
// ---------------------------------------------------------------------------

export async function getAdminKandidaten(): Promise<AdminKandidaat[]> {
  const db = createServiceClient();

  const [{ data: kandidaten, error }, { data: apacRows }] = await Promise.all([
    db
      .from("kandidaten")
      .select("id, voornaam, achternaam, email, telefoon, linkedin_url, pool_status, apac_source, created_at, education, education_level, education_name, cv_url")
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("apac_resultaten")
      .select("kandidaat_id, adaptability, personality, awareness, connection, created_at, veto_getriggerd, veto_details")
      .eq("is_seed", false)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  if (error) {
    console.error("[getAdminKandidaten]", error);
    return [];
  }

  // Map the most recent APAC result per kandidaat
  type ApacRow = NonNullable<typeof apacRows>[number];
  const apacMap = new Map<string, ApacRow>();
  for (const r of apacRows ?? []) {
    if (!apacMap.has(r.kandidaat_id)) {
      apacMap.set(r.kandidaat_id, r);
    }
  }

  return (kandidaten ?? []).map((k) => {
    const apac = apacMap.get(k.id) ?? null;
    const a = apac !== null ? Number(apac.adaptability) : null;
    const p = apac !== null ? Number(apac.personality) : null;
    const aw = apac !== null ? Number(apac.awareness) : null;
    const c = apac !== null ? Number(apac.connection) : null;
    const gecombineerd =
      a !== null && p !== null && aw !== null && c !== null
        ? Math.round((a + p + aw + c) * 10) / 10
        : null;

    return {
      id: k.id,
      voornaam: k.voornaam,
      achternaam: k.achternaam,
      email: k.email,
      telefoon: k.telefoon ?? null,
      linkedinUrl: k.linkedin_url ?? null,
      poolStatus: k.pool_status,
      apacSource: k.apac_source,
      createdAt: k.created_at,
      apacDate: apac?.created_at ?? null,
      adaptability: a,
      personality: p,
      awareness: aw,
      connection: c,
      gecombineerd,
      education: k.education ?? null,
      educationLevel: k.education_level ?? null,
      educationName: k.education_name ?? null,
      cvUrl: k.cv_url ?? null,
      vaardigheden: [],
      tags: [],
      beschikbaarheid: null,
      notities: null,
      vetoGetriggerd: (apac as Record<string, unknown>)?.veto_getriggerd === true,
      vetoDetails: ((apac as Record<string, unknown>)?.veto_details ?? []) as AdminKandidaat["vetoDetails"],
    };
  });
}

/** Get max scores per APAC dimension from active questions */
export async function getApacMaxScores(): Promise<ApacMaxScores> {
  const db = createServiceClient();
  const { data: questions } = await db
    .from("apac_questions")
    .select("variable, options, weight")
    .eq("is_active", true);

  return calculateMaxScores(
    (questions ?? []).map((q) => ({
      variable: q.variable,
      options: (q.options as { value: number }[]) ?? [],
      weight: q.weight ?? 1,
    }))
  );
}

// Fetch full details for detail modal (lazy load)
export async function getAdminKandidaatDetails(id: string): Promise<Partial<AdminKandidaat> | null> {
  const db = createServiceClient();

  const { data: k, error } = await db
    .from("kandidaten")
    .select("vaardigheden, tags, beschikbaarheid, notities")
    .eq("id", id)
    .single();

  if (error || !k) return null;

  return {
    vaardigheden: k.vaardigheden ?? [],
    tags: k.tags ?? [],
    beschikbaarheid: k.beschikbaarheid ?? null,
    notities: k.notities ?? null,
  };
}

// ---------------------------------------------------------------------------
// 3. Import: single kandidaat
// ---------------------------------------------------------------------------

const ImportKandidaatSchema = z.object({
  voornaam: z.string().min(1, "Voornaam is verplicht").max(100),
  achternaam: z.string().max(100).default(""),
  email: z.string().email("Ongeldig e-mailadres"),
  adaptability: z.coerce.number().min(0).max(50),
  personality: z.coerce.number().min(0).max(50),
  awareness: z.coerce.number().min(0).max(50),
  connection: z.coerce.number().min(0).max(50),
  datum: z.string().optional(),
});

export type ImportResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function importKandidaat(
  formData: FormData
): Promise<ImportResult> {
  const parsed = ImportKandidaatSchema.safeParse({
    voornaam: formData.get("voornaam"),
    achternaam: formData.get("achternaam") || "",
    email: formData.get("email"),
    adaptability: formData.get("adaptability"),
    personality: formData.get("personality"),
    awareness: formData.get("awareness"),
    connection: formData.get("connection"),
    datum: formData.get("datum") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const db = createServiceClient();
  const { voornaam, achternaam, email, adaptability, personality, awareness, connection, datum } =
    parsed.data;

  // Check for duplicate
  const { data: existing } = await db
    .from("kandidaten")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return { success: false, error: `Kandidaat met e-mail ${email} bestaat al.` };
  }

  const gecombineerd = (adaptability + personality + awareness + connection) / 4;
  const poolStatus =
    gecombineerd >= 7.5 ? "radical" : gecombineerd >= 6 ? "in_selectie" : "prospect";

  const { data: kandidaat, error: kErr } = await db
    .from("kandidaten")
    .insert({
      voornaam,
      achternaam,
      email,
      pool_status: poolStatus,
      apac_source: "manual",
    })
    .select("id")
    .single();

  if (kErr || !kandidaat) {
    console.error("[importKandidaat]", kErr);
    return { success: false, error: "Kon kandidaat niet opslaan." };
  }

  const submittedAt = datum ? new Date(datum).toISOString() : new Date().toISOString();

  const { error: aErr } = await db.from("apac_resultaten").upsert(
    {
      kandidaat_id: kandidaat.id,
      adaptability,
      personality,
      awareness,
      connection,
      bron: "manual",
      is_seed: false,
      created_at: submittedAt,
      updated_at: submittedAt,
    },
    { onConflict: "kandidaat_id" }
  );

  if (aErr) {
    console.error("[importKandidaat] apac_resultaten error:", aErr);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/candidates");
  return { success: true, message: `${voornaam} ${achternaam} succesvol geïmporteerd.` };
}

// ---------------------------------------------------------------------------
// 4. Import: bulk CSV
// ---------------------------------------------------------------------------

export interface BulkImportRow {
  voornaam: string;
  achternaam: string;
  email: string;
  adaptability: number;
  personality: number;
  awareness: number;
  connection: number;
  datum?: string;
}

export interface BulkImportResult {
  success: number;
  errors: { row: number; email: string; message: string }[];
}

const BulkRowSchema = ImportKandidaatSchema;

export async function importKandidatenBulk(
  rows: BulkImportRow[]
): Promise<BulkImportResult> {
  const db = createServiceClient();
  const results: BulkImportResult = { success: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const parsed = BulkRowSchema.safeParse(row);

    if (!parsed.success) {
      results.errors.push({
        row: i + 1,
        email: row.email ?? "",
        message: parsed.error.issues[0].message,
      });
      continue;
    }

    const { voornaam, achternaam, email, adaptability, personality, awareness, connection, datum } =
      parsed.data;

    const { data: existing } = await db
      .from("kandidaten")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      results.errors.push({ row: i + 1, email, message: "Bestaat al" });
      continue;
    }

    const gecombineerd = (adaptability + personality + awareness + connection) / 4;
    const poolStatus =
      gecombineerd >= 7.5 ? "radical" : gecombineerd >= 6 ? "in_selectie" : "prospect";

    const { data: kandidaat, error: kErr } = await db
      .from("kandidaten")
      .insert({ voornaam, achternaam, email, pool_status: poolStatus, apac_source: "manual" })
      .select("id")
      .single();

    if (kErr || !kandidaat) {
      results.errors.push({ row: i + 1, email, message: "DB fout bij opslaan" });
      continue;
    }

    const submittedAt = datum ? new Date(datum).toISOString() : new Date().toISOString();
    await db.from("apac_resultaten").upsert(
      {
        kandidaat_id: kandidaat.id,
        adaptability,
        personality,
        awareness,
        connection,
        bron: "manual",
        is_seed: false,
        created_at: submittedAt,
        updated_at: submittedAt,
      },
      { onConflict: "kandidaat_id" }
    );

    results.success++;
  }

  if (results.success > 0) {
    revalidatePath("/admin");
    revalidatePath("/admin/candidates");
  }

  return results;
}

// ---------------------------------------------------------------------------
// 5. De Poort page data
// ---------------------------------------------------------------------------

export async function getPoortPageData(): Promise<PoortPageData> {
  const db = createServiceClient();

  const [{ data: config }, { count: teller }, { data: scores }] = await Promise.all([
    db
      .from("poort_config")
      .select(
        "fase, kandidaat_drempel, drempel_adaptability, drempel_personality, drempel_awareness, drempel_connection, drempel_gecombineerd"
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    db
      .from("apac_resultaten")
      .select("*", { count: "exact", head: true })
      .eq("is_seed", false),
    db
      .from("apac_resultaten")
      .select("adaptability, personality, awareness, connection")
      .eq("is_seed", false),
  ]);

  const rows = (scores ?? []).map((r) => ({
    adaptability: Number(r.adaptability),
    personality: Number(r.personality),
    awareness: Number(r.awareness),
    connection: Number(r.connection),
    gecombineerd:
      (Number(r.adaptability) + Number(r.personality) + Number(r.awareness) + Number(r.connection)) / 4,
  }));

  const computeStats = (values: number[]) => {
    if (values.length === 0) return { avg: 0, p50: 0, p75: 0, p90: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    const avg = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
    const pct = (p: number) => {
      const idx = Math.floor(p * (sorted.length - 1));
      return Math.round(sorted[idx] * 10) / 10;
    };
    return { avg, p50: pct(0.5), p75: pct(0.75), p90: pct(0.9) };
  };

  const stats: DimensionStats = {
    adaptability: computeStats(rows.map((r) => r.adaptability)),
    personality: computeStats(rows.map((r) => r.personality)),
    awareness: computeStats(rows.map((r) => r.awareness)),
    connection: computeStats(rows.map((r) => r.connection)),
    gecombineerd: computeStats(rows.map((r) => r.gecombineerd)),
  };

  // Build histogram: buckets 0-1, 1-2, ..., 9-10
  const buckets = Array.from({ length: 10 }, (_, i) => i);
  const histogramData: HistogramBin[] = buckets.map((b) => {
    const inBucket = (vals: number[]) =>
      vals.filter((v) => v >= b && v < b + 1).length;
    return {
      bucket: `${b}-${b + 1}`,
      adaptability: inBucket(rows.map((r) => r.adaptability)),
      personality: inBucket(rows.map((r) => r.personality)),
      awareness: inBucket(rows.map((r) => r.awareness)),
      connection: inBucket(rows.map((r) => r.connection)),
    };
  });

  return {
    config: config ?? null,
    teller: teller ?? 0,
    stats,
    histogramData,
  };
}

// ---------------------------------------------------------------------------
// 6. Update De Poort config
// ---------------------------------------------------------------------------

const PoortConfigSchema = z.object({
  drempel_adaptability: z.coerce.number().min(0).max(50).nullable(),
  drempel_personality: z.coerce.number().min(0).max(50).nullable(),
  drempel_awareness: z.coerce.number().min(0).max(50).nullable(),
  drempel_connection: z.coerce.number().min(0).max(50).nullable(),
  drempel_gecombineerd: z.coerce.number().min(0).max(200).nullable(),
});

export type UpdatePoortResult =
  | { success: true }
  | { success: false; error: string };

export async function updatePoortConfig(
  formData: FormData
): Promise<UpdatePoortResult> {
  const toNullable = (val: FormDataEntryValue | null) => {
    if (!val || val === "") return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  const parsed = PoortConfigSchema.safeParse({
    drempel_adaptability: toNullable(formData.get("drempel_adaptability")),
    drempel_personality: toNullable(formData.get("drempel_personality")),
    drempel_awareness: toNullable(formData.get("drempel_awareness")),
    drempel_connection: toNullable(formData.get("drempel_connection")),
    drempel_gecombineerd: toNullable(formData.get("drempel_gecombineerd")),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const db = createServiceClient();
  const { data: existing } = await db
    .from("poort_config")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    await db.from("poort_config").update(parsed.data).eq("id", existing.id);
  } else {
    await db.from("poort_config").insert({ ...parsed.data, fase: "learning", kandidaat_drempel: 150 });
  }

  revalidatePath("/admin/poort");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 7. APAC questions
// ---------------------------------------------------------------------------

export async function getAdminApacQuestions(): Promise<AdminApacQuestion[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("apac_questions")
    .select("id, question_text, options, variable, weight, sort_order, is_active, is_veto, tally_field_id")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[getAdminApacQuestions]", error);
    return [];
  }
  return (data ?? []) as AdminApacQuestion[];
}

const QuestionSchema = z.object({
  question_text: z.string().min(1, "Vraag mag niet leeg zijn").max(500),
  variable: z.string().min(1),
  weight: z.coerce.number().min(0.1).max(5).default(1),
  is_active: z.boolean().default(true),
  is_veto: z.boolean().default(false),
  tally_field_id: z.string().max(200).nullable().optional(),
  options: z.string().transform((val, ctx) => {
    try {
      return JSON.parse(val) as { label: string; value: number; is_veto_fout?: boolean }[];
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ongeldige opties JSON" });
      return z.NEVER;
    }
  }),
});

export type QuestionMutationResult =
  | { success: true }
  | { success: false; error: string };

export async function updateApacQuestion(
  id: string,
  formData: FormData
): Promise<QuestionMutationResult> {
  const tallyRaw = formData.get("tally_field_id");
  const parsed = QuestionSchema.safeParse({
    question_text: formData.get("question_text"),
    variable: formData.get("variable"),
    weight: formData.get("weight"),
    is_active: formData.get("is_active") === "true",
    is_veto: formData.get("is_veto") === "true",
    tally_field_id: tallyRaw && String(tallyRaw).trim() ? String(tallyRaw).trim() : null,
    options: formData.get("options"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const db = createServiceClient();
  const { error } = await db
    .from("apac_questions")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    console.error("[updateApacQuestion]", error);
    return { success: false, error: "Kon vraag niet opslaan." };
  }

  revalidatePath("/admin/apac-form");
  return { success: true };
}

export async function addApacQuestion(
  formData: FormData
): Promise<QuestionMutationResult> {
  const tallyRaw = formData.get("tally_field_id");
  const parsed = QuestionSchema.safeParse({
    question_text: formData.get("question_text"),
    variable: formData.get("variable"),
    weight: formData.get("weight"),
    is_active: true,
    is_veto: formData.get("is_veto") === "true",
    tally_field_id: tallyRaw && String(tallyRaw).trim() ? String(tallyRaw).trim() : null,
    options: formData.get("options"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const db = createServiceClient();

  // Get max sort_order
  const { data: maxRow } = await db
    .from("apac_questions")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { error } = await db.from("apac_questions").insert({
    ...parsed.data,
    sort_order: sortOrder,
  });

  if (error) {
    console.error("[addApacQuestion]", error);
    return { success: false, error: "Kon vraag niet toevoegen." };
  }

  revalidatePath("/admin/apac-form");
  return { success: true };
}

export async function deleteApacQuestion(
  id: string
): Promise<QuestionMutationResult> {
  const db = createServiceClient();
  const { error } = await db.from("apac_questions").delete().eq("id", id);

  if (error) {
    console.error("[deleteApacQuestion]", error);
    return { success: false, error: "Kon vraag niet verwijderen." };
  }

  revalidatePath("/admin/apac-form");
  return { success: true };
}

export async function deleteKandidaat(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const db = createServiceClient();

  // Verwijder child-records eerst (FK constraints)
  await db.from("apac_antwoorden").delete().eq("kandidaat_id", id);
  await db.from("apac_resultaten").delete().eq("kandidaat_id", id);
  await db.from("activiteiten").delete().eq("kandidaat_id", id);
  await db
    .from("portal_sessions")
    .update({ linked_kandidaat_id: null })
    .eq("linked_kandidaat_id", id);

  const { error } = await db.from("kandidaten").delete().eq("id", id);

  if (error) {
    console.error("[deleteKandidaat]", error);
    return { success: false, error: "Kon kandidaat niet verwijderen." };
  }

  revalidatePath("/admin/candidates");
  return { success: true };
}

export async function reorderApacQuestions(
  items: { id: string; sort_order: number }[]
): Promise<QuestionMutationResult> {
  const db = createServiceClient();

  await Promise.all(
    items.map(({ id, sort_order }) =>
      db.from("apac_questions").update({ sort_order }).eq("id", id)
    )
  );

  revalidatePath("/admin/apac-form");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 8. Toggle poort fase
// ---------------------------------------------------------------------------

export async function togglePoortFase(): Promise<UpdatePoortResult> {
  const db = createServiceClient();

  const { data: existing } = await db
    .from("poort_config")
    .select("id, fase")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!existing) {
    return { success: false, error: "Geen poort configuratie gevonden." };
  }

  const newFase = existing.fase === "learning" ? "active" : "learning";
  await db.from("poort_config").update({ fase: newFase }).eq("id", existing.id);

  revalidatePath("/admin/poort");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 9. Form config (intro, thank you, notifications, settings)
// ---------------------------------------------------------------------------

export async function getFormConfig(): Promise<ApacFormConfig | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("apac_form_config")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as ApacFormConfig;
}

const FormConfigSchema = z.object({
  intro_title: z.string().min(1).max(200),
  intro_subtitle: z.string().max(300).default(""),
  intro_tagline: z.string().max(300).default(""),
  intro_body: z.string().max(2000).default(""),
  rules_title: z.string().max(200).default(""),
  rules_items: z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) throw new Error();
      return parsed as { label: string; text: string; color: string }[];
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ongeldige regels JSON" });
      return z.NEVER;
    }
  }),
  rules_footer: z.string().max(500).default(""),
  thankyou_title: z.string().max(200).default(""),
  thankyou_body: z.string().max(1000).default(""),
  require_lastname: z.boolean().default(false),
  notification_emails: z.string().transform((val) =>
    val
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@"))
  ),
});

export type FormConfigResult =
  | { success: true }
  | { success: false; error: string };

export async function updateFormConfig(
  formData: FormData
): Promise<FormConfigResult> {
  const parsed = FormConfigSchema.safeParse({
    intro_title: formData.get("intro_title"),
    intro_subtitle: formData.get("intro_subtitle"),
    intro_tagline: formData.get("intro_tagline"),
    intro_body: formData.get("intro_body"),
    rules_title: formData.get("rules_title"),
    rules_items: formData.get("rules_items"),
    rules_footer: formData.get("rules_footer"),
    thankyou_title: formData.get("thankyou_title"),
    thankyou_body: formData.get("thankyou_body"),
    require_lastname: formData.get("require_lastname") === "true",
    notification_emails: formData.get("notification_emails") ?? "",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const db = createServiceClient();
  const { data: existing } = await db
    .from("apac_form_config")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  const payload = {
    ...parsed.data,
    notification_emails: parsed.data.notification_emails,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await db.from("apac_form_config").update(payload).eq("id", existing.id);
  } else {
    await db.from("apac_form_config").insert(payload);
  }

  revalidatePath("/admin/apac-form");
  revalidatePath("/apac/test");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 10. Question Analytics — antwoorden per vraag
// ---------------------------------------------------------------------------

export async function getQuestionAnalytics(
  period?: "week" | "month" | "all"
): Promise<QuestionAnalyticsData> {
  const db = createServiceClient();

  // Bepaal tijdsfilter
  let sinceDate: string | null = null;
  if (period === "week") {
    sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (period === "month") {
    sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Haal alle vragen op (actief + inactief voor historische data)
  const { data: questions, error: qErr } = await db
    .from("apac_questions")
    .select("id, question_text, options, variable, weight, sort_order, is_active")
    .order("sort_order", { ascending: true });

  if (qErr || !questions) {
    console.error("[getQuestionAnalytics] questions error:", qErr);
    return { questions: [], totalRespondents: 0, totalPortal: 0, totalTally: 0, totalManual: 0 };
  }

  // Haal alle antwoorden op inclusief kandidaat_id (met optioneel tijdsfilter)
  let antwoordQuery = db
    .from("apac_antwoorden")
    .select("question_id, answer_value, session_id, kandidaat_id");

  if (sinceDate) {
    antwoordQuery = antwoordQuery.gte("created_at", sinceDate);
  }

  const { data: antwoorden, error: aErr } = await antwoordQuery;

  if (aErr) {
    console.error("[getQuestionAnalytics] antwoorden error:", aErr);
    return { questions: [], totalRespondents: 0, totalPortal: 0, totalTally: 0, totalManual: 0 };
  }

  // Haal kandidaat-namen op voor alle betrokken kandidaten
  const kandidaatIds = [...new Set((antwoorden ?? []).map((a) => a.kandidaat_id).filter(Boolean))];
  const kandidaatMap = new Map<string, { naam: string; email: string }>();
  if (kandidaatIds.length > 0) {
    const { data: kandidaten } = await db
      .from("kandidaten")
      .select("id, voornaam, achternaam, email")
      .in("id", kandidaatIds);
    for (const k of kandidaten ?? []) {
      kandidaatMap.set(k.id, {
        naam: [k.voornaam, k.achternaam].filter(Boolean).join(" ").trim() || k.email,
        email: k.email,
      });
    }
  }

  // Tel unieke sessies in apac_antwoorden (portal + tally via webhook)
  const uniqueSessions = new Set((antwoorden ?? []).map((a) => a.session_id));

  // Tel ALLE respondenten per bron uit apac_resultaten
  let bronQuery = db
    .from("apac_resultaten")
    .select("bron")
    .eq("is_seed", false);
  if (sinceDate) {
    bronQuery = bronQuery.gte("created_at", sinceDate);
  }
  const { data: bronData } = await bronQuery;
  const totalPortal = (bronData ?? []).filter((r) => r.bron === "portal").length;
  const totalTally = (bronData ?? []).filter((r) => r.bron === "tally").length;
  const totalManual = (bronData ?? []).filter((r) => r.bron === "manual" || r.bron === "typeform").length;
  const totalRespondents = (bronData ?? []).length;

  // Groepeer antwoorden per vraag: value → [{kandidaatId, naam, email}]
  type AnswerEntry = { value: number; kandidaatId: string };
  const answersByQuestion = new Map<string, AnswerEntry[]>();
  for (const a of antwoorden ?? []) {
    const arr = answersByQuestion.get(a.question_id) ?? [];
    arr.push({ value: Number(a.answer_value), kandidaatId: a.kandidaat_id });
    answersByQuestion.set(a.question_id, arr);
  }

  // Bouw analytics per vraag
  const analyticsItems: QuestionAnalyticsItem[] = questions.map((q) => {
    const answers = answersByQuestion.get(q.id) ?? [];
    const totalAnswers = answers.length;
    const averageScore =
      totalAnswers > 0
        ? Math.round((answers.reduce((s, v) => s + v.value, 0) / totalAnswers) * 10) / 10
        : 0;

    // Verdeling per antwoordoptie met respondenten
    const options = (q.options as { label: string; value: number }[]) ?? [];
    const distribution = options.map((opt) => {
      const matching = answers.filter((v) => v.value === opt.value);
      const respondents: QuestionAnalyticsRespondent[] = matching.map((v) => {
        const k = kandidaatMap.get(v.kandidaatId);
        return {
          kandidaatId: v.kandidaatId,
          naam: k?.naam ?? "Onbekend",
          email: k?.email ?? "",
        };
      });
      return {
        label: opt.label,
        value: opt.value,
        count: matching.length,
        percentage: totalAnswers > 0 ? Math.round((matching.length / totalAnswers) * 1000) / 10 : 0,
        respondents,
      };
    });

    return {
      id: q.id,
      questionText: q.question_text,
      variable: q.variable,
      weight: q.weight,
      sortOrder: q.sort_order,
      isActive: q.is_active,
      totalAnswers,
      averageScore,
      distribution,
    };
  });

  return { questions: analyticsItems, totalRespondents, totalPortal, totalTally, totalManual };
}

// ---------------------------------------------------------------------------
// 11. Analytics dashboard
// ---------------------------------------------------------------------------

export interface AnalyticsKpis {
  totaalGetest: number;
  gemiddeldeGecombineerd: number;
  doorstroomPercentage: number;
  gemiddeldePerDimensie: {
    adaptability: number;
    personality: number;
    awareness: number;
    connection: number;
  };
}

export interface OpleidingsniveauRow {
  level: string;
  count: number;
  adaptability: number;
  personality: number;
  awareness: number;
  connection: number;
  gecombineerd: number;
}

export interface WeeklyInstroomRow {
  weekLabel: string;
  count: number;
}

export interface PoolStatusRow {
  status: string;
  count: number;
  percentage: number;
}

export interface AnalyticsData {
  kpis: AnalyticsKpis;
  opleidingsniveaus: OpleidingsniveauRow[];
  populatieRadar: {
    adaptability: number;
    personality: number;
    awareness: number;
    connection: number;
  };
  weeklyInstroom: WeeklyInstroomRow[];
  poolStatusVerdeling: PoolStatusRow[];
  maxScores: ApacMaxScores;
  hasData: boolean;
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const db = createServiceClient();
  const r1 = (v: number) => Math.round(v * 10) / 10;

  const empty: AnalyticsData = {
    kpis: {
      totaalGetest: 0,
      gemiddeldeGecombineerd: 0,
      doorstroomPercentage: 0,
      gemiddeldePerDimensie: { adaptability: 0, personality: 0, awareness: 0, connection: 0 },
    },
    opleidingsniveaus: [],
    populatieRadar: { adaptability: 0, personality: 0, awareness: 0, connection: 0 },
    weeklyInstroom: [],
    poolStatusVerdeling: [],
    maxScores: { adaptability: 0, personality: 0, awareness: 0, connection: 0 },
    hasData: false,
  };

  const [{ data: apacRows, error: apacErr }, { data: kandidatenRows, error: kErr }, { data: questionRows }] =
    await Promise.all([
      db
        .from("apac_resultaten")
        .select("kandidaat_id, adaptability, personality, awareness, connection, created_at")
        .eq("is_seed", false),
      db.from("kandidaten").select("id, pool_status, education_level"),
      db.from("apac_questions").select("variable, options, weight").eq("is_active", true),
    ]);

  if (apacErr) console.error("[getAnalyticsData] apac error:", apacErr);
  if (kErr) console.error("[getAnalyticsData] kandidaten error:", kErr);

  const apac = apacRows ?? [];
  const kandidaten = kandidatenRows ?? [];
  const maxScores = calculateMaxScores(
    (questionRows ?? []).map((q) => ({
      variable: q.variable as string,
      options: (q.options as { value: number }[]) ?? [],
      weight: (q.weight as number) ?? 1,
    }))
  );

  if (apac.length === 0) return { ...empty, maxScores };

  // Lookup map: kandidaat_id → kandidaat row
  const kMap = new Map(kandidaten.map((k) => [k.id, k]));

  // Per-row gecombineerd
  const rows = apac.map((r) => {
    const a = Number(r.adaptability);
    const p = Number(r.personality);
    const aw = Number(r.awareness);
    const c = Number(r.connection);
    return { ...r, a, p, aw, c, gecombineerd: a + p + aw + c };
  });

  // --- KPIs ---
  const totaalGetest = rows.length;
  const sumGecomb = rows.reduce((s, r) => s + r.gecombineerd, 0);
  const gemiddeldeGecombineerd = r1(sumGecomb / totaalGetest);

  const inPool = kandidaten.filter((k) =>
    ["in_selectie", "pool", "radical"].includes(k.pool_status ?? "")
  ).length;
  const doorstroomPercentage =
    kandidaten.length > 0 ? Math.round((inPool / kandidaten.length) * 100) : 0;

  const avgDim = (key: "a" | "p" | "aw" | "c") =>
    r1(rows.reduce((s, r) => s + r[key], 0) / totaalGetest);

  const gemiddeldePerDimensie = {
    adaptability: avgDim("a"),
    personality: avgDim("p"),
    awareness: avgDim("aw"),
    connection: avgDim("c"),
  };

  // --- Opleidingsniveaus ---
  const levelMap = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = kMap.get(r.kandidaat_id);
    const level = k?.education_level?.trim() || "Onbekend";
    const arr = levelMap.get(level) ?? [];
    arr.push(r);
    levelMap.set(level, arr);
  }

  const opleidingsniveaus: OpleidingsniveauRow[] = [];
  for (const [level, lvRows] of levelMap) {
    if (lvRows.length < 3) continue;
    const n = lvRows.length;
    opleidingsniveaus.push({
      level,
      count: n,
      adaptability: r1(lvRows.reduce((s, r) => s + r.a, 0) / n),
      personality: r1(lvRows.reduce((s, r) => s + r.p, 0) / n),
      awareness: r1(lvRows.reduce((s, r) => s + r.aw, 0) / n),
      connection: r1(lvRows.reduce((s, r) => s + r.c, 0) / n),
      gecombineerd: r1(lvRows.reduce((s, r) => s + r.gecombineerd, 0) / n),
    });
  }
  opleidingsniveaus.sort((a, b) => b.gecombineerd - a.gecombineerd);

  // --- Weekly instroom (laatste 12 weken) ---
  const now = new Date();
  const weeklyInstroom: WeeklyInstroomRow[] = Array.from({ length: 12 }, (_, i) => {
    const weekEnd = new Date(now.getTime() - (11 - i) * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    const label = weekEnd.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
    const count = rows.filter((r) => {
      const d = new Date(r.created_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    return { weekLabel: label, count };
  });

  // --- Pool status verdeling ---
  const statusCounts = new Map<string, number>();
  for (const k of kandidaten) {
    const s = k.pool_status ?? "onbekend";
    statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
  }
  const totalK = kandidaten.length;
  const poolStatusVerdeling: PoolStatusRow[] = [...statusCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({
      status,
      count,
      percentage: totalK > 0 ? Math.round((count / totalK) * 100) : 0,
    }));

  return {
    kpis: { totaalGetest, gemiddeldeGecombineerd, doorstroomPercentage, gemiddeldePerDimensie },
    opleidingsniveaus,
    populatieRadar: gemiddeldePerDimensie,
    weeklyInstroom,
    poolStatusVerdeling,
    maxScores,
    hasData: true,
  };
}

// ---------------------------------------------------------------------------
// Admin: Get CV download URL for a specific candidate
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Profiel update
// ---------------------------------------------------------------------------

const UpdateProfielSchema = z.object({
  voornaam: z.string().min(1).max(100),
  achternaam: z.string().max(100).default(""),
  email: z.string().email().optional().or(z.literal("")),
  telefoon: z.string().max(30).optional().or(z.literal("")),
  linkedin_url: z.string().url().optional().or(z.literal("")),
  pool_status: z.string().optional(),
  beschikbaarheid: z.boolean().optional(),
  vaardigheden: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  notities: z.string().max(5000).optional().or(z.literal("")),
  reden_afwijzing: z.string().max(2000).optional().or(z.literal("")),
});

export async function updateKandidaatProfiel(
  id: string,
  updates: z.infer<typeof UpdateProfielSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = UpdateProfielSchema.safeParse(updates);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const db = createServiceClient();
  const { voornaam, achternaam, email, telefoon, linkedin_url, pool_status, beschikbaarheid, vaardigheden, tags, notities, reden_afwijzing } = parsed.data;

  const patch: Record<string, unknown> = { voornaam, achternaam };
  if (email !== undefined) patch.email = email || null;
  if (telefoon !== undefined) patch.telefoon = telefoon || null;
  if (linkedin_url !== undefined) patch.linkedin_url = linkedin_url || null;
  if (pool_status !== undefined) patch.pool_status = pool_status;
  if (beschikbaarheid !== undefined) patch.beschikbaarheid = beschikbaarheid;
  if (vaardigheden !== undefined) patch.vaardigheden = vaardigheden;
  if (tags !== undefined) patch.tags = tags;
  if (notities !== undefined) patch.notities = notities || null;
  if (pool_status === "afgewezen" && reden_afwijzing !== undefined) {
    patch.reden_afwijzing = reden_afwijzing || null;
  } else if (pool_status && pool_status !== "afgewezen") {
    patch.reden_afwijzing = null;
  }

  const { error } = await db.from("kandidaten").update(patch).eq("id", id);

  if (error) {
    console.error("[updateKandidaatProfiel]", error);
    return { success: false, error: "Kon profiel niet opslaan." };
  }

  revalidatePath("/admin/candidates");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Activiteiten
// ---------------------------------------------------------------------------

export interface KandidaatActiviteit {
  id: string;
  type: string;
  beschrijving: string;
  createdAt: string;
}

export async function getKandidaatActiviteiten(
  kandidaatId: string
): Promise<KandidaatActiviteit[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("activiteiten")
    .select("id, type, beschrijving, created_at")
    .eq("kandidaat_id", kandidaatId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data || []).map((a) => ({
    id: a.id as string,
    type: a.type as string,
    beschrijving: a.beschrijving as string,
    createdAt: a.created_at as string,
  }));
}

// ── Snel notitie toevoegen voor kandidaat ─────────────────────────────────

export async function addKandidaatNotitie(
  kandidaatId: string,
  tekst: string
): Promise<{ error?: string }> {
  if (!tekst.trim()) return { error: "Notitie mag niet leeg zijn." };

  const db = createServiceClient();
  const { data: { user } } = await db.auth.getUser();

  const { error } = await db.from("activiteiten").insert({
    type: "notitie",
    beschrijving: tekst.trim(),
    kandidaat_id: kandidaatId,
    user_id: user?.id ?? null,
  });

  if (error) return { error: error.message };
  return {};
}

// ── Email versturen aan kandidaat ──────────────────────────────────────────

export async function sendKandidaatEmail(
  kandidaatId: string,
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  if (!to || !subject || !body) {
    return { success: false, error: "Ontvanger, onderwerp en bericht zijn verplicht." };
  }

  const { sendEmail } = await import("@/lib/email");

  const escapedBody = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<div style="font-family:Inter,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#0D0D14 0%,#13131F 100%);padding:20px 28px;border-radius:8px 8px 0 0">
      <h2 style="color:#2ed573;margin:0;font-size:18px;font-weight:700">Radical Portal</h2>
    </div>
    <div style="padding:24px 28px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
      <div style="white-space:pre-wrap;font-size:14px;color:#374151;line-height:1.7">${escapedBody}</div>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px">
      <p style="color:#aaa;font-size:11px;margin:0">Radical Portal — radicalportal.nl</p>
    </div>
  </div>`;

  const ok = await sendEmail({ to, subject, html, text: body });
  if (!ok) return { success: false, error: "E-mail kon niet worden verstuurd. Controleer SMTP-instellingen." };

  const db = createServiceClient();
  await db.from("activiteiten").insert({
    kandidaat_id: kandidaatId,
    type: "email",
    beschrijving: `E-mail verstuurd: "${subject}"`,
  }).then(undefined, () => {});

  return { success: true };
}

// ── APAC scores handmatig aanpassen ────────────────────────────────────────

const UpdateApacScoresSchema = z.object({
  adaptability: z.number().min(0).max(9999),
  personality:  z.number().min(0).max(9999),
  awareness:    z.number().min(0).max(9999),
  connection:   z.number().min(0).max(9999),
});

export async function updateApacScores(
  kandidaatId: string,
  data: {
    adaptability: number;
    personality: number;
    awareness: number;
    connection: number;
  }
): Promise<{ success: boolean; gecombineerd?: number; error?: string }> {
  const parsed = UpdateApacScoresSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Ongeldige scores." };

  const gecombineerd =
    parsed.data.adaptability +
    parsed.data.personality +
    parsed.data.awareness +
    parsed.data.connection;

  const db = createServiceClient();
  const { error } = await db
    .from("apac_resultaten")
    .upsert(
      {
        kandidaat_id: kandidaatId,
        adaptability: parsed.data.adaptability,
        personality:  parsed.data.personality,
        awareness:    parsed.data.awareness,
        connection:   parsed.data.connection,
        gecombineerd,
        bron: "manual",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "kandidaat_id" }
    );

  if (error) {
    console.error("[updateApacScores]", error);
    return { success: false, error: "Kon scores niet opslaan." };
  }

  await db.from("activiteiten").insert({
    kandidaat_id: kandidaatId,
    type: "apac_update",
    beschrijving: `APAC scores handmatig bijgewerkt (Totaal: ${gecombineerd})`,
  }).then(undefined, () => {});

  revalidatePath("/admin/candidates");
  return { success: true, gecombineerd };
}

// ── AVG Toestemmingen ───────────────────────────────────────────────────────

export interface AvgToestemming {
  id: string;
  type: string;
  toegestaan: boolean;
  gegevenOp: string | null;
  verlooptOp: string | null;
  ingetrokkenOp: string | null;
}

const AVG_TOESTEMMING_LABELS: Record<string, string> = {
  data_verwerking:       "Gegevensverwerking",
  cv_opslag:             "CV Opslag",
  communicatie_email:    "Email Communicatie",
  communicatie_whatsapp: "WhatsApp Communicatie",
  delen_met_klanten:     "Delen met Klanten",
  profiling:             "Profiling & AI Analyse",
};

export async function getAvgToestemmingen(
  kandidaatId: string
): Promise<AvgToestemming[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("avg_toestemmingen")
    .select("id, type, toegestaan, gegeven_op, verloopt_op, ingetrokken_op")
    .eq("kandidaat_id", kandidaatId);

  return (data ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    toegestaan: r.toegestaan,
    gegevenOp: r.gegeven_op ?? null,
    verlooptOp: r.verloopt_op ?? null,
    ingetrokkenOp: r.ingetrokken_op ?? null,
  }));
}

export async function toggleAvgToestemming(
  kandidaatId: string,
  type: string,
  toegestaan: boolean,
  existingId?: string
): Promise<{ success: boolean; error?: string }> {
  const db = createServiceClient();
  const now = new Date().toISOString();

  if (existingId) {
    const { error } = await db
      .from("avg_toestemmingen")
      .update({
        toegestaan,
        gegeven_op: toegestaan ? now : undefined,
        ingetrokken_op: !toegestaan ? now : null,
      })
      .eq("id", existingId);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await db.from("avg_toestemmingen").insert({
      kandidaat_id: kandidaatId,
      type,
      toegestaan,
      gegeven_op: toegestaan ? now : null,
      bron: "handmatig",
    });
    if (error) return { success: false, error: error.message };
  }

  await db.from("activiteiten").insert({
    kandidaat_id: kandidaatId,
    type: "avg",
    beschrijving: `AVG toestemming "${type}" ${toegestaan ? "gegeven" : "ingetrokken"}`,
  }).then(undefined, () => {});

  return { success: true };
}

// ── Pipeline / Plaatsingen ──────────────────────────────────────────────────

export interface KandidaatPlaatsing {
  id: string;
  status: string;
  createdAt: string;
  vacatureTitel: string | null;
  pipelineType: string | null;
  dealStage: string | null;
}

export async function getKandidaatPlaatsingen(
  kandidaatId: string
): Promise<KandidaatPlaatsing[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("kandidaat_plaatsingen")
    .select(`
      id, status, created_at,
      vacature:vacatures(functietitel),
      deal:deals(stage, pipeline_type)
    `)
    .eq("kandidaat_id", kandidaatId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => {
    const vac = Array.isArray(r.vacature) ? r.vacature[0] : r.vacature;
    const deal = Array.isArray(r.deal) ? r.deal[0] : r.deal;
    return {
      id: r.id,
      status: r.status ?? "—",
      createdAt: r.created_at,
      vacatureTitel: (vac as { functietitel?: string } | null)?.functietitel ?? null,
      pipelineType: (deal as { pipeline_type?: string } | null)?.pipeline_type ?? null,
      dealStage: (deal as { stage?: string } | null)?.stage ?? null,
    };
  });
}

// ── Admin CV Upload / Delete ────────────────────────────────────────────────

const ALLOWED_CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_CV_SIZE = 10 * 1024 * 1024; // 10 MB

export async function adminUploadCv(
  kandidaatId: string,
  formData: FormData
): Promise<{ success: boolean; cvUrl?: string; error?: string }> {
  const file = formData.get("cv") as File | null;
  if (!file || file.size === 0) return { success: false, error: "Geen bestand ontvangen." };
  if (file.size > MAX_CV_SIZE) return { success: false, error: "Bestand is te groot (max 10 MB)." };
  if (!ALLOWED_CV_TYPES.includes(file.type)) {
    return { success: false, error: "Alleen PDF en Word-bestanden zijn toegestaan." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const storagePath = `${kandidaatId}/cv.${ext}`;

  const db = createServiceClient();

  const { error: uploadError } = await db.storage
    .from("cv-uploads")
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error("[adminUploadCv] storage:", uploadError);
    return { success: false, error: "Upload mislukt." };
  }

  const { error: dbError } = await db
    .from("kandidaten")
    .update({ cv_url: storagePath })
    .eq("id", kandidaatId);

  if (dbError) {
    console.error("[adminUploadCv] db:", dbError);
    return { success: false, error: "CV geüpload maar opslaan mislukt." };
  }

  await db.from("activiteiten").insert({
    kandidaat_id: kandidaatId,
    type: "cv_upload",
    beschrijving: "CV geüpload door admin",
  }).then(undefined, () => {});

  revalidatePath("/admin/candidates");
  return { success: true, cvUrl: storagePath };
}

export async function adminDeleteCv(
  kandidaatId: string
): Promise<{ success: boolean; error?: string }> {
  const db = createServiceClient();

  const { data: k } = await db
    .from("kandidaten")
    .select("cv_url")
    .eq("id", kandidaatId)
    .single();

  if (k?.cv_url) {
    await db.storage.from("cv-uploads").remove([k.cv_url]).catch(() => {});
  }

  const { error } = await db
    .from("kandidaten")
    .update({ cv_url: null })
    .eq("id", kandidaatId);

  if (error) return { success: false, error: "Kon CV niet verwijderen." };

  revalidatePath("/admin/candidates");
  return { success: true };
}

export async function getAdminCvDownloadUrl(
  kandidaatId: string
): Promise<{ success: true; url: string; filename: string } | { success: false; error: string }> {
  const db = createServiceClient();

  const { data: kandidaat } = await db
    .from("kandidaten")
    .select("cv_url, voornaam, achternaam")
    .eq("id", kandidaatId)
    .single();

  if (!kandidaat?.cv_url) {
    return { success: false, error: "Geen CV gevonden voor deze kandidaat." };
  }

  const { data: signedUrlData, error: signError } = await db.storage
    .from("cv-uploads")
    .createSignedUrl(kandidaat.cv_url, 3600);

  if (signError || !signedUrlData?.signedUrl) {
    console.error("[getAdminCvDownloadUrl] sign error:", signError);
    return { success: false, error: "Kon download-link niet genereren." };
  }

  const name = [kandidaat.voornaam, kandidaat.achternaam].filter(Boolean).join("-") || "kandidaat";
  const ext = kandidaat.cv_url.split(".").pop() || "pdf";

  return {
    success: true,
    url: signedUrlData.signedUrl,
    filename: `${name}-cv.${ext}`,
  };
}
