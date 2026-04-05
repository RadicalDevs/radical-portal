"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { KanbanBoard } from "@/components/crm/kanban/KanbanBoard";
import { KanbanColumn } from "@/components/crm/kanban/KanbanColumn";
import { KanbanPhaseGroup } from "@/components/crm/kanban/KanbanPhaseGroup";
import { KanbanCard, KanbanCardOverlay } from "@/components/crm/kanban/KanbanCard";
import { Badge } from "@/components/crm/ui/Badge";

// ─── Pipeline stage config ──────────────────────────────────────────────────

type PipelineStage =
  | "sourcing"
  | "intake"
  | "voorgesteld"
  | "eerste_gesprek"
  | "tweede_gesprek"
  | "contractering"
  | "geplaatst"
  | "alumni";

interface StageConfig {
  key: PipelineStage;
  label: string;
  color: string;
}

interface PhaseGroup {
  key: string;
  label: string;
  color: string;
  borderColor: string;
  stages: StageConfig[];
}

const PHASES: PhaseGroup[] = [
  {
    key: "prospect",
    label: "Prospect",
    color: "#6B7280",
    borderColor: "#6B7280",
    stages: [
      { key: "sourcing", label: "Sourcing", color: "#9CA3AF" },
      { key: "intake", label: "Intake", color: "#60A5FA" },
    ],
  },
  {
    key: "in_selectie",
    label: "In Selectie",
    color: "#F59E0B",
    borderColor: "#F59E0B",
    stages: [
      { key: "voorgesteld", label: "Voorgesteld", color: "#A78BFA" },
      { key: "eerste_gesprek", label: "Eerste Gesprek", color: "#FBBF24" },
      { key: "tweede_gesprek", label: "Tweede Gesprek", color: "#F97316" },
    ],
  },
  {
    key: "radical",
    label: "Radical",
    color: "#2ed573",
    borderColor: "#2ed573",
    stages: [
      { key: "contractering", label: "Contractering", color: "#2ed573" },
      { key: "geplaatst", label: "Geplaatst", color: "#10B981" },
    ],
  },
  {
    key: "alumni",
    label: "Alumni",
    color: "#8B5CF6",
    borderColor: "#8B5CF6",
    stages: [
      { key: "alumni", label: "Alumni", color: "#8B5CF6" },
    ],
  },
];

const ALL_STAGES = PHASES.flatMap((p) => p.stages);

