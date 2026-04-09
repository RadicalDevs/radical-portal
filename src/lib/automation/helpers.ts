/**
 * Pure utility helpers for automation modules.
 * No Supabase dependencies — safe to unit-test in isolation.
 */

export function buildKandidaatNaam(
  kandidaat: { voornaam: string; achternaam: string | null } | null | undefined
): string {
  if (!kandidaat) return "?";
  const parts = [kandidaat.voornaam, kandidaat.achternaam].filter(Boolean);
  return parts.join(" ") || "?";
}
