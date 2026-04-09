/**
 * Enhanced Matching Engine — Geporteerd vanuit radical-crm-app
 *
 * 7-componenten scoring:
 * 1. Semantisch (20%) — cosine similarity embeddings
 * 2. Vaardigheden (25%) — skill regex matching
 * 3. APAC (20%) — gewogen APAC scores per roltype
 * 4. Cultuur (10%) — APAC vs bedrijfscultuur pijlers
 * 5. Gesprek (10%) — sentiment + geschiktheid + non-verbaal
 * 6. Salaris (10%) — range compatibility
 * 7. Beschikbaarheid (5%) — direct beschikbaar
 */
import { createServiceClient } from "@/lib/supabase/server";
import { generateEmbedding } from "./embeddings";
import { getEmbeddingModel } from "./provider";
import { DEFAULT_MATCH_CONFIG, normalizeWeights } from "@/config/matching";
import type { MatchConfig, CultuurPijlerConfig } from "@/config/matching";

// ── Types ──

export interface MatchUitleg {
  matchende_vaardigheden: string[];
  ontbrekende_vaardigheden: string[];
  salaris_beoordeling: string;
  beschikbaarheid_tekst: string;
  sterke_punten: string[];
  aandachtspunten: string[];
  samenvatting: string;
  apac_beoordeling?: string;
  gesprek_beoordeling?: string;
  cultuur_beoordeling?: string;
}

export interface EnhancedMatchResult {
  kandidaat_id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  vaardigheden: string[];
  beschikbaarheid: boolean | null;
  salarisindicatie: number | null;
  uurtarief: number | null;
  totaal_score: number;
  semantic_score?: number;
  salaris_score?: number;
  vaardigheden_score?: number;
  beschikbaarheid_score?: number;
  apac_score?: number;
  gesprek_score?: number;
  cultuur_score?: number;
  apac_details?: {
    adaptability: number;
    personality: number;
    awareness: number;
    connection: number;
  };
  uitleg: MatchUitleg;
}

interface RawRPCMatch {
  kandidaat_id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  vaardigheden: string[];
  tags: string[];
  beschikbaarheid: boolean | null;
  salarisindicatie: number | null;
  uurtarief: number | null;
  similarity: number;
}

interface APACScoresInput {
  adaptability: number;
  personality: number;
  awareness: number;
  connection: number;
}

interface GesprekInput {
  geschiktheid_score?: number;
  sentiment?: string;
  non_verbale_signalen?: string[];
  datum?: string;
}

// ── Vacature tekst builder ──

export function buildVacatureText(v: {
  functietitel: string;
  beschrijving?: string;
  salaris_min?: number;
  salaris_max?: number;
  klant_naam?: string;
}): string {
  const parts = [`Vacature: ${v.functietitel}`];
  if (v.beschrijving) parts.push(`Beschrijving: ${v.beschrijving}`);
  if (v.klant_naam) parts.push(`Bedrijf: ${v.klant_naam}`);
  if (v.salaris_min || v.salaris_max) {
    parts.push(`Salaris: €${v.salaris_min ?? "?"} - €${v.salaris_max ?? "?"}`);
  }
  return parts.join("\n");
}

// ── Scoring Helpers ──

