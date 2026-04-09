"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import type { Taak, TaakStatus } from "@/lib/types/crm";
import { getTaken, updateTaakStatus, deleteTaak as deleteTaakAction } from "@/app/admin/actions/taken";
import { Badge } from "@/components/crm/ui/Badge";
import { Button } from "@/components/crm/ui/Button";
import { TaakFormModal } from "@/components/crm/forms/TaakFormModal";

const prioriteitVariant = (p: string) => {
  switch (p) {
    case "urgent": return "danger" as const;
    case "hoog": return "warning" as const;
    default: return "default" as const;
  }
};

const isOverdue = (deadline?: string) => {
  if (!deadline) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(deadline + "T00:00:00") < today;
};

interface TakenLijstProps {
  compact?: boolean;
  limit?: number;
  initialTaken?: Taak[];
}

export function TakenLijst({ compact = false, limit, initialTaken }: TakenLijstProps) {
  const [taken, setTaken] = useState<Taak[]>(initialTaken || []);
  const [loading, setLoading] = useState(!initialTaken);
  const [filter, setFilter] = useState<"open" | "in_progress" | "alle">("open");
  const [showForm, setShowForm] = useState(false);
  const [editTaak, setEditTaak] = useState<Taak | undefined>();
  const [, startTransition] = useTransition();

  const fetchTaken = useCallback(() => {
    setLoading(true);
    startTransition(async () => {
      const data = await getTaken(filter);
      setTaken(limit ? data.slice(0, limit) : data);
      setLoading(false);
    });
  }, [filter, limit]);

  useEffect(() => {
    fetchTaken();
  }, [fetchTaken]);

  const handleToggleStatus = (taak: Taak) => {
    const newStatus: TaakStatus =
      taak.status === "open" ? "in_progress"
      : taak.status === "in_progress" ? "afgerond"
      : "open";

    // Optimistic update
    setTaken((prev) =>
      newStatus === "afgerond"
        ? prev.filter((t) => t.id !== taak.id)
        : prev.map((t) => (t.id === taak.id ? { ...t, status: newStatus } : t))
    );

    startTransition(async () => {
      const result = await updateTaakStatus(taak.id, newStatus);
      if (result.error) fetchTaken();
    });
  };

  const handleDelete = (taak: Taak) => {
    if (!confirm(`Taak "${taak.titel}" verwijderen?`)) return;

    // Optimistic
    setTaken((prev) => prev.filter((t) => t.id !== taak.id));

    startTransition(async () => {
      const result = await deleteTaakAction(taak.id);
      if (result.error) fetchTaken();
    });
  };

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(["open", "in_progress", "alle"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  filter === f
                    ? "bg-smaragd/10 text-smaragd"
                    : "text-muted hover:bg-surface-light"
                }`}
              >
                {f === "open" ? "Open" : f === "in_progress" ? "In Progress" : "Alle"}
              </button>
            ))}
          </div>
          <Button variant="ghost" className="text-xs" onClick={() => { setEditTaak(undefined); setShowForm(true); }}>
            + Nieuwe Taak
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Laden...</p>
      ) : taken.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">
          {compact ? "Geen openstaande taken." : "Geen taken gevonden."}
        </p>
      ) : (
        <div className="space-y-2">
          {taken.map((taak) => (
            <div
              key={taak.id}
              className="flex items-center gap-3 rounded-xl bg-surface shadow-card px-4 py-3 cursor-default"
            >
              {/* Status toggle */}
              <button
                onClick={() => handleToggleStatus(taak)}
                title={taak.status === "open" ? "Start" : taak.status === "in_progress" ? "Voltooid" : "Heropen"}
                className={`h-5 w-5 flex-shrink-0 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                  taak.status === "in_progress"
                    ? "border-smaragd bg-smaragd text-white"
                    : "border-muted hover:border-smaragd"
                }`}
              >
                {taak.status === "in_progress" && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-heading truncate">{taak.titel}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant={prioriteitVariant(taak.prioriteit)}>
                    {taak.prioriteit}
                  </Badge>
                  {taak.deadline && (
                    <span className={`text-xs ${isOverdue(taak.deadline) ? "text-red-500 font-medium" : "text-muted"}`}>
                      {new Date(taak.deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                      {isOverdue(taak.deadline) && " ⚠"}
                    </span>
                  )}
                  {taak.beschrijving && !compact && (
                    <span className="text-xs text-muted truncate max-w-[200px]">{taak.beschrijving}</span>
                  )}
                </div>
              </div>

              {/* Edit + Delete */}
              {!compact && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => { setEditTaak(taak); setShowForm(true); }}
                    className="p-1.5 rounded-md text-muted hover:text-heading hover:bg-surface-light transition-colors"
                    title="Bewerken"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(taak)}
                    className="p-1.5 rounded-md text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Verwijderen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {compact && (
        <Button
          variant="ghost"
          className="text-xs w-full"
          onClick={() => { setEditTaak(undefined); setShowForm(true); }}
        >
          + Nieuwe Taak
        </Button>
      )}

      <TaakFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false);
          setEditTaak(undefined);
          fetchTaken();
        }}
        taak={editTaak}
      />
    </div>
  );
}
