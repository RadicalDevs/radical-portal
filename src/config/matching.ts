// =============================================================================
// Matching Configuratie — Geporteerd vanuit radical-crm-app/src/config/matching.ts
// =============================================================================

// --- Types ---

export interface MatchWeights {
  vaardigheden: number;
  semantisch: number;
  apac: number;
  cultuur: number;
  gesprek: number;
  salaris: number;
  beschikbaarheid: number;
}

export interface HardFilterConfig {
  minCosineSimilarity: number;
  maxSalarisOverschrijding: number;
  excludeNietBeschikbaar: boolean;
}

export type APACPillar = "adaptability" | "personality" | "awareness" | "connection";

export interface APACRolGewichten {
  adaptability: number;
  personality: number;
  awareness: number;
  connection: number;
}

export interface CultuurPijlerConfig {
  key: string;
  label: string;
  apac_mapping: string | null;
  kleur: string;
  gewicht: number;
}

export interface ScoringConfig {
  neutralDefault: number;
  salarisAfwijking: {
    band1Percentage: number;
    band1Score: number;
    band2Percentage: number;
    band2Score: number;
    beyondScore: number;
  };
  labelDrempels: {
    uitstekend: number;
    goed: number;
    redelijk: number;
  };
  uiLabelDrempels: {
    uitmuntend: number;
    uitstekend: number;
    goed: number;
    voldoende: number;
  };
  sterkePuntenDrempels: {
    semantisch: number;
    salaris: number;
    vaardigheden: number;
    beschikbaarheid: number;
  };
  aandachtspuntenDrempels: {
    semantisch: number;
    salaris: number;
    vaardigheden: number;
    beschikbaarheid: number;
  };
}

export interface MatchConfig {
  weights: MatchWeights;
  hardFilters: HardFilterConfig;
  scoring: ScoringConfig;
  apacRolGewichten: Record<string, APACRolGewichten>;
  apacLabels: Record<APACPillar, string>;
  apacKleuren: Record<APACPillar, string>;
  apacBeschrijvingen: Record<APACPillar, string>;
  roltypeZoektermen: Record<string, string[]>;
  cultuurPijlers: CultuurPijlerConfig[];
  disabledComponents: string[];
  defaults: {
    maxResults: number;
    rpcFetchLimit: number;
  };
}

// --- Configuratie ---

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  weights: {
    vaardigheden: 0.25,
    semantisch: 0.20,
    apac: 0.20,
    cultuur: 0.10,
    gesprek: 0.10,
    salaris: 0.10,
    beschikbaarheid: 0.05,
  },

  hardFilters: {
    minCosineSimilarity: 0.40,
    maxSalarisOverschrijding: 1.30,
    excludeNietBeschikbaar: true,
  },

  scoring: {
    neutralDefault: 0.5,
    salarisAfwijking: {
      band1Percentage: 0.15,
      band1Score: 0.7,
      band2Percentage: 0.30,
      band2Score: 0.3,
      beyondScore: 0.1,
    },
    labelDrempels: {
      uitstekend: 0.8,
      goed: 0.6,
      redelijk: 0.4,
    },
    uiLabelDrempels: {
      uitmuntend: 9,
      uitstekend: 8,
      goed: 7,
      voldoende: 5,
    },
    sterkePuntenDrempels: {
      semantisch: 0.7,
      salaris: 0.7,
      vaardigheden: 0.6,
      beschikbaarheid: 1.0,
    },
    aandachtspuntenDrempels: {
      semantisch: 0.5,
      salaris: 0.5,
      vaardigheden: 0.3,
      beschikbaarheid: 0.5,
    },
  },

  apacRolGewichten: {
    ai_engineer:        { adaptability: 1.3, personality: 1.2, awareness: 0.8, connection: 0.7 },
    ai_marketeer:       { adaptability: 1.1, personality: 1.4, awareness: 0.9, connection: 1.0 },
    ai_ethics_lead:     { adaptability: 0.8, personality: 0.9, awareness: 1.4, connection: 1.3 },
    ai_product_manager: { adaptability: 1.2, personality: 1.1, awareness: 1.0, connection: 1.2 },
    ai_data_analyst:    { adaptability: 1.0, personality: 1.3, awareness: 0.8, connection: 0.7 },
    ai_consultant:      { adaptability: 1.1, personality: 1.0, awareness: 1.2, connection: 1.4 },
    ai_trainer:         { adaptability: 0.9, personality: 1.1, awareness: 1.3, connection: 1.4 },
    interim_pm:         { adaptability: 1.0, personality: 0.9, awareness: 1.3, connection: 1.4 },
    _default:           { adaptability: 1.0, personality: 1.0, awareness: 1.0, connection: 1.0 },
  },

  apacLabels: {
    adaptability: "Adaptability",
    personality: "Personality",
    awareness: "Awareness",
    connection: "Connection",
  },

  apacKleuren: {
    adaptability: "#2ed573",
    personality: "#E6734F",
    awareness: "#3B82F6",
    connection: "#A855F7",
  },

  apacBeschrijvingen: {
    adaptability: "Cognitieve flexibiliteit, omgaan met onzekerheid",
    personality: "Analytisch, creatief, nieuwsgierig, groeimindset",
    awareness: "Emotionele intelligentie, ethisch bewustzijn",
    connection: "Zelfverbinding, teamverbinding, stabiliteit",
  },

  roltypeZoektermen: {
    ai_engineer: ["engineer", "developer"],
    ai_marketeer: ["market", "growth", "content"],
    ai_ethics_lead: ["ethics", "compliance", "responsible"],
    ai_product_manager: ["product manager", "product owner"],
    ai_data_analyst: ["data", "analyst", "bi"],
    ai_consultant: ["consult", "advisory"],
    ai_trainer: ["train", "coach", "learn"],
    interim_pm: ["project manager", "interim", "scrum"],
  },

  disabledComponents: [],

  cultuurPijlers: [
    { key: "innovatie", label: "Innovatie", apac_mapping: "adaptability", kleur: "#2ed573", gewicht: 1.0 },
    { key: "teamdynamiek", label: "Teamdynamiek", apac_mapping: "personality", kleur: "#E6734F", gewicht: 1.0 },
    { key: "bewustzijn", label: "Bewustzijn", apac_mapping: "awareness", kleur: "#3B82F6", gewicht: 1.0 },
    { key: "samenwerking", label: "Samenwerking", apac_mapping: "connection", kleur: "#A855F7", gewicht: 1.0 },
  ],

  defaults: {
    maxResults: 15,
    rpcFetchLimit: 50,
  },
};

// --- Helpers ---

export type MatchWeightKey = keyof MatchWeights;

export function normalizeWeights(
  weights: MatchWeights,
  disabledComponents: string[]
): MatchWeights {
  const result = { ...weights };

  for (const key of disabledComponents) {
    if (key in result) {
      result[key as MatchWeightKey] = 0;
    }
  }

  const activeSum = Object.values(result).reduce((s, v) => s + v, 0);
  if (activeSum === 0) return result;

  const scale = 1.0 / activeSum;
  for (const key of Object.keys(result) as MatchWeightKey[]) {
    result[key] = Math.round(result[key] * scale * 1000) / 1000;
  }

  return result;
}

export function getRoltypeOpties(): { value: string; label: string }[] {
  return Object.keys(DEFAULT_MATCH_CONFIG.apacRolGewichten)
    .filter((k) => k !== "_default")
    .map((k) => ({
      value: k,
      label: k
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
    }));
}
