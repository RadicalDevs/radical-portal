/**
 * APAC score berekening helpers
 * Hulpfuncties voor het berekenen en interpreteren van APAC-scores.
 */

import type { ApacScores, ApacDimension } from "./types";
import { APAC_DIMENSIONS } from "./types";

/** Bereken het gemiddelde van alle vier dimensies */
export function calculateCombinedScore(scores: ApacScores): number {
  const sum = APAC_DIMENSIONS.reduce((acc, dim) => acc + scores[dim], 0);
  return Math.round((sum / 4) * 10) / 10;
}

/** Bereken percentage (0-100) van een score (0-10) */
export function scoreToPercentage(score: number): number {
  return Math.round(score * 10);
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