function computeSalarisScore(
  kandidaatSalaris: number | null,
  vacatureMin: number | null,
  vacatureMax: number | null,
  scoring: MatchConfig["scoring"]
): { score: number; beoordeling: string } {
  if (kandidaatSalaris == null) {
    return { score: scoring.neutralDefault, beoordeling: "Geen salarisindicatie opgegeven" };
  }
  if (vacatureMin == null && vacatureMax == null) {
    return { score: scoring.neutralDefault, beoordeling: "Geen salarisrange bij vacature" };
  }

  const min = vacatureMin ?? 0;
  const max = vacatureMax ?? Infinity;

  if (kandidaatSalaris >= min && kandidaatSalaris <= max) {
    return { score: 1.0, beoordeling: "Binnen salarisrange" };
  }

  const reference = vacatureMax ?? vacatureMin!;
  if (!reference) {
    return { score: scoring.neutralDefault, beoordeling: "Ongeldige salarisrange" };
  }

  const diff =
    kandidaatSalaris > max
      ? (kandidaatSalaris - max) / reference
      : (min - kandidaatSalaris) / reference;

  if (diff <= scoring.salarisAfwijking.band1Percentage) {
    return {
      score: scoring.salarisAfwijking.band1Score,
      beoordeling: `${Math.round(diff * 100)}% ${kandidaatSalaris > max ? "boven maximum" : "onder minimum"}`,
    };
  }
  if (diff <= scoring.salarisAfwijking.band2Percentage) {
    return {
      score: scoring.salarisAfwijking.band2Score,
      beoordeling: `${Math.round(diff * 100)}% ${kandidaatSalaris > max ? "boven maximum" : "onder minimum"}`,
    };
  }

  return {
    score: scoring.salarisAfwijking.beyondScore,
    beoordeling: `${Math.round(diff * 100)}% ${kandidaatSalaris > max ? "boven maximum" : "onder minimum"}`,
  };
}

