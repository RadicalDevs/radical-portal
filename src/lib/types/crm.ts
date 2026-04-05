// =============================================================================
// CRM Types — Geporteerd vanuit radical-crm-app/src/lib/types/index.ts
// =============================================================================

// User & Auth — Portal rollen (niet CRM)
export type UserRole = "admin" | "candidate";

export interface UserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Klanten
export interface Klant {
  id: string;
  bedrijfsnaam: string;
  kvk_nummer?: string;
  btw_nummer?: string;
  betaalvoorwaarden?: string;
  sector?: string;
  notities?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Computed
  totale_omzet?: number;
  aantal_vacatures?: number;
}

export interface Contactpersoon {
  id: string;
  klant_id: string;
  naam: string;
  telefoon?: string;
  email?: string;
  functie?: string;
  is_primair: boolean;
  created_at: string;
}

// Kandidaten
export type PoolStatus = "prospect" | "in_selectie" | "radical" | "alumni";

export interface Kandidaat {
  id: string;
  voornaam: string;
  achternaam: string;
  telefoon?: string;
  email?: string;
  linkedin_url?: string;
  vaardigheden: string[];
  tags: string[];
  salarisindicatie?: number;
  uurtarief?: number;
  beschikbaarheid?: boolean | null;
  opzegtermijn?: string;
  cv_url?: string;
  notities?: string;
  pool_status: PoolStatus;
  apac_source?: "portal" | "tally" | "manual" | null;
  pipeline_status?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// Vacatures
export type VacatureStatus = "open" | "gesloten" | "on_hold";

export interface Vacature {
  id: string;
  functietitel: string;
  klant_id: string;
  beschrijving?: string;
  salaris_min?: number;
  salaris_max?: number;
  budget?: number;
  sector?: string;
  status: VacatureStatus;
  toegewezen_recruiter?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Computed
  aantal_voorgestelde_kandidaten?: number;
  // Relations
  klant?: Klant;
}

// Pipeline Types
export type PipelineType = "permanent" | "interim" | "project";

export type PipelinePhase =
  | "commercial"
  | "delivery"
  | "search_selection"
  | "contract_placement"
  | "post_placement"
  | "close";

export interface PipelineStageConfig {
  key: string;
  order: number;
  label: string;
  description: string;
  phase: PipelinePhase;
  isInvoiceTrigger: boolean;
  invoiceLabel?: string;
  isCloseStage: boolean;
}

export interface PhaseConfig {
  key: PipelinePhase;
  label: string;
  color: string;
  borderColor: string;
}

export interface PipelineConfig {
  type: PipelineType;
  label: string;
  description: string;
  phases: PhaseConfig[];
  stages: PipelineStageConfig[];
}

// Deals (unified pipeline tabel)
export interface Deal {
  id: string;
  pipeline_type: PipelineType;
  klant_id: string;
  contactpersoon_id?: string;
  stage: string;
  is_lost: boolean;
  potentiele_omzet?: number;
  fee_percentage?: number;
  marge?: number;
  sluitingsdatum?: string;
  startdatum?: string;
  einddatum?: string;
  notities?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  klant?: Klant;
  contactpersoon?: Contactpersoon;
}

// Kandidaat Plaatsingen (linking tabel: kandidaten ↔ deals)
export interface KandidaatPlaatsing {
  id: string;
  kandidaat_id: string;
  deal_id?: string;
  vacature_id?: string;
  status: KandidaatPlaatsingStatus;
  tarief?: number;
  fee?: number;
  startdatum?: string;
  notities?: string;
  created_at: string;
  updated_at: string;
  // Relations
  kandidaat?: Kandidaat;
  vacature?: Vacature;
  deal?: Deal;
}

export type KandidaatPlaatsingStatus =
  | "voorgesteld"
  | "in_gesprek"
  | "geselecteerd"
  | "geplaatst"
  | "afgewezen";

// Legacy types (backward compatibility)
export type KlantPipelineStage =
  | "lead"
  | "eerste_contact"
  | "afspraak"
  | "voorstel"
  | "deal_gesloten"
  | "afgewezen";

export interface KlantDeal {
  id: string;
  klant_id: string;
  contactpersoon_id?: string;
  stage: KlantPipelineStage;
  potentiele_omzet?: number;
  sluitingsdatum?: string;
  notities?: string;
  created_at: string;
  updated_at: string;
  klant?: Klant;
  contactpersoon?: Contactpersoon;
}

export type KandidaatPipelineStage =
  | "sourcing"
  | "intake"
  | "voorgesteld"
  | "eerste_gesprek"
  | "tweede_gesprek"
  | "contractering"
  | "geplaatst"
  | "alumni";

// Activiteiten
export type ActiviteitType =
  | "notitie"
  | "gespreksverslag"
  | "screening"
  | "voorstel"
  | "email"
  | "whatsapp"
  | "telefoon"
  | "afspraak"
  | "statuswijziging"
  | "systeem"
  | "apac";

export interface Activiteit {
  id: string;
  type: ActiviteitType;
  beschrijving: string;
  klant_id?: string;
  kandidaat_id?: string;
  vacature_id?: string;
  user_id: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Taken
export type TaakStatus = "open" | "in_progress" | "afgerond";
export type TaakPrioriteit = "laag" | "normaal" | "hoog" | "urgent";

export interface Taak {
  id: string;
  titel: string;
  beschrijving?: string;
  status: TaakStatus;
  prioriteit: TaakPrioriteit;
  deadline?: string;
  toegewezen_aan: string;
  aangemaakt_door: string;
  klant_id?: string;
  kandidaat_id?: string;
  vacature_id?: string;
  created_at: string;
  updated_at: string;
}

// Communicatie Templates
export type TemplateType = "email" | "whatsapp";
export type TemplateCategorie =
  | "algemeen"
  | "kandidaat_intro"
  | "klant_voorstel"
  | "interview_uitnodiging"
  | "afwijzing"
  | "follow_up"
  | "factuur"
  | "onboarding";

export interface CommunicatieTemplate {
  id: string;
  naam: string;
  type: TemplateType;
  categorie: TemplateCategorie;
  onderwerp?: string;
  inhoud: string;
  variabelen: string[];
  aangemaakt_door?: string;
  created_at: string;
  updated_at: string;
}

// Notificaties
export type NotificatieType = "info" | "taak" | "reminder" | "systeem";

export interface Notificatie {
  id: string;
  user_id: string;
  titel: string;
  bericht: string;
  type: NotificatieType;
  gelezen: boolean;
  link?: string;
  created_at: string;
}

// APAC Resultaten
export interface APACResultaat {
  id: string;
  kandidaat_id: string;
  beoordelaar_id?: string;
  adaptability: number;
  personality: number;
  awareness: number;
  connection: number;
  roltype?: string;
  notities?: string;
  created_at: string;
  updated_at: string;
}

// Dev Subscriptions
export type DevSubscriptionStatus = "actief" | "gepauzeerd" | "beeindigd";

export interface DevSubscription {
  id: string;
  kandidaat_id: string;
  klant_id: string;
  deal_id?: string;
  plaatsing_id?: string;
  bedrag_per_maand: number;
  startdatum: string;
  einddatum?: string;
  status: DevSubscriptionStatus;
  notities?: string;
  created_at: string;
  updated_at: string;
  // Joined
  kandidaat?: { voornaam: string; achternaam: string };
  klant?: { bedrijfsnaam: string };
}

// Facturatie
export type FactuurStatus = "concept" | "openstaand" | "betaald" | "vervallen";

export interface FactuurRegel {
  omschrijving: string;
  aantal: number;
  eenheidsprijs: number;
  btw_percentage: number;
}

export interface Factuur {
  id: string;
  factuurnummer: string;
  klant_id: string;
  vacature_id?: string;
  bedrag: number;
  btw_bedrag: number;
  totaal_bedrag: number;
  regels?: FactuurRegel[];
  status: FactuurStatus;
  factuurdatum: string;
  vervaldatum: string;
  betaaldatum?: string;
  notities?: string;
  created_at: string;
  updated_at: string;
  // Relations
  klant?: Klant;
}

// Matching Configuration
export interface MatchingConfigRow {
  id: string;
  scope_type: "global" | "roltype" | "sector";
  scope_key: string | null;
  weights: Record<string, number> | null;
  hard_filters: Record<string, unknown> | null;
  apac_gewichten: Record<string, number> | null;
  cultuur_gewichten: Record<string, number> | null;
  cultuur_defaults: Record<string, number> | null;
  defaults: Record<string, number> | null;
  disabled_components: string[] | null;
  updated_by: string | null;
  updated_at: string;
}

export interface MatchingRoltype {
  id: string;
  key: string;
  label: string;
  order: number;
  zoektermen?: string[];
}

export interface MatchingSector {
  id: string;
  key: string;
  label: string;
  order: number;
}

// Cultuur Assessment
export interface CultuurPijler {
  id: string;
  key: string;
  label: string;
  beschrijving?: string;
  apac_mapping?: string | null;
  kleur: string;
  order: number;
  created_at: string;
}

export interface KlantCultuurResultaat {
  id: string;
  klant_id: string;
  scores: Record<string, number>;
  bron: "ai_analyse" | "handmatig";
  onderbouwing?: Record<string, string> | null;
  geanalyseerde_activiteiten: number;
  beoordelaar_id?: string;
  notities?: string;
  created_at: string;
  updated_at: string;
}
