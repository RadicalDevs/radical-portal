/**
 * processApacScores — Portal implementatie
 *
 * Deze functies repliceren de interface uit het CRM (docs/crm-reference/).
 * De volledige implementatie wordt in een volgende fase ingevuld.
 *
 * BELANGRIJK: De logica moet IDENTIEK zijn aan het CRM.
 * Zie docs/crm-reference/lib/apac/processApacScores.ts voor de interface reference.
 */

import type {
  ApacScores,
  PoortConfig,
  PoortDecision,
  ProcessApacScoresInput,
  ProcessApacScoresResult,
  ValidateApacScoresResult,
} from "./types";

/**
 * Valideert een set APAC-scores op volledigheid en bereik (0-10 per dimensie).
 * Pure functie — geen side effects, geen database.
 */
export function validateApacScores(scores: unknown): ValidateApacScoresResult {
  const errors: string[] = [];
  const dimensions = ["adaptability", "personality", "awareness", "connection"];

  if (!scores || typeof scores !== "object") {
    return { valid: false, errors: ["Scores object is verplicht"] };
  }

  const s = scores as Record<string, unknown>;

  for (const dim of dimensions) {
    const val = s[dim];
    if (val === undefined || val === null) {
      errors.push(`${dim} is verplicht`);
    } else if (typeof val !== "number" || val < 1 || val > 10) {
      errors.push(`${dim} moet tussen 1 en 10 zijn (was: ${val})`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Berekent de De Poort-beslissing op basis van scores, config en teller.
 * Pure functie — geen side effects, geen database.
 */
export function computeDePoortDecision(params: {
  totalKandidaten: number;
  config: PoortConfig;
  scores: ApacScores;
}): PoortDecision {
  const { totalKandidaten, config, scores } = params;

  // Leerfase: altijd doorlaten
  if (config.fase === "learning" || totalKandidaten < config.kandidaat_drempel) {
    return { leerfase: true, newPoolStatus: "pool" };
  }

  // Actieve fase: vergelijk met drempels
  const dimensions = [
    { score: scores.adaptability, drempel: config.drempel_adaptability },
    { score: scores.personality, drempel: config.drempel_personality },
    { score: scores.awareness, drempel: config.drempel_awareness },
    { score: scores.connection, drempel: config.drempel_connection },
  ];

  for (const { score, drempel } of dimensions) {
    if (drempel != null && score < drempel) {
      return { leerfase: false, newPoolStatus: "pending_review" };
    }
  }

  const gemiddeld =
    (scores.adaptability + scores.personality + scores.awareness + scores.connection) / 4;

  if (config.drempel_gecombineerd != null && gemiddeld < config.drempel_gecombineerd) {
    return { leerfase: false, newPoolStatus: "pending_review" };
  }

  return { leerfase: false, newPoolStatus: "pool" };
}

/**
 * Verwerkt APAC-scores end-to-end voor een kandidaat.
 * TODO: Volledige implementatie in volgende fase (database calls, embedding, notificaties).
 */
export async function processApacScores(
  input: ProcessApacScoresInput
): Promise<ProcessApacScoresResult> {
  // Placeholder — wordt in volgende fase geïmplementeerd
  const gecombineerd =
    Math.round(
      ((input.scores.adaptability +
        input.scores.personality +
        input.scores.awareness +
        input.scores.connection) /
        4) *
        10
    ) / 10;

  return {
    kandidaat_id: input.kandidaatId,
    scores: input.scores,
    gecombineerd,
    leerfase: true,
    pool_status: "pool",
  };
}
