// Pure function — geen side effects, geen database calls.
// APAC roltype gewichten conform RADICALAI_PROJECT.md blueprint

import type { APACRolGewichten } from "@/config/matching";

export interface ApacInput {
  adaptability?: number | null;
  personality?: number | null;
  awareness?: number | null;
  connection?: number | null;
}

export interface ApacScoreResult {
  score: number;
  roltype: string;
  volledigheid: number;
}

const ROLTYPE_ZOEKTERMEN: Record<string, string[]> = {
  ai_engineer: ["engineer", "developer"],
  ai_marketeer: ["market", "growth", "content"],
  ai_ethics_lead: ["ethics", "compliance", "responsible"],
  ai_product_manager: ["product manager", "product owner"],
  ai_data_analyst: ["data", "analyst", "bi"],
  ai_consultant: ["consult", "advisory"],
  ai_trainer: ["train", "coach", "learn"],
  interim_pm: ["project manager", "interim", "scrum"],
};

export function detectRoltype(
  functietitel: string,
  rolGewichten?: Record<string, APACRolGewichten>,
  zoektermen?: Record<string, string[]>
): string {
  const rg = rolGewichten ?? {};
  const zt = zoektermen ?? ROLTYPE_ZOEKTERMEN;
  const titel = functietitel.toLowerCase();

  for (const key of Object.keys(rg)) {
    if (key === "_default") continue;
    if (titel.includes(key.replace(/_/g, " "))) return key;
  }

  for (const [key, terms] of Object.entries(zt)) {
    for (const term of terms) {
      if (titel.includes(term.toLowerCase())) return key;
    }
  }

  return "_default";
}

export function calculateApacScore(
  apacData: ApacInput,
  functietitel: string,
  rolGewichten?: Record<string, APACRolGewichten>,
  neutralDefault: number = 0.5
): ApacScoreResult {
  const roltype = detectRoltype(functietitel, rolGewichten);

  const dimensies = [
    apacData.adaptability,
    apacData.personality,
    apacData.awareness,
    apacData.connection,
  ];

  const ingevuld = dimensies.filter((d) => d != null && !isNaN(d as number));
  const volledigheid = ingevuld.length / 4;

  if (ingevuld.length < 2) {
    return { score: neutralDefault, roltype, volledigheid };
  }

  const defaultGewichten = { adaptability: 1, personality: 1, awareness: 1, connection: 1 };
  const gewichten = rolGewichten?.[roltype] ?? rolGewichten?.["_default"] ?? defaultGewichten;

  const waarden: [number, number, number, number] = [
    apacData.adaptability ?? 0,
    apacData.personality ?? 0,
    apacData.awareness ?? 0,
    apacData.connection ?? 0,
  ];

  const ingevuldMask = [
    apacData.adaptability != null,
    apacData.personality != null,
    apacData.awareness != null,
    apacData.connection != null,
  ];

  const gewichtenArr = [
    gewichten.adaptability,
    gewichten.personality,
    gewichten.awareness,
    gewichten.connection,
  ];

  let gewogenSom = 0;
  let gewogenMax = 0;

  for (let i = 0; i < 4; i++) {
    if (ingevuldMask[i]) {
      gewogenSom += waarden[i] * gewichtenArr[i];
      gewogenMax += 10 * gewichtenArr[i];
    }
  }

  if (gewogenMax === 0) {
    return { score: neutralDefault, roltype, volledigheid };
  }

  const score = Math.min(1, Math.max(0, gewogenSom / gewogenMax));
  return { score: Math.round(score * 1000) / 1000, roltype, volledigheid };
}
