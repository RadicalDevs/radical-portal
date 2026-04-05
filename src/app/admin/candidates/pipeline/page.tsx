"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { KandidaatPlaatsingStatus, PipelineType } from "@/lib/types/crm";
import { getStageConfig } from "@/config/pipeline";
import { Card } from "@/components/crm/ui/Card";
import { Badge } from "@/components/crm/ui/Badge";
import { PoolStatusBadge } from "@/components/crm/ui/PoolStatusBadge";
import { Skeleton } from "@/components/crm/ui/Skeleton";
import { EmptyState } from "@/components/crm/ui/EmptyState";
import type { PoolStatus } from "@/lib/types/crm";

interface PipelineEntry {
  id: string;
  status: KandidaatPlaatsingStatus;
  stage: string;
  kandidaat: {
    id: string;
    voornaam: string;
    achternaam: string;
    pool_status: PoolStatus;
  } | null;
  vacature: {
    id: string;
    functietitel: string;
    klant: { bedrijfsnaam: string } | null;
  } | null;
  deal: {
    id: string;
    stage: string;
    pipeline_type: PipelineType;
  } | null;
}

const STATUS_VARIANTS: Record<string, "smaragd" | "warning" | "coral" | "default" | "blue" | "purple"> = {
  voorgesteld: "blue",
  in_gesprek: "warning",
  geselecteerd: "purple",
  geplaatst: "smaragd",
  afgewezen: "coral",
};

const PIPELINE_LABELS: Record<string, string> = {
  permanent: "Permanent",
  interim: "Interim",
  project: "Project",
};

type StatusFilter = KandidaatPlaatsingStatus | null;
type TypeFilter = PipelineType | null;

export default function KandidaatPipelinePage() {
  const [entries, setEntries] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from("kandidaat_plaatsingen")
      .select(
        "id, status, stage, kandidaat:kandidaten(id, voornaam, achternaam, pool_status), vacature:vacatures(id, functietitel, klant:klanten(bedrijfsnaam)), deal:deals(id, stage, pipeline_type)"
      )
      .order("created_at", { ascending: false });

    if (error) console.error("[KandidaatPipeline] fetch error:", error.message);
    setEntries((data || []) as unknown as PipelineEntry[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const filtered = entries.filter((e) => {
    if (!e.kandidaat) return false;
    if (statusFilter && e.status !== statusFilter) return false;
    if (typeFilter && e.deal?.pipeline_type !== typeFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const naam = `${e.kandidaat.voornaam} ${e.kandidaat.achternaam}`.toLowerCase();
    const vacature = e.vacature?.functietitel?.toLowerCase() || "";
    const klant = e.vacature?.klant?.bedrijfsnaam?.toLowerCase() || "";
    return naam.includes(q) || vacature.includes(q) || klant.includes(q);
  });

  const stats = {
    totaal: entries.length,
    in_gesprek: entries.filter((e) => e.status === "in_gesprek").length,
    voorgesteld: entries.filter((e) => e.status === "voorgesteld").length,
    geplaatst: entries.filter((e) => e.status === "geplaatst").length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-heading">Pipeline Overzicht</h1>
        <p className="mt-1 text-sm text-muted">
          Alle kandidaten en hun huidige status per vacature
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Totaal", value: stats.totaal, color: "text-heading" },
          { label: "Voorgesteld", value: stats.voorgesteld, color: "text-blue-400" },
          { label: "In Gesprek", value: stats.in_gesprek, color: "text-amber-400" },
          { label: "Geplaatst", value: stats.geplaatst, color: "text-smaragd" },
        ].map((s) => (
          <Card key={s.label} padding="sm">
            <p className="text-xs text-muted">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Zoek op kandidaat, vacature of klant..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full rounded-lg border border-surface-border bg-surface-light px-4 py-2.5 text-sm text-heading placeholder:text-muted outline-none focus:border-smaragd/50"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted">Status</span>
          {([
            { label: "Alle", value: null },
            { label: "Voorgesteld", value: "voorgesteld" as KandidaatPlaatsingStatus },
            { label: "In Gesprek", value: "in_gesprek" as KandidaatPlaatsingStatus },
            { label: "Geselecteerd", value: "geselecteerd" as KandidaatPlaatsingStatus },
            { label: "Geplaatst", value: "geplaatst" as KandidaatPlaatsingStatus },
            { label: "Afgewezen", value: "afgewezen" as KandidaatPlaatsingStatus },
          ]).map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                statusFilter === opt.value
                  ? "border-smaragd bg-smaragd/10 text-smaragd"
                  : "border-surface-border bg-transparent text-muted hover:text-heading"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-surface-border" />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted">Type</span>
          {([
            { label: "Alle", value: null },
            { label: "Permanent", value: "permanent" as PipelineType },
            { label: "Interim", value: "interim" as PipelineType },
            { label: "Project", value: "project" as PipelineType },
          ]).map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setTypeFilter(opt.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                typeFilter === opt.value
                  ? "border-smaragd bg-smaragd/10 text-smaragd"
                  : "border-surface-border bg-transparent text-muted hover:text-heading"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton variant="table-row" count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Geen pipeline entries gevonden"
          description="Er zijn nog geen kandidaten gekoppeld aan vacatures."
        />
      ) : (
        <Card hover={false} padding="sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted">Kandidaat</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted">Pool</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted">Vacature</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted">Klant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted">Pipeline</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted">Deal Stage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const stageConfig = e.deal ? getStageConfig(e.deal.stage) : null;
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-surface-border transition-colors hover:bg-surface-light"
                    >
                      <td className="px-4 py-3">
                        <a
                          href={`/admin/candidates?id=${e.kandidaat!.id}`}
                          className="font-medium text-smaragd hover:underline"
                        >
                          {e.kandidaat!.voornaam} {e.kandidaat!.achternaam}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <PoolStatusBadge status={e.kandidaat!.pool_status || "prospect"} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[e.status] || "default"}>
                          {e.status === "in_gesprek" ? "In Gesprek" : e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {e.vacature ? (
                          <a
                            href={`/admin/vacatures/${e.vacature.id}`}
                            className="text-heading hover:text-smaragd hover:underline"
                          >
                            {e.vacature.functietitel}
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {e.vacature?.klant?.bedrijfsnaam || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {e.deal ? (
                          <Badge variant={e.deal.pipeline_type === "permanent" ? "blue" : e.deal.pipeline_type === "interim" ? "purple" : "warning"}>
                            {PIPELINE_LABELS[e.deal.pipeline_type] || e.deal.pipeline_type}
                          </Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        {stageConfig?.label || e.deal?.stage || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
