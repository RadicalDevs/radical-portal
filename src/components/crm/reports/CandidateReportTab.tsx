"use client";

import { useState, useEffect, useCallback } from "react";
import { loadReportTabData } from "@/app/admin/actions/reports";
import type {
  KandidaatRapportRow,
  KandidaatBrondataRow,
  KandidaatTranscriptieRow,
  RapportStaleness,
  RapportSectie,
  KandidaatRapport,
} from "@/lib/types/report";
import DataSourcePanel from "./DataSourcePanel";

// ── Section type styling ──

const SECTION_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  analyse: { bg: "bg-blue-500/5", border: "border-blue-500/20", icon: "text-blue-400" },
  observatie: { bg: "bg-purple-500/5", border: "border-purple-500/20", icon: "text-purple-400" },
  risico: { bg: "bg-amber-500/5", border: "border-amber-500/20", icon: "text-amber-400" },
  kans: { bg: "bg-smaragd/5", border: "border-smaragd/20", icon: "text-smaragd" },
  aanbeveling: { bg: "bg-cyan-500/5", border: "border-cyan-500/20", icon: "text-cyan-400" },
};

const CONFIDENCE_BADGE: Record<string, string> = {
  hoog: "bg-smaragd/10 text-smaragd",
  gemiddeld: "bg-yellow-500/10 text-yellow-400",
  laag: "bg-red-500/10 text-red-400",
};

const INZICHT_STYLES: Record<string, string> = {
  tegenstrijdigheid: "border-l-red-400",
  bevestiging: "border-l-smaragd",
  patroon: "border-l-blue-400",
  gap: "border-l-amber-400",
};

// ── Main Component ──

