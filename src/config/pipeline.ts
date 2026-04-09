// =============================================================================
// Pipeline Configuratie — Geporteerd vanuit radical-crm-app/src/config/constants.ts
// Import paths aangepast van @/lib/types naar @/lib/types/crm
// =============================================================================

import type {
  PipelineType,
  PipelinePhase,
  PipelineStageConfig,
  PhaseConfig,
  PipelineConfig,
  KlantPipelineStage,
  KandidaatPipelineStage,
} from "@/lib/types/crm";

// =============================================================================
// PIPELINE KLEUREN
// =============================================================================

export const PHASE_COLORS = {
  commercial: { color: "#C4956A", border: "#A87A52", label: "Commercieel" },
  delivery: { color: "#2ed573", border: "#1DB954", label: "Uitvoering" },
  search_selection: { color: "#2ed573", border: "#1DB954", label: "Search & Selectie" },
  contract_placement: { color: "#2ed573", border: "#1DB954", label: "Contract & Plaatsing" },
  post_placement: { color: "#86EFAC", border: "#4ADE80", label: "Na Plaatsing" },
  close: { color: "#9CA3AF", border: "#6B7280", label: "Afsluiting" },
} as const;

export const INVOICE_TRIGGER_COLOR = "#1B4D3E";
export const CLOSE_STAGE_COLOR = "#9CA3AF";

// =============================================================================
// PIPELINE 1 — PERMANENTE WERVING (12 stages)
// =============================================================================

const PERMANENT_PHASES: PhaseConfig[] = [
  { key: "commercial", label: "Commercieel", color: PHASE_COLORS.commercial.color, borderColor: PHASE_COLORS.commercial.border },
  { key: "delivery", label: "Uitvoering", color: PHASE_COLORS.delivery.color, borderColor: PHASE_COLORS.delivery.border },
  { key: "post_placement", label: "Na Plaatsing", color: PHASE_COLORS.post_placement.color, borderColor: PHASE_COLORS.post_placement.border },
];

const PERMANENT_STAGES: PipelineStageConfig[] = [
  // COMMERCIEEL
  { key: "perm_01_lead", order: 1, label: "Lead", description: "Inbound / outbound / referral", phase: "commercial", isInvoiceTrigger: false, isCloseStage: false },
  { key: "perm_02_gekwalificeerd", order: 2, label: "Gekwalificeerd", description: "Rol, budget, urgentie gevalideerd", phase: "commercial", isInvoiceTrigger: false, isCloseStage: false },
  { key: "perm_03_pitch", order: 3, label: "Pitch / voorstel", description: "Fee %, garantievoorwaarden verstuurd", phase: "commercial", isInvoiceTrigger: false, isCloseStage: false },
  { key: "perm_04_opdracht_getekend", order: 4, label: "Opdracht getekend", description: "Factuur 1 — 25%", phase: "commercial", isInvoiceTrigger: true, invoiceLabel: "Factuur 1 — 25%", isCloseStage: false },
  // UITVOERING
  { key: "perm_05_intake", order: 5, label: "Intake & briefing", description: "APAC profiel opgebouwd", phase: "delivery", isInvoiceTrigger: false, isCloseStage: false },
  { key: "perm_06_sourcing", order: 6, label: "Sourcing & screening", description: "Longlist → APAC", phase: "delivery", isInvoiceTrigger: false, isCloseStage: false },
  { key: "perm_07_shortlist", order: 7, label: "Shortlist gepresenteerd", description: "3-5 Radicals + APAC rapporten", phase: "delivery", isInvoiceTrigger: false, isCloseStage: false },
  { key: "perm_08_gesprekken", order: 8, label: "Gesprekken", description: "Radical AI adviseert & debrieft", phase: "delivery", isInvoiceTrigger: false, isCloseStage: false },
  { key: "perm_09_aanbod", order: 9, label: "Aanbod & onderhandeling", description: "Radical AI bemiddelt", phase: "delivery", isInvoiceTrigger: false, isCloseStage: false },
  { key: "perm_10_contract", order: 10, label: "Contract getekend", description: "Factuur 2 — 75%", phase: "delivery", isInvoiceTrigger: true, invoiceLabel: "Factuur 2 — 75%", isCloseStage: false },
  // NA PLAATSING
  { key: "perm_11_garantie", order: 11, label: "Garantieperiode", description: "3-6 maanden monitoring", phase: "post_placement", isInvoiceTrigger: false, isCloseStage: false },
  { key: "perm_12_afgerond", order: 12, label: "Afgerond — gewonnen", description: "Plaatsing bevestigd", phase: "post_placement", isInvoiceTrigger: false, isCloseStage: true },
];

// =============================================================================
// PIPELINE 2 — INTERIM PLAATSING (12 stages)
// =============================================================================

