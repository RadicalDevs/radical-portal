/**
 * APAC score berekening helpers
 * Hulpfuncties voor het berekenen en interpreteren van APAC-scores.
 *
 * Scoring model: TOTAAL PUNTEN per dimensie
 *   score = SUM(antwoord_waarde × vraag_gewicht)
 *   maxScore = SUM(max_optie_waarde × vraag_gewicht) per dimensie
 */

import type { ApacScores, ApacMaxScores, ApacDimension, VetoDetail } from "./types";
import { APAC_DIMENSIONS } from "./types";

/** Bereken het totaal van alle vier dimensies (som, niet gemiddelde) */
export function calculateCombinedScore(scores: ApacScores): number {
  return APAC_DIMENSIONS.reduce((acc, dim) => acc + scores[dim], 0);
}

/** Bereken het maximum totaal over alle dimensies */
export function calculateCombinedMax(maxScores: ApacMaxScores): number {
  return APAC_DIMENSIONS.reduce((acc, dim) => acc + maxScores[dim], 0);
}

/** Bereken percentage van score t.o.v. max (0-100) */
export function scoreToPercentage(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}

/**
 * Bereken max punten per dimensie op basis van actieve vragen.
 * Elke vraag heeft options (JSONB) met [{label, value}] en een weight.
 * Max = SUM(max(option.value) × weight) per dimensie.
 */
export function calculateMaxScores(
  questions: { variable: string; options: { value: number }[]; weight: number }[]
): ApacMaxScores {
  const maxScores: ApacMaxScores = {
    adaptability: 0,
    personality: 0,
    awareness: 0,
    connection: 0,
  };

  for (const q of questions) {
    const dim = q.variable as ApacDimension;
    if (!(dim in maxScores)) continue;

    const maxOptionValue = Math.max(...q.options.map((o) => o.value));
    maxScores[dim] += maxOptionValue * (q.weight ?? 1);
  }

  return maxScores;
}

// ---------------------------------------------------------------------------
// Veto evaluatie
// ---------------------------------------------------------------------------

export interface VetoCheckInput {
  question: {
    id: string;
    question_text: string;
    options: { label: string; value: number; is_veto_fout?: boolean }[];
  };
  answerValue: number;
}

/**
 * Evalueer welke veto vragen getriggerd zijn.
 * Een veto is getriggerd als het gekozen antwoord een optie is met is_veto_fout: true.
 */
export function evaluateVetoTriggers(checks: VetoCheckInput[]): VetoDetail[] {
  const triggered: VetoDetail[] = [];

  for (const { question, answerValue } of checks) {
    const matchedOption = question.options.find(
      (o) => o.value === answerValue && o.is_veto_fout === true
    );
    if (matchedOption) {
      triggered.push({
        question_id: question.id,
        question_text: question.question_text,
        answer_value: answerValue,
        answer_label: matchedOption.label,
      });
    }
  }

  return triggered;
}

/**
 * Genereer HTML voor veto waarschuwing in email notificaties.
 * Retourneert lege string als er geen veto's zijn.
 */
export function buildVetoEmailHtml(vetoDetails: VetoDetail[]): string {
  if (vetoDetails.length === 0) return "";

  const items = vetoDetails
    .map(
      (v) =>
        `<li style="margin-bottom:6px"><strong>${v.question_text}</strong><br/><span style="color:#dc2626">Antwoord: ${v.answer_label}</span></li>`
    )
    .join("");

  return `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="color:#dc2626;font-weight:bold;margin:0 0 8px 0;font-size:14px">
        &#9888; Veto waarschuwing (${vetoDetails.length} van 5)
      </p>
      <ul style="margin:0;padding:0 0 0 16px;color:#991b1b;font-size:13px;list-style:none">
        ${items}
      </ul>
    </div>
  `;
}

/** Labels voor de APAC dimensies (NL) */
export const DIMENSION_LABELS: Record<ApacDimension, string> = {
  adaptability: "Adaptability",
  personality: "Personality",
  awareness: "Awareness",
  connection: "Connection",
};

/** Kleuren per dimensie voor de radarchart */
export const DIMENSION_COLORS: Record<ApacDimension, string> = {
  adaptability: "#2ed573",
  personality: "#E6734F",
  awareness: "#3B82F6",
  connection: "#8B5CF6",
};
