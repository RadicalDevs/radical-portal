// =============================================================================
// Kandidaat Rapport Types
// =============================================================================

/** Sectie type — bepaalt de visuele weergave en icon */
export type SectieType =
  | "analyse"
  | "observatie"
  | "risico"
  | "kans"
  | "aanbeveling";

/** Confidence level — hoeveel data ondersteunt deze sectie */
export type ConfidenceLevel = "hoog" | "gemiddeld" | "laag";

/** Kwaliteit indicatie van het rapport */
export type KwaliteitIndicatie = "laag" | "gemiddeld" | "hoog";

/** Cross-source inzicht type */
export type InzichtType =
  | "tegenstrijdigheid"
  | "bevestiging"
  | "patroon"
  | "gap";

/** Rapport status */
export type RapportStatus = "generating" | "ready" | "error";

/** Bron type voor kandidaat data */
export type BronType = "cv_tekst" | "linkedin_profiel" | "transcriptie";

// ── Rapport Secties ──

export interface RapportSectie {
  titel: string;
  type: SectieType;
  inhoud: string;
  confidence: ConfidenceLevel;
  bronnen: string[];
}

export interface CrossSourceInzicht {
  inzicht: string;
  type: InzichtType;
  bronnen: string[];
}

export interface RecruiterScorecard {
  overall_assessment: string;
  inzetbaarheid: 1 | 2 | 3 | 4 | 5;
  data_volledigheid: number; // 0-100
  confidence_level: ConfidenceLevel;
  kernwoorden: string[];
  one_liner: string;
}

export interface RapportMeta {
  bronnen_gebruikt: string[];
  model: string;
  gegenereerd_op: string;
  versie: number;
}

// ── Hoofd Rapport Interface ──

export interface KandidaatRapport {
  executive_summary: string;
  secties: RapportSectie[];
  cross_source_inzichten: CrossSourceInzicht[];
  scorecard: RecruiterScorecard;
  meta: RapportMeta;
}

// ── Database Row Types ──

export interface KandidaatBrondataRow {
  id: string;
  kandidaat_id: string;
  bron_type: BronType;
  bron_label: string | null;
  inhoud: string;
  metadata: Record<string, unknown>;
  content_hash: string;
  created_at: string;
  updated_at: string;
}

export interface KandidaatRapportRow {
  id: string;
  kandidaat_id: string;
  rapport_versie: number;
  status: RapportStatus;
  secties: KandidaatRapport;
  brondata_hashes: string[];
  model_gebruikt: string | null;
  tokens_gebruikt: number | null;
  generatie_duur_ms: number | null;
  error_bericht: string | null;
  gegenereerd_op: string;
  created_at: string;
  updated_at: string;
}

export interface KandidaatTranscriptieRow {
  id: string;
  kandidaat_id: string;
  titel: string;
  transcript: string;
  bron: "handmatig" | "fireflies" | "carv";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RapportSettingsRow {
  id: string;
  auto_generatie: boolean;
  model_voorkeur: string;
  fallback_models: string[];
  updated_by: string | null;
  updated_at: string;
}

// ── Data Collectie Bundle ──

export interface KandidaatBrondataBundle {
  profiel: {
    voornaam: string;
    achternaam: string;
    email: string | null;
    telefoon: string | null;
    linkedin_url: string | null;
    vaardigheden: string[];
    tags: string[];
    beschikbaarheid: boolean | null;
    opzegtermijn: string | null;
    salarisindicatie: number | null;
    uurtarief: number | null;
  };
  apac: {
    adaptability: number;
    personality: number;
    awareness: number;
    connection: number;
    veto_getriggerd: boolean;
    veto_details: Array<{
      question_text: string;
      answer_label: string;
    }>;
  } | null;
  brondata: KandidaatBrondataRow[];
  transcripties: KandidaatTranscriptieRow[];
  notities: string[];
}

// ── Rapport Staleness ──

export interface RapportStaleness {
  hasReport: boolean;
  stale: boolean;
  lastGenerated: string | null;
  brondataCount: number;
  missingBronnen: string[];
  currentHashes: string[];
}