export default function CandidateReportTab({
  kandidaatId,
  cvUrl,
}: {
  kandidaatId: string;
  cvUrl: string | null;
}) {
  const [rapport, setRapport] = useState<KandidaatRapportRow | null>(null);
  const [brondata, setBrondata] = useState<KandidaatBrondataRow[]>([]);
  const [transcripties, setTranscripties] = useState<KandidaatTranscriptieRow[]>([]);
  const [staleness, setStaleness] = useState<RapportStaleness | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      // Single server action call — avoids Supabase rate limits
      const data = await loadReportTabData(kandidaatId);
      setRapport(data.rapport);
      setBrondata(data.brondata);
      setTranscripties(data.transcripties);
      setStaleness(data.staleness);
    } catch {
      setError("Kon data niet laden");
    } finally {
      setLoading(false);
    }
  }, [kandidaatId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kandidaat_id: kandidaatId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Rapport generatie mislukt");
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-smaragd border-t-transparent" />
      </div>
    );
  }

  const rapportData = rapport?.secties as unknown as KandidaatRapport | null;
  const isReady = rapport?.status === "ready" && rapportData?.executive_summary;

  return (
    <div className="space-y-6">
      {/* Data Sources + Generate Button */}
      <div className="flex gap-6">
        <div className="w-72 shrink-0">
          <DataSourcePanel
            kandidaatId={kandidaatId}
            cvUrl={cvUrl}
            brondata={brondata}
            transcripties={transcripties}
            onDataChanged={loadData}
          />
        </div>

        <div className="flex-1">
          {/* Status bar */}
          <div className="mb-4 flex items-center gap-3">
            {staleness?.stale && staleness.hasReport && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                Nieuwe data beschikbaar
              </span>
            )}
            {rapport?.status === "error" && (
              <span className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-400">
                Fout: {rapport.error_bericht}
              </span>
            )}
            {isReady && rapport?.gegenereerd_op && (
              <span className="text-xs text-muted">
                Gegenereerd: {new Date(rapport.gegenereerd_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                {rapport.model_gebruikt && ` · ${rapport.model_gebruikt}`}
              </span>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || brondata.length === 0}
            className="rounded-lg bg-gradient-to-r from-smaragd to-smaragd/80 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-smaragd/20 hover:shadow-smaragd/30 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Rapport genereren...
              </span>
            ) : isReady ? (
              "Rapport opnieuw genereren"
            ) : (
              "Rapport genereren"
            )}
          </button>

          {brondata.length === 0 && (
            <p className="mt-2 text-xs text-muted">Voeg eerst data bronnen toe (CV, LinkedIn, of transcripties).</p>
          )}

          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      </div>

      {/* Report Content */}
      {isReady && rapportData && (
        <div className="space-y-6 border-t border-surface-border pt-6">
          {/* Scorecard */}
          <div className="rounded-xl border border-smaragd/20 bg-gradient-to-br from-smaragd/5 to-transparent p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-heading">{rapportData.scorecard.one_liner}</p>
                <p className="mt-1 text-sm text-muted">{rapportData.scorecard.overall_assessment}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CONFIDENCE_BADGE[rapportData.scorecard.confidence_level] || ""}`}>
                  {rapportData.scorecard.confidence_level} confidence
                </span>
                <span className="text-xs text-muted">
                  Data: {rapportData.scorecard.data_volledigheid}%
                </span>
              </div>
            </div>

            {/* Kernwoorden */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {rapportData.scorecard.kernwoorden.map((kw) => (
                <span key={kw} className="rounded-full bg-smaragd/10 px-2.5 py-0.5 text-xs font-medium text-smaragd">
                  {kw}
                </span>
              ))}
            </div>

            {/* Inzetbaarheid */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted">Inzetbaarheid:</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`h-2 w-5 rounded-full ${n <= rapportData.scorecard.inzetbaarheid ? "bg-smaragd" : "bg-surface-border"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="rounded-xl border border-surface-border bg-surface p-5">
            <h4 className="text-sm font-semibold text-heading uppercase tracking-wide mb-3">Executive Summary</h4>
            <p className="text-sm text-heading leading-relaxed whitespace-pre-line">{rapportData.executive_summary}</p>
          </div>

          {/* Dynamic Sections — filter out low-confidence sections */}
          {rapportData.secties
          .filter((s: RapportSectie) => s.confidence !== "laag")
          .map((sectie: RapportSectie, i: number) => {
            // If a "risico" section says there are no flags, show it as neutral/positive
            const isPositiveRisico = sectie.type === "risico" && /geen (rode vlaggen|aandachtspunten|risico)/i.test(sectie.inhoud);
            const style = isPositiveRisico
              ? { bg: "bg-smaragd/5", border: "border-smaragd/20", icon: "text-smaragd" }
              : (SECTION_STYLES[sectie.type] || SECTION_STYLES.analyse);
            return (
              <div key={i} className={`rounded-xl border ${style.border} ${style.bg} p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <h4 className={`text-sm font-semibold ${style.icon}`}>{sectie.titel}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CONFIDENCE_BADGE[sectie.confidence] || ""}`}>
                      {sectie.confidence}
                    </span>
                    <span className="rounded-full bg-surface-border/50 px-2 py-0.5 text-[10px] text-muted">
                      {sectie.type}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-heading leading-relaxed whitespace-pre-line">{sectie.inhoud}</p>
                {sectie.bronnen.length > 0 && (
                  <div className="mt-3 flex gap-1">
                    {sectie.bronnen.map((b) => (
                      <span key={b} className="rounded bg-surface-border/30 px-1.5 py-0.5 text-[10px] text-muted">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Cross-source Inzichten */}
          {rapportData.cross_source_inzichten?.length > 0 && (
            <div className="rounded-xl border border-surface-border bg-surface p-5">
              <h4 className="text-sm font-semibold text-heading uppercase tracking-wide mb-3">Cross-Source Inzichten</h4>
              <div className="space-y-2">
                {rapportData.cross_source_inzichten.map((inzicht, i) => (
                  <div key={i} className={`border-l-2 ${INZICHT_STYLES[inzicht.type] || "border-l-muted"} pl-3 py-1`}>
                    <p className="text-sm text-heading">{inzicht.inzicht}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted capitalize">{inzicht.type}</span>
                      {inzicht.bronnen.map((b) => (
                        <span key={b} className="text-[10px] text-muted/60">{b}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="text-xs text-muted/60 text-right">
            v{rapportData.meta.versie} · {rapportData.meta.model} · {rapportData.meta.bronnen_gebruikt.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}
