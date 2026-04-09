// Pure function — geen side effects, geen database calls.

export interface SkillScoreResult {
  score: number;
  matchend: string[];
  ontbrekend: string[];
}

/**
 * Berekent hoeveel van de vaardigheden van een kandidaat voorkomen in de
 * vacaturetekst (titel + beschrijving), op basis van word-boundary regex matching.
 *
 * Score = matchend.length / (matchend.length + ontbrekend.length)
 */
export function calculateSkillScore(
  kandidaatVaardigheden: string[],
  vacatureTitel: string,
  vacatureBeschrijving: string
): SkillScoreResult {
  if (!kandidaatVaardigheden?.length) {
    return { score: 0, matchend: [], ontbrekend: [] };
  }

  const searchText = `${vacatureTitel} ${vacatureBeschrijving}`.toLowerCase();
  const matchend: string[] = [];
  const ontbrekend: string[] = [];

  for (const vaardigheid of kandidaatVaardigheden) {
    const term = vaardigheid.toLowerCase().trim();
    if (term.length < 2) continue;

    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<!\\w)${escaped}(?!\\w)`, "i");

    if (regex.test(searchText)) {
      matchend.push(vaardigheid);
    } else {
      ontbrekend.push(vaardigheid);
    }
  }

  const total = matchend.length + ontbrekend.length;
  return {
    score: total > 0 ? matchend.length / total : 0,
    matchend,
    ontbrekend,
  };
}