const INTERIM_PHASES: PhaseConfig[] = [
  { key: "commercial", label: "Commercieel", color: PHASE_COLORS.commercial.color, borderColor: PHASE_COLORS.commercial.border },
  { key: "search_selection", label: "Search & Selectie", color: PHASE_COLORS.search_selection.color, borderColor: PHASE_COLORS.search_selection.border },
  { key: "contract_placement", label: "Contract & Plaatsing", color: PHASE_COLORS.contract_placement.color, borderColor: PHASE_COLORS.contract_placement.border },
];

const INTERIM_STAGES: PipelineStageConfig[] = [
  // COMMERCIEEL
  { key: "interim_01_lead", order: 1, label: "Lead", description: "Vaak hoge urgentie", phase: "commercial", isInvoiceTrigger: false, isCloseStage: false },
  { key: "interim_02_gekwalificeerd", order: 2, label: "Gekwalificeerd", description: "Tarief, duur, startdatum", phase: "commercial", isInvoiceTrigger: false, isCloseStage: false },
  { key: "interim_03_voorstel", order: 3, label: "Voorstel", description: "Marge, exclusiviteit besproken", phase: "commercial", isInvoiceTrigger: false, isCloseStage: false },
  // SEARCH & SELECTIE
  { key: "interim_04_intake", order: 4, label: "Intake & briefing", description: "Fast-track APAC: aanpassingsvermogen", phase: "search_selection", isInvoiceTrigger: false, isCloseStage: false },
  { key: "interim_05_sourcing", order: 5, label: "Sourcing & screening", description: "24-72u doorlooptijd", phase: "search_selection", isInvoiceTrigger: false, isCloseStage: false },
  { key: "interim_06_kandidaat", order: 6, label: "Kandidaat gepresenteerd", description: "1 voorkeur + backup", phase: "search_selection", isInvoiceTrigger: false, isCloseStage: false },
  { key: "interim_07_kennismaking", order: 7, label: "Kennismaking", description: "Meestal 1 ronde", phase: "search_selection", isInvoiceTrigger: false, isCloseStage: false },
  { key: "interim_08_geaccepteerd", order: 8, label: "Kandidaat geaccepteerd", description: "Klant bevestigt keuze", phase: "search_selection", isInvoiceTrigger: false, isCloseStage: false },
  // CONTRACT & PLAATSING
  { key: "interim_09_contract", order: 9, label: "Contract getekend", description: "Commerciële opdracht — op startdatum", phase: "contract_placement", isInvoiceTrigger: true, invoiceLabel: "Facturatie bij start", isCloseStage: false },
  { key: "interim_10_actief", order: 10, label: "Actieve opdracht", description: "Maandelijkse facturatiecyclus", phase: "contract_placement", isInvoiceTrigger: false, isCloseStage: false },
  { key: "interim_11_verlenging", order: 11, label: "Verlenging / afsluiting", description: "Bij 80% van termijn: verlengen of beëindigen", phase: "contract_placement", isInvoiceTrigger: false, isCloseStage: false },
  { key: "interim_12_afgerond", order: 12, label: "Afgerond — gewonnen", description: "Opdracht afgerond", phase: "contract_placement", isInvoiceTrigger: false, isCloseStage: true },
];

// =============================================================================
// PIPELINE 3 — PROJECT DETACHERING (11 stages)
// =============================================================================

const PROJECT_PHASES: PhaseConfig[] = [
  { key: "commercial", label: "Commercieel", color: PHASE_COLORS.commercial.color, borderColor: PHASE_COLORS.commercial.border },
  { key: "delivery", label: "Uitvoering", color: PHASE_COLORS.delivery.color, borderColor: PHASE_COLORS.delivery.border },
  { key: "close", label: "Afsluiting", color: PHASE_COLORS.close.color, borderColor: PHASE_COLORS.close.border },
];

