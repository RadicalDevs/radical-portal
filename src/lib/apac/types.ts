/**
 * APAC Types — Gekopieerd uit docs/crm-reference/lib/apac/types.ts
 * Source of truth: CRM project (src/lib/apac/processApacScores.ts)
 */

/** De vier APAC-dimensies met totaal punten per dimensie */
export interface ApacScores {
  adaptability: number;
  personality: number;
  awareness: number;
  connection: number;
}

/** Max punten per dimensie (dynamisch berekend uit apac_questions) */
export interface ApacMaxScores {
  adaptability: number;
  personality: number;
  awareness: number;
  connection: number;
}

/** Via welk kanaal zijn de APAC-scores binnengekomen */
export type ApacBron = "tally" | "portal" | "manual" | "typeform" | "crm";

/** De vier APAC dimensie-namen */
export type ApacDimension = keyof ApacScores;

export const APAC_DIMENSIONS: ApacDimension[] = [
  "adaptability",
  "personality",
  "awareness",
  "connection",
];

/**
 * Configuratie van De Poort, geladen uit de `poort_config` tabel.
 * - fase "learning": alle kandidaten komen door (drempels worden genegeerd)
 * - fase "active": drempelscores worden gehandhaafd
 */
export interface PoortConfig {
  fase: "learning" | "active";
  kandidaat_drempel: number;
  drempel_adaptability?: number | null;
  drempel_personality?: number | null;
  drempel_awareness?: number | null;
  drempel_connection?: number | null;
  drempel_gecombineerd?: number | null;
}

/** Uitkomst van de De Poort-beslissing */
export interface PoortDecision {
  leerfase: boolean;
  newPoolStatus: "pool" | "pending_review";
}

/** Kandidaatgegevens voor activiteiten-log en re-embedding */
export interface ApacKandidaatInput {
  voornaam: string;
  achternaam: string;
  vaardigheden?: string[];
  tags?: string[];
  beschikbaarheid?: boolean | null;
  opzegtermijn?: string;
  salarisindicatie?: number;
  uurtarief?: number;
  notities?: string;
}

/** Detail van een getriggerde veto vraag */
export interface VetoDetail {
  question_id: string;
  question_text: string;
  answer_value: number;
  answer_label: string;
}

export interface ProcessApacScoresInput {
  kandidaatId: string;
  kandidaat: ApacKandidaatInput;
  scores: ApacScores;
  bron: ApacBron;
  metadata?: Record<string, unknown>;
  vetoDetails?: VetoDetail[];
}

export interface ProcessApacScoresResult {
  kandidaat_id: string;
  scores: ApacScores;
  gecombineerd: number;
  leerfase: boolean;
  pool_status: "pool" | "pending_review";
  veto_getriggerd: boolean;
  veto_details: VetoDetail[];
}

export interface ValidateApacScoresResult {
  valid: boolean;
  errors: string[];
}

/** Configuratie van het APAC formulier (intro, dank je wel, notificaties) */
export interface ApacFormConfig {
  id: string;
  intro_title: string;
  intro_subtitle: string;
  intro_tagline: string;
  intro_body: string;
  rules_title: string;
  rules_items: { label: string; text: string; color: string }[];
  rules_footer: string;
  thankyou_title: string;
  thankyou_body: string;
  require_lastname: boolean;
  notification_emails: string[];
  show_comments_field: boolean;
  comments_field_label: string;
}