function computeVaardighedenScore(
  vaardigheden: string[],
  beschrijving: string,
  titel: string
): { score: number; matchend: string[]; ontbrekend: string[] } {
  if (!vaardigheden?.length) return { score: 0, matchend: [], ontbrekend: [] };

  const searchText = `${titel} ${beschrijving}`.toLowerCase();
  const matchend: string[] = [];
  const ontbrekend: string[] = [];

  for (const v of vaardigheden) {
    const term = v.toLowerCase().trim();
    if (term.length < 2) continue;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<!\\w)${escaped}(?!\\w)`, "i");
    if (regex.test(searchText)) matchend.push(v);
    else ontbrekend.push(v);
  }

  const total = matchend.length + ontbrekend.length;
  return { score: total > 0 ? matchend.length / total : 0, matchend, ontbrekend };
}

function computeAPACScore(
  apac: APACScoresInput | null,
  roltype: string,
  cfg: MatchConfig
): { score: number; beoordeling: string } {
  if (!apac) return { score: cfg.scoring.neutralDefault, beoordeling: "Geen APAC beoordeling" };

  const gewichten = cfg.apacRolGewichten[roltype] || cfg.apacRolGewichten._default;
  const gewogenSom =
    apac.adaptability * gewichten.adaptability +
    apac.personality * gewichten.personality +
    apac.awareness * gewichten.awareness +
    apac.connection * gewichten.connection;
  const gewogenMax =
    10 * (gewichten.adaptability + gewichten.personality + gewichten.awareness + gewichten.connection);
  const score = gewogenSom / gewogenMax;

  const label =
    score >= cfg.scoring.labelDrempels.uitstekend
      ? "Uitstekende APAC match"
      : score >= cfg.scoring.labelDrempels.goed
        ? "Goede APAC match"
        : score >= cfg.scoring.labelDrempels.redelijk
          ? "Redelijke APAC match"
          : "Zwakke APAC match";

  return { score, beoordeling: `${label} (A:${apac.adaptability} P:${apac.personality} A:${apac.awareness} C:${apac.connection})` };
}

const SENTIMENT_MAP: Record<string, number> = {
  positief: 0.9,
  neutraal: 0.5,
  gemengd: 0.6,
  negatief: 0.2,
};

const POSITIVE_NONVERBAL = [
  "enthousiast", "zelfverzekerd", "geengageerd", "open", "energiek",
  "betrokken", "gemotiveerd", "positief", "vriendelijk", "proactief",
];

function computeGesprekScore(
  gesprekken: GesprekInput[] | null,
  cfg: MatchConfig
): { score: number; beoordeling: string } {
  if (!gesprekken?.length) return { score: cfg.scoring.neutralDefault, beoordeling: "Geen gesprekken" };

  let totalWeight = 0;
  let weightedSum = 0;
  let validCount = 0;

  for (const g of gesprekken) {
    if (g.geschiktheid_score == null) continue;

    let recencyWeight = 1.0;
    if (g.datum) {
      const days = (Date.now() - new Date(g.datum).getTime()) / 86_400_000;
      recencyWeight = days > 90 ? 0.4 : days > 30 ? 0.7 : 1.0;
    }

    const sentimentScore = SENTIMENT_MAP[g.sentiment || ""] ?? cfg.scoring.neutralDefault;
    const geschiktheidScore = g.geschiktheid_score / 10;

    let nonVerbaalScore = cfg.scoring.neutralDefault;
    if (g.non_verbale_signalen?.length) {
      const positief = g.non_verbale_signalen.filter((s) =>
        POSITIVE_NONVERBAL.some((k) => s.toLowerCase().includes(k))
      ).length;
      nonVerbaalScore = positief / g.non_verbale_signalen.length;
    }

    const score = (sentimentScore + geschiktheidScore + nonVerbaalScore) / 3;
    weightedSum += score * recencyWeight;
    totalWeight += recencyWeight;
    validCount++;
  }

  if (totalWeight === 0) return { score: cfg.scoring.neutralDefault, beoordeling: "Geen geldige gesprekken" };

  const avg = weightedSum / totalWeight;
  const label =
    avg >= cfg.scoring.labelDrempels.uitstekend
      ? "Zeer positieve gesprekken"
      : avg >= cfg.scoring.labelDrempels.goed
        ? "Positieve gesprekken"
        : avg >= cfg.scoring.labelDrempels.redelijk
          ? "Neutrale gesprekken"
          : "Aandachtspunten uit gesprekken";

  return {
    score: Math.round(Math.min(1, Math.max(0, avg)) * 100) / 100,
    beoordeling: `${label} (${validCount} gesprek${validCount > 1 ? "ken" : ""})`,
  };
}

function computeCultuurScore(
  apac: APACScoresInput | null,
  klantCultuur: Record<string, number> | null,
  pijlers: CultuurPijlerConfig[],
  cfg: MatchConfig
): { score: number; beoordeling: string } {
  if (!klantCultuur || !Object.keys(klantCultuur).length) {
    return { score: cfg.scoring.neutralDefault, beoordeling: "Geen bedrijfscultuur profiel" };
  }
  if (!apac) return { score: cfg.scoring.neutralDefault, beoordeling: "Geen APAC voor cultuurafstemming" };

  let totalWeight = 0;
  let weightedCompat = 0;

  for (const p of pijlers) {
    const companyScore = klantCultuur[p.key];
    if (companyScore == null || !p.apac_mapping) continue;
    const candidateScore = apac[p.apac_mapping as keyof APACScoresInput];
    if (candidateScore == null) continue;
    const compat = 1 - Math.abs(candidateScore - companyScore) / 9;
    weightedCompat += compat * p.gewicht;
    totalWeight += p.gewicht;
  }

  if (totalWeight === 0) return { score: cfg.scoring.neutralDefault, beoordeling: "Geen gemapte cultuurpijlers" };

  const score = weightedCompat / totalWeight;
  const label =
    score >= cfg.scoring.labelDrempels.uitstekend
      ? "Uitstekende cultuurmatch"
      : score >= cfg.scoring.labelDrempels.goed
        ? "Goede cultuurmatch"
        : "Redelijke cultuurmatch";

  return { score: Math.round(score * 100) / 100, beoordeling: label };
}

// ── Uitleg Builder ──

function buildUitleg(
  semanticScore: number,
  salarisScore: number,
  salarisLabel: string,
  vaardighedenScore: number,
  matchend: string[],
  ontbrekend: string[],
  beschikbaarheidScore: number,
  beschikbaarheid: boolean | null,
  totaalScore: number,
  functietitel: string,
  bedrijfsnaam: string | null,
  cfg: MatchConfig
): MatchUitleg {
  const s = cfg.scoring;
  const sterkePunten: string[] = [];
  const aandachtspunten: string[] = [];

  if (semanticScore >= s.sterkePuntenDrempels.semantisch) sterkePunten.push("Sterk semantisch profiel-match");
  if (salarisScore >= s.sterkePuntenDrempels.salaris) sterkePunten.push("Salaris past goed");
  if (vaardighedenScore >= s.sterkePuntenDrempels.vaardigheden) sterkePunten.push("Veel overlappende vaardigheden");
  if (beschikbaarheidScore >= s.sterkePuntenDrempels.beschikbaarheid) sterkePunten.push("Direct beschikbaar");

  if (semanticScore < s.aandachtspuntenDrempels.semantisch) aandachtspunten.push("Profiel wijkt af van vacature");
  if (salarisScore < s.aandachtspuntenDrempels.salaris) aandachtspunten.push("Salarisverwachting buiten range");
  if (vaardighedenScore < s.aandachtspuntenDrempels.vaardigheden) aandachtspunten.push("Weinig overlappende vaardigheden");
  if (beschikbaarheidScore < s.aandachtspuntenDrempels.beschikbaarheid) aandachtspunten.push("Niet direct beschikbaar");

  const kwaliteit = totaalScore >= 0.7 ? "sterke" : totaalScore >= 0.5 ? "solide" : "redelijke";
  const bij = bedrijfsnaam ? ` bij ${bedrijfsnaam}` : "";
  let samenvatting = `Heeft een ${kwaliteit} match met de ${functietitel} vacature${bij}.`;

  if (matchend.length > 0) {
    const top3 = matchend.slice(0, 3);
    samenvatting += ` Vaardigheden als ${top3.join(", ")} sluiten goed aan.`;
  }

  return {
    matchende_vaardigheden: matchend,
    ontbrekende_vaardigheden: ontbrekend,
    salaris_beoordeling: salarisLabel,
    beschikbaarheid_tekst:
      beschikbaarheid === true ? "Direct beschikbaar" : beschikbaarheid === false ? "Niet beschikbaar" : "Beschikbaarheid onbekend",
    sterke_punten: sterkePunten,
    aandachtspunten,
    samenvatting,
  };
}

// ── Klant Cultuur Resolver ──

async function resolveKlantCultuur(
  klantId: string,
  sector: string | null,
  supabase: ReturnType<typeof createServiceClient>
): Promise<Record<string, number> | null> {
  const { data: cultuurRes } = await supabase
    .from("klant_cultuur_resultaten")
    .select("scores")
    .eq("klant_id", klantId)
    .maybeSingle();

  if (cultuurRes?.scores && Object.keys(cultuurRes.scores as Record<string, unknown>).length > 0) {
    return cultuurRes.scores as Record<string, number>;
  }

  if (sector) {
    const { data: sectorConfig } = await supabase
      .from("matching_config")
      .select("cultuur_defaults")
      .eq("scope_type", "sector")
      .eq("scope_key", sector)
      .maybeSingle();

    if (sectorConfig?.cultuur_defaults && Object.keys(sectorConfig.cultuur_defaults as Record<string, unknown>).length > 0) {
      return sectorConfig.cultuur_defaults as Record<string, number>;
    }
  }

  return null;
}

// ── Roltype Detectie ──

function detectRoltype(functietitel: string, cfg: MatchConfig): string {
  const titel = functietitel.toLowerCase();
  for (const key of Object.keys(cfg.apacRolGewichten)) {
    if (key === "_default") continue;
    if (titel.includes(key.replace(/_/g, " "))) return key;
  }
  for (const [key, terms] of Object.entries(cfg.roltypeZoektermen)) {
    for (const term of terms) {
      if (titel.includes(term.toLowerCase())) return key;
    }
  }
  return "_default";
}

// ── HOOFD MATCHING FUNCTIE ──

export async function matchKandidatenForVacature(
  vacatureId: string,
  options?: {
    config?: MatchConfig;
    maxResults?: number;
  }
): Promise<EnhancedMatchResult[]> {
  const supabase = createServiceClient();
  const startTime = Date.now();
  const cfg = options?.config ?? DEFAULT_MATCH_CONFIG;
  const maxResults = options?.maxResults ?? cfg.defaults.maxResults;

  // Fetch vacature
  const { data: vacature } = await supabase
    .from("vacatures")
    .select("functietitel, beschrijving, salaris_min, salaris_max, budget, klant_id, sector, klant:klanten(id, bedrijfsnaam, sector)")
    .eq("id", vacatureId)
    .single();

  if (!vacature) throw new Error("Vacature niet gevonden");

  const v = vacature as Record<string, unknown>;
  const klant = v.klant as { id: string; bedrijfsnaam: string; sector?: string } | null;
  const salarisMin = (v.salaris_min as number) || null;
  const salarisMax = (v.salaris_max as number) || null;
  const beschrijving = (v.beschrijving as string) || "";
  const functietitel = v.functietitel as string;

  // Generate vacature embedding
  const vacatureText = buildVacatureText({
    functietitel,
    beschrijving: beschrijving || undefined,
    salaris_min: salarisMin || undefined,
    salaris_max: salarisMax || undefined,
    klant_naam: klant?.bedrijfsnaam,
  });

  const embedding = await generateEmbedding(vacatureText);

  // RPC: vector similarity search
  const { data: rawMatches, error } = await supabase.rpc("match_kandidaten_for_vacature", {
    vacature_embedding: JSON.stringify(embedding),
    min_similarity: cfg.hardFilters.minCosineSimilarity,
    max_results: cfg.defaults.rpcFetchLimit,
  });

  if (error) throw error;
  const candidates = (rawMatches || []) as unknown as RawRPCMatch[];

  // Hard filters
  const filtered = candidates.filter((c) => {
    if (cfg.hardFilters.excludeNietBeschikbaar && c.beschikbaarheid === false) return false;
    if (salarisMax && c.salarisindicatie && c.salarisindicatie > salarisMax * cfg.hardFilters.maxSalarisOverschrijding) return false;
    return true;
  });

  const disabled = cfg.disabledComponents || [];
  const isDisabled = (key: string) => disabled.includes(key);
  const kandidaatIds = filtered.map((c) => c.kandidaat_id);

  // Batch-fetch APAC data
  const apacMap = new Map<string, APACScoresInput>();
  if ((!isDisabled("apac") || !isDisabled("cultuur")) && kandidaatIds.length > 0) {
    const { data } = await supabase
      .from("apac_resultaten")
      .select("kandidaat_id, adaptability, personality, awareness, connection")
      .in("kandidaat_id", kandidaatIds);
    for (const a of (data || []) as Array<Record<string, unknown>>) {
      apacMap.set(a.kandidaat_id as string, {
        adaptability: Number(a.adaptability),
        personality: Number(a.personality),
        awareness: Number(a.awareness),
        connection: Number(a.connection),
      });
    }
  }

  // Batch-fetch gesprek data
  const gesprekMap = new Map<string, GesprekInput[]>();
  if (!isDisabled("gesprek") && kandidaatIds.length > 0) {
    const { data } = await supabase
      .from("activiteiten")
      .select("kandidaat_id, metadata, created_at")
      .in("kandidaat_id", kandidaatIds)
      .in("type", ["afspraak", "notitie"]);
    for (const g of (data || []) as Array<Record<string, unknown>>) {
      const meta = g.metadata as Record<string, unknown> | null;
      if (!meta?.geschiktheid_score) continue;
      const existing = gesprekMap.get(g.kandidaat_id as string) || [];
      existing.push({
        geschiktheid_score: meta.geschiktheid_score as number,
        sentiment: meta.sentiment as string | undefined,
        non_verbale_signalen: meta.non_verbale_signalen as string[] | undefined,
        datum: g.created_at as string,
      });
      gesprekMap.set(g.kandidaat_id as string, existing);
    }
  }

  // Fetch klant cultuur
  const klantId = v.klant_id as string;
  const sector = (v.sector as string) || klant?.sector || null;
  const klantCultuur =
    !isDisabled("cultuur") && klantId
      ? await resolveKlantCultuur(klantId, sector, supabase)
      : null;

  const roltype = detectRoltype(functietitel, cfg);
  const w = normalizeWeights(cfg.weights, disabled);

  // Score each candidate
  const scored: EnhancedMatchResult[] = filtered.map((c) => {
    const semanticScore = c.similarity;

    const { score: salarisScore, beoordeling: salarisLabel } = computeSalarisScore(
      c.salarisindicatie, salarisMin, salarisMax, cfg.scoring
    );

    const { score: vaardighedenScore, matchend, ontbrekend } = computeVaardighedenScore(
      c.vaardigheden || [], beschrijving, functietitel
    );

    const beschikbaarheidScore =
      c.beschikbaarheid === true ? 1.0 : c.beschikbaarheid === false ? 0.0 : cfg.scoring.neutralDefault;

    const { score: apacScore, beoordeling: apacLabel } = !isDisabled("apac")
      ? computeAPACScore(apacMap.get(c.kandidaat_id) || null, roltype, cfg)
      : { score: 0, beoordeling: "" };

    const { score: gesprekScore, beoordeling: gesprekLabel } = !isDisabled("gesprek")
      ? computeGesprekScore(gesprekMap.get(c.kandidaat_id) || null, cfg)
      : { score: 0, beoordeling: "" };

    const { score: cultuurScore, beoordeling: cultuurLabel } = !isDisabled("cultuur")
      ? computeCultuurScore(apacMap.get(c.kandidaat_id) || null, klantCultuur, cfg.cultuurPijlers, cfg)
      : { score: 0, beoordeling: "" };

    const totaalScore =
      w.semantisch * semanticScore +
      w.vaardigheden * vaardighedenScore +
      w.apac * apacScore +
      w.cultuur * cultuurScore +
      w.gesprek * gesprekScore +
      w.salaris * salarisScore +
      w.beschikbaarheid * beschikbaarheidScore;

    const uitleg = buildUitleg(
      semanticScore, salarisScore, salarisLabel,
      vaardighedenScore, matchend, ontbrekend,
      beschikbaarheidScore, c.beschikbaarheid,
      totaalScore, functietitel, klant?.bedrijfsnaam ?? null, cfg
    );
    if (!isDisabled("apac")) uitleg.apac_beoordeling = apacLabel;
    if (!isDisabled("gesprek")) uitleg.gesprek_beoordeling = gesprekLabel;
    if (!isDisabled("cultuur")) uitleg.cultuur_beoordeling = cultuurLabel;

    return {
      kandidaat_id: c.kandidaat_id,
      voornaam: c.voornaam,
      achternaam: c.achternaam,
      email: c.email,
      vaardigheden: c.vaardigheden || [],
      beschikbaarheid: c.beschikbaarheid,
      salarisindicatie: c.salarisindicatie,
      uurtarief: c.uurtarief,
      totaal_score: Math.round(totaalScore * 100) / 100,
      semantic_score: !isDisabled("semantisch") ? Math.round(semanticScore * 100) / 100 : undefined,
      salaris_score: !isDisabled("salaris") ? Math.round(salarisScore * 100) / 100 : undefined,
      vaardigheden_score: !isDisabled("vaardigheden") ? Math.round(vaardighedenScore * 100) / 100 : undefined,
      beschikbaarheid_score: !isDisabled("beschikbaarheid") ? beschikbaarheidScore : undefined,
      apac_score: !isDisabled("apac") ? Math.round(apacScore * 100) / 100 : undefined,
      gesprek_score: !isDisabled("gesprek") ? Math.round(gesprekScore * 100) / 100 : undefined,
      cultuur_score: !isDisabled("cultuur") ? Math.round(cultuurScore * 100) / 100 : undefined,
      apac_details: !isDisabled("apac") ? apacMap.get(c.kandidaat_id) : undefined,
      uitleg,
    };
  });

  scored.sort((a, b) => b.totaal_score - a.totaal_score);
  const results = scored.slice(0, maxResults);

  // Log AI usage
  await supabase.from("ai_logs").insert({
    action: "enhanced_match_kandidaten",
    input: { vacature_id: vacatureId, weights: w, roltype },
    output: { raw: candidates.length, filtered: filtered.length, returned: results.length },
    model: getEmbeddingModel(),
    duration_ms: Date.now() - startTime,
    success: true,
  });

  return results;
}