// Map stage → pool_status for auto-sync
const STAGE_TO_POOL: Record<PipelineStage, string> = {
  sourcing: "prospect",
  intake: "prospect",
  voorgesteld: "in_selectie",
  eerste_gesprek: "in_selectie",
  tweede_gesprek: "in_selectie",
  contractering: "radical",
  geplaatst: "radical",
  alumni: "alumni",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface KanbanKandidaat {
  id: string;
  voornaam: string;
  achternaam: string;
  pipeline_stage: PipelineStage;
  pool_status: string;
  vaardigheden: string[] | null;
  email: string | null;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function KandidatenPipelinePage() {
  const [kandidaten, setKandidaten] = useState<KanbanKandidaat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = useMemo(() => createClient(), []);

  const fetchKandidaten = useCallback(async () => {
    const { data, error } = await supabase
      .from("kandidaten")
      .select("id, voornaam, achternaam, pipeline_stage, pool_status, vaardigheden, email")
      .order("created_at", { ascending: false });

    if (error) console.error("[KandidatenKanban] fetch:", error.message);
    setKandidaten((data || []) as KanbanKandidaat[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchKandidaten();
  }, [fetchKandidaten]);

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel("kandidaten-kanban")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "kandidaten" },
        (payload) => {
          const updated = payload.new as KanbanKandidaat;
          setKandidaten((prev) =>
            prev.map((k) => (k.id === updated.id ? { ...k, ...updated } : k))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "kandidaten" },
        (payload) => {
          const inserted = payload.new as KanbanKandidaat;
          setKandidaten((prev) => [inserted, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Drag handler
  const handleDragEnd = async (kandidaatId: string, overId: string) => {
    let newStage: PipelineStage;

    const isStage = ALL_STAGES.some((s) => s.key === overId);
    if (isStage) {
      newStage = overId as PipelineStage;
    } else {
      const target = kandidaten.find((k) => k.id === overId);
      if (!target) return;
      newStage = target.pipeline_stage;
    }

    const kandidaat = kandidaten.find((k) => k.id === kandidaatId);
    if (!kandidaat || kandidaat.pipeline_stage === newStage) return;

    const newPoolStatus = STAGE_TO_POOL[newStage];

    // Optimistic update
    const previous = kandidaten;
    setKandidaten((prev) =>
      prev.map((k) =>
        k.id === kandidaatId
          ? { ...k, pipeline_stage: newStage, pool_status: newPoolStatus }
          : k
      )
    );

    const { error } = await supabase
      .from("kandidaten")
      .update({ pipeline_stage: newStage, pool_status: newPoolStatus })
      .eq("id", kandidaatId);

    if (error) {
      console.error("[KandidatenKanban] drag failed:", error);
      setKandidaten(previous);
    }
  };

  // Search
  const filtered = searchQuery.trim()
    ? kandidaten.filter((k) => {
        const q = searchQuery.toLowerCase();
        const naam = `${k.voornaam} ${k.achternaam}`.toLowerCase();
        const skills = (k.vaardigheden || []).join(" ").toLowerCase();
        return naam.includes(q) || skills.includes(q);
      })
    : kandidaten;

  // Drag overlay
  const renderOverlay = (activeId: string) => {
    const k = kandidaten.find((k) => k.id === activeId);
    if (!k) return null;
    return (
      <KanbanCardOverlay>
        <p className="text-sm font-semibold text-heading">
          {k.voornaam} {k.achternaam}
        </p>
      </KanbanCardOverlay>
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-surface-light" />
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="w-72 h-96 animate-pulse rounded-xl bg-surface-light" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-heading">Kandidaten Pipeline</h1>
          <p className="mt-1 text-sm text-muted">
            Sleep kandidaten tussen fases om hun positie in het recruitment proces te wijzigen
          </p>
        </div>
        <div className="flex items-center gap-4">
          {PHASES.map((phase) => {
            const count = filtered.filter((k) =>
              phase.stages.some((s) => s.key === k.pipeline_stage)
            ).length;
            return (
              <div key={phase.key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: phase.color }} />
                <span className="text-xs text-muted">{phase.label}</span>
                <span className="text-xs font-bold text-heading">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Zoek op naam of vaardigheden..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full max-w-md rounded-lg border border-surface-border bg-surface-light px-4 py-2 text-sm text-heading placeholder:text-muted outline-none focus:border-smaragd/50"
      />

      {/* Kanban */}
      <KanbanBoard onDragEnd={handleDragEnd} renderOverlay={renderOverlay}>
        {PHASES.map((phase) => (
          <KanbanPhaseGroup
            key={phase.key}
            label={phase.label}
            color={phase.color}
            borderColor={phase.borderColor}
          >
            {phase.stages.map((stage) => {
              const stageKandidaten = filtered.filter(
                (k) => k.pipeline_stage === stage.key
              );
              return (
                <KanbanColumn
                  key={stage.key}
                  id={stage.key}
                  title={stage.label}
                  color={stage.color}
                  count={stageKandidaten.length}
                >
                  {stageKandidaten.map((k) => (
                    <KanbanCard
                      key={k.id}
                      id={k.id}
                      onClick={() => {
                        window.location.href = `/admin/candidates?id=${k.id}`;
                      }}
                    >
                      <p className="text-sm font-semibold text-heading">
                        {k.voornaam} {k.achternaam}
                      </p>
                      {k.email && (
                        <p className="mt-0.5 text-xs text-muted truncate">{k.email}</p>
                      )}
                      {k.vaardigheden && k.vaardigheden.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {k.vaardigheden.slice(0, 2).map((v) => (
                            <Badge key={v} variant="default">
                              {v}
                            </Badge>
                          ))}
                          {k.vaardigheden.length > 2 && (
                            <span className="text-[10px] text-muted">
                              +{k.vaardigheden.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </KanbanCard>
                  ))}
                </KanbanColumn>
              );
            })}
          </KanbanPhaseGroup>
        ))}
      </KanbanBoard>
    </div>
  );
}
