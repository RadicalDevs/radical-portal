"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { PIPELINE_CONFIGS } from "@/config/pipeline";
import type { PipelineType } from "@/lib/types/crm";

const MAANDEN = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

export type RapportageData = {
  omzetPerMaand: { maand: string; omzet: number }[];
  pipelinePermanent: { stage: string; count: number; color: string }[];
  pipelineInterim: { stage: string; count: number; color: string }[];
  pipelineProject: { stage: string; count: number; color: string }[];
  plaatsingenPerMaand: { maand: string; plaatsingen: number }[];
  kpis: {
    totaleOmzet: number;
    gemiddeldeTimeToHire: number;
    conversieRatio: number;
    openVacatures: number;
    actieveKandidaten: number;
    dealsPipeline: number;
  };
};

function buildPipelineChartData(
  deals: { stage: string; is_lost: boolean }[],
  pipelineType: PipelineType
): { stage: string; count: number; color: string }[] {
  const config = PIPELINE_CONFIGS[pipelineType];
  return config.stages.map((s) => {
    const phase = config.phases.find((p) => p.key === s.phase);
    return {
      stage: s.label,
      count: deals.filter((d) => d.stage === s.key && !d.is_lost).length,
      color: s.isInvoiceTrigger ? "#1B4D3E" : s.isCloseStage ? "#9CA3AF" : (phase?.color || "#9CA3AF"),
    };
  });
}

export async function getRapportageData(): Promise<RapportageData> {
  const db = createServiceClient();
  const currentYear = new Date().getFullYear();

  const [facturenRes, vacaturesRes, dealsRes, kandidatenRes] = await Promise.all([
    db.from("facturen").select("totaal_bedrag, status, factuurdatum").limit(2000),
    db.from("vacatures").select("id, status").limit(1000),
    db.from("deals").select("id, pipeline_type, stage, is_lost, created_at, updated_at").limit(2000),
    db.from("kandidaten").select("id").limit(5000),
  ]);

  const facturen = (facturenRes.data || []) as { totaal_bedrag: number; status: string; factuurdatum: string }[];
  const vacatures = (vacaturesRes.data || []) as { id: string; status: string }[];
  const deals = (dealsRes.data || []) as { id: string; pipeline_type: string; stage: string; is_lost: boolean; created_at: string; updated_at: string }[];
  const kandidaten = (kandidatenRes.data || []) as { id: string }[];

  // Omzet per maand (alleen betaalde facturen)
  const omzetPerMaand = MAANDEN.map((maand, i) => ({
    maand,
    omzet: facturen
      .filter((f) => {
        if (f.status !== "betaald" || !f.factuurdatum) return false;
        const d = new Date(f.factuurdatum);
        return d.getFullYear() === currentYear && d.getMonth() === i;
      })
      .reduce((sum, f) => sum + (f.totaal_bedrag || 0), 0),
  }));

  // Pipeline per type
  const pipelinePermanent = buildPipelineChartData(deals.filter((d) => d.pipeline_type === "permanent"), "permanent");
  const pipelineInterim = buildPipelineChartData(deals.filter((d) => d.pipeline_type === "interim"), "interim");
  const pipelineProject = buildPipelineChartData(deals.filter((d) => d.pipeline_type === "project"), "project");

  // Afgeronde deals per maand
  const afgerondeDeals = deals.filter((d) => d.stage.includes("afgerond") && !d.is_lost);
  const plaatsingenPerMaand = MAANDEN.map((maand, i) => ({
    maand,
    plaatsingen: afgerondeDeals.filter((d) => {
      const date = new Date(d.updated_at || d.created_at);
      return date.getFullYear() === currentYear && date.getMonth() === i;
    }).length,
  }));

  // KPIs
  const totaleOmzet = facturen
    .filter((f) => f.status === "betaald")
    .reduce((sum, f) => sum + (f.totaal_bedrag || 0), 0);

  const activeDeals = deals.filter((d) => !d.is_lost);
  const closedDeals = activeDeals.filter((d) => d.stage.includes("afgerond"));
  const conversieRatio = activeDeals.length > 0
    ? Math.round((closedDeals.length / activeDeals.length) * 100)
    : 0;
  const gemiddeldeTimeToHire = closedDeals.length > 0
    ? Math.round(
        closedDeals.reduce((sum, d) => {
          const start = new Date(d.created_at).getTime();
          const end = new Date(d.updated_at || d.created_at).getTime();
          return sum + (end - start) / (1000 * 60 * 60 * 24);
        }, 0) / closedDeals.length
      )
    : 0;

  return {
    omzetPerMaand,
    pipelinePermanent,
    pipelineInterim,
    pipelineProject,
    plaatsingenPerMaand,
    kpis: {
      totaleOmzet,
      gemiddeldeTimeToHire,
      conversieRatio,
      openVacatures: vacatures.filter((v) => v.status === "open").length,
      actieveKandidaten: kandidaten.length,
      dealsPipeline: activeDeals.filter((d) => !d.stage.includes("afgerond")).length,
    },
  };
}