const PROJECT_STAGES: PipelineStageConfig[] = [
  // COMMERCIEEL
  { key: "project_01_lead", order: 1, label: "Lead", description: "Vaak bestaande klant", phase: "commercial", isInvoiceTrigger: false, isCloseStage: false },
  { key: "project_02_gekwalificeerd", order: 2, label: "Gekwalificeerd", description: "Scope, deliverables, tijdlijn, budget", phase: "commercial", isInvoiceTrigger: false, isCloseStage: false },
  { key: "project_03_sow", order: 3, label: "SOW opgesteld", description: "Milestones, tarief, IP, aansprakelijkheid", phase: "commercial", isInvoiceTrigger: false, isCloseStage: false },
  { key: "project_04_contract", order: 4, label: "SOW / contract getekend", description: "Factuur 1 — 25%", phase: "commercial", isInvoiceTrigger: true, invoiceLabel: "Factuur 1 — 25%", isCloseStage: false },
  // UITVOERING
  { key: "project_05_toegewezen", order: 5, label: "Radical toegewezen", description: "Interne netwerk match", phase: "delivery", isInvoiceTrigger: false, isCloseStage: false },
  { key: "project_06_onboarding", order: 6, label: "Onboarding", description: "Briefing, governance afgesproken", phase: "delivery", isInvoiceTrigger: false, isCloseStage: false },
  { key: "project_07_actief", order: 7, label: "Project actief", description: "Milestone-voor-milestone tracking", phase: "delivery", isInvoiceTrigger: false, isCloseStage: false },
  { key: "project_08_review", order: 8, label: "Tussentijdse review", description: "Verlengen, scope aanpassen, of afsluiten", phase: "delivery", isInvoiceTrigger: false, isCloseStage: false },
  { key: "project_09_oplevering", order: 9, label: "Eindoplevering geaccepteerd", description: "Factuur 2 — 75%", phase: "delivery", isInvoiceTrigger: true, invoiceLabel: "Factuur 2 — 75%", isCloseStage: false },
  // AFSLUITING
  { key: "project_10_retrospective", order: 10, label: "Retrospective", description: "APAC notitie op Radical's profiel", phase: "close", isInvoiceTrigger: false, isCloseStage: false },
  { key: "project_11_afgerond", order: 11, label: "Afgerond — gewonnen", description: "Opgeleverd, gefactureerd, betaald", phase: "close", isInvoiceTrigger: false, isCloseStage: true },
];

// =============================================================================
// PIPELINE CONFIGS (centrale lookup)
// =============================================================================

export const PIPELINE_CONFIGS: Record<PipelineType, PipelineConfig> = {
  permanent: {
    type: "permanent",
    label: "Permanente Werving",
    description: "Vaste plaatsingen met garantieperiode",
    phases: PERMANENT_PHASES,
    stages: PERMANENT_STAGES,
  },
  interim: {
    type: "interim",
    label: "Interim Plaatsing",
    description: "Tijdelijke opdrachten op uurbasis",
    phases: INTERIM_PHASES,
    stages: INTERIM_STAGES,
  },
  project: {
    type: "project",
    label: "Project Detachering",
    description: "Projectmatige inzet met SOW",
    phases: PROJECT_PHASES,
    stages: PROJECT_STAGES,
  },
};

// =============================================================================
// UTILITY FUNCTIES
// =============================================================================

export function getStagesForPipeline(type: PipelineType): PipelineStageConfig[] {
  return PIPELINE_CONFIGS[type].stages;
}

export function getPhasesForPipeline(type: PipelineType): PhaseConfig[] {
  return PIPELINE_CONFIGS[type].phases;
}

export function getStageConfig(stageKey: string): PipelineStageConfig | undefined {
  for (const config of Object.values(PIPELINE_CONFIGS)) {
    const stage = config.stages.find((s) => s.key === stageKey);
    if (stage) return stage;
  }
  return undefined;
}

export function getPhaseForStage(stageKey: string): PhaseConfig | undefined {
  const stageConfig = getStageConfig(stageKey);
  if (!stageConfig) return undefined;

  const pipelineType = stageKey.split("_")[0] as "perm" | "interim" | "project";
  const typeMap: Record<string, PipelineType> = {
    perm: "permanent",
    interim: "interim",
    project: "project",
  };
  const config = PIPELINE_CONFIGS[typeMap[pipelineType]];
  return config?.phases.find((p) => p.key === stageConfig.phase);
}

export function getStagesByPhase(
  type: PipelineType,
  phase: PipelinePhase
): PipelineStageConfig[] {
  return PIPELINE_CONFIGS[type].stages.filter((s) => s.phase === phase);
}

// =============================================================================
// LEGACY CONSTANTS (backward compatibility)
// =============================================================================

export const KLANT_PIPELINE_STAGES: {
  key: KlantPipelineStage;
  label: string;
  color: string;
}[] = [
  { key: "lead", label: "Lead", color: "#9CA3AF" },
  { key: "eerste_contact", label: "Eerste Contact", color: "#60A5FA" },
  { key: "afspraak", label: "Afspraak", color: "#A78BFA" },
  { key: "voorstel", label: "Voorstel", color: "#FBBF24" },
  { key: "deal_gesloten", label: "Deal Gesloten", color: "#2ed573" },
  { key: "afgewezen", label: "Afgewezen", color: "#EF4444" },
];

export const KANDIDAAT_PIPELINE_STAGES: {
  key: KandidaatPipelineStage;
  label: string;
  color: string;
}[] = [
  { key: "sourcing", label: "Sourcing", color: "#9CA3AF" },
  { key: "intake", label: "Intake", color: "#60A5FA" },
  { key: "voorgesteld", label: "Voorgesteld bij Klant", color: "#A78BFA" },
  { key: "eerste_gesprek", label: "Eerste Gesprek", color: "#FBBF24" },
  { key: "tweede_gesprek", label: "Tweede Gesprek", color: "#F97316" },
  { key: "contractering", label: "Contractering", color: "#2ed573" },
  { key: "geplaatst", label: "Geplaatst", color: "#10B981" },
];
