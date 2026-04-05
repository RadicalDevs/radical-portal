"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PoolStatus } from "@/lib/types/crm";
import { KanbanBoard } from "@/components/crm/kanban/KanbanBoard";
import { KanbanColumn } from "@/components/crm/kanban/KanbanColumn";
import { KanbanCard, KanbanCardOverlay } from "@/components/crm/kanban/KanbanCard";
import { Badge } from "@/components/crm/ui/Badge";

// ─── Column config ──────────────────────────────────────────────────────────

interface ColumnConfig {
  key: PoolStatus;
  label: string;
  color: string;
}

const COLUMNS: ColumnConfig[] = [
  { key: "prospect",     label: "Prospect",     color: "#6B7280" },
  { key: "in_selectie",  label: "In Selectie",  color: "#F59E0B" },
  { key: "radical",      label: "Radical",       color: "#2ed573" },
  { key: "alumni",       label: "Alumni",        color: "#8B5CF6" },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface KanbanKandidaat {
  id: string;
  voornaam: string;
  achternaam: string;
  pool_status: PoolStatus;
  vaardigheden: string[] | null;
  tags: string[] | null;
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
      .select("id, voornaam, achternaam, pool_status, vaardigheden, tags, email")
      .order("created_at", { ascending: false });

    if (error) console.error("[KandidatenKanban] fetch:", error.message);
    setKandidaten((data || []) as KanbanKandidaat[]);
    setLoading(false);
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    fetchKandidaten();
  }, [fetchKandidaten]);

  // Realtime: auto-update when pool_status changes (e.g. from detail modal)
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

  // Drag handler — optimistic update + DB write
  const handleDragEnd = async (kandidaatId: string, overId: string) => {
    // overId could be a column key (pool_status) or another card id
    let newStatus: PoolStatus;
    const isColumn = COLUMNS.some((c) => c.key === overId);
    if (isColumn) {
      newStatus = overId as PoolStatus;
    } else {
      const targetKandidaat = kandidaten.find((k) => k.id === overId);
      if (!targetKandidaat) return;
      newStatus = targetKandidaat.pool_status;
    }

    const kandidaat = kandidaten.find((k) => k.id === kandidaatId);
    if (!kandidaat || kandidaat.pool_status === newStatus) return;

    // Optimistic update
    const previous = kandidaten;
    setKandidaten((prev) =>
      prev.map((k) =>
        k.id === kandidaatId ? { ...k, pool_status: newStatus } : k
      )
    );

    const { error } = await supabase
      .from("kandidaten")
      .update({ pool_status: newStatus })
      .eq("id", kandidaatId);

    if (error) {
      console.error("[KandidatenKanban] drag update failed:", error);
      setKandidaten(previous);
    }
  };

  // Search filter
  const filtered = searchQuery.trim()
    ? kandidaten.filter((k) => {
        const q = searchQuery.toLowerCase();
        const naam = `${k.voornaam} ${k.achternaam}`.toLowerCase();
        const skills = (k.vaardigheden || []).join(" ").toLowerCase();
        return naam.includes(q) || skills.includes(q);
      })
    : kandidaten;

  // Render drag overlay
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
          {COLUMNS.map((c) => (
            <div key={c.key} className="w-72 h-96 animate-pulse rounded-xl bg-surface-light" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Kandidaten Pipeline</h1>
          <p className="mt-1 text-sm text-muted">
            Sleep kandidaten tussen fases om hun status te wijzigen
          </p>
        </div>
        <div className="flex items-center gap-3">
          {COLUMNS.map((c) => {
            const count = filtered.filter((k) => k.pool_status === c.key).length;
            return (
              <div key={c.key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="text-xs text-muted">{count}</span>
              </div>
            );
          })}
          <span className="text-xs font-medium text-heading">{filtered.length} totaal</span>
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
        {COLUMNS.map((col) => {
          const columnKandidaten = filtered.filter((k) => k.pool_status === col.key);
          return (
            <KanbanColumn
              key={col.key}
              id={col.key}
              title={col.label}
              color={col.color}
              count={columnKandidaten.length}
            >
              {columnKandidaten.map((k) => (
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
                      {k.vaardigheden.slice(0, 3).map((v) => (
                        <Badge key={v} variant="default">
                          {v}
                        </Badge>
                      ))}
                      {k.vaardigheden.length > 3 && (
                        <span className="text-[10px] text-muted">
                          +{k.vaardigheden.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </KanbanCard>
              ))}
            </KanbanColumn>
          );
        })}
      </KanbanBoard>
    </div>
  );
}
