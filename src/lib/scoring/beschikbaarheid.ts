// Pure function — geen side effects.

/**
 * Beschikbaarheidsscore:
 * true  → 1.0 (direct beschikbaar)
 * null  → 0.5 (onbekend, neutrale default)
 * false → 0.0 (niet beschikbaar)
 */
export function calculateBeschikbaarheidScore(
  beschikbaarheid: boolean | null
): number {
  if (beschikbaarheid === true) return 1.0;
  if (beschikbaarheid === false) return 0.0;
  return 0.5;
}
