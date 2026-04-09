"use client";

import { useState, useEffect } from "react";
import { getKandidaatRapport } from "@/app/admin/actions/reports";
import type { KandidaatRapportRow, KandidaatRapport } from "@/lib/types/report";

const CONFIDENCE_BADGE: Record<string, string> = {
  hoog: "bg-smaragd/10 text-smaragd",
  gemiddeld: "bg-yellow-500/10 text-yellow-400",
  laag: "bg-surface-border text-muted",
};

export default function ReportSummaryInline({ kandidaatId }: { kandidaatId: string }) {
  const [rapport, setRapport] = useState<KandidaatRapportRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKandidaatRapport(kandidaatId)
      .then(setRapport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [kandidaatId]);

  if (loading) return null;

  const data = rapport?.secties as unknown as KandidaatRapport | null;
  if (!data?.executive_summary || rapport?.status !== "ready") {
    return (
      <div className="rounded-xl border border-dashed border-surface-border p-4 text-center">
        <p className="text-xs text-muted">Nog geen AI rapport gegenereerd.</p>
        <p className="text-[10px] text-muted/60 mt-1">Ga naar de Rapport tab om een verslag te genereren.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-smaragd/20 bg-gradient-to-br from-smaragd/5 to-transparent p-4 space-y-3">
      {/* Header: one-liner + confidence */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">AI Rapport</p>
          <p className="text-sm font-bold text-heading leading-snug">{data.scorecard.one_liner}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${CONFIDENCE_BADGE[data.scorecard.confidence_level] || ""}`}>
          {data.scorecard.confidence_level}
        </span>
      </div>

      {/* Kernwoorden */}
      <div className="flex flex-wrap gap-1">
        {data.scorecard.kernwoorden.map((kw) => (
          <span key={kw} className="rounded-full bg-smaragd/10 px-2 py-0.5 text-[10px] font-medium text-smaragd">
            {kw}
          </span>
        ))}
      </div>

      {/* Inzetbaarheid + data volledigheid */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted">Inzetbaarheid:</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`h-1.5 w-4 rounded-full ${n <= data.scorecard.inzetbaarheid ? "bg-smaragd" : "bg-surface-border"}`}
              />
            ))}
          </div>
        </div>
        <span className="text-[10px] text-muted">Data: {data.scorecard.data_volledigheid}%</span>
      </div>

      {/* Executive summary — full display */}
      <p className="text-sm text-heading/90 leading-relaxed whitespace-pre-line">
        {data.executive_summary}
      </p>

      {/* Overall assessment */}
      <p className="text-xs text-muted/70 italic pt-1 border-t border-surface-border/30">{data.scorecard.overall_assessment}</p>

      {/* Click hint */}
      <p className="text-[10px] text-smaragd/60 text-right">Klik voor volledig rapport →</p>
    </div>
  );
}
