"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { VacatureWithKlant } from "@/app/admin/actions/vacatures";
import { getVacatures } from "@/app/admin/actions/vacatures";
import { CardGrid } from "@/components/crm/tables/CardGrid";
import { SearchBar } from "@/components/crm/tables/SearchBar";
import { Badge } from "@/components/crm/ui/Badge";
import { Button } from "@/components/crm/ui/Button";
import { EmptyState } from "@/components/crm/ui/EmptyState";
import { Skeleton } from "@/components/crm/ui/Skeleton";
import { VacatureFormModal } from "@/components/crm/forms/VacatureFormModal";

const STATUS_LABELS: Record<string, string> = {
  alle: "Alle",
  open: "Open",
  on_hold: "On Hold",
  gesloten: "Gesloten",
};

interface Props {
  initialVacatures: VacatureWithKlant[];
}

export default function VacaturesClient({ initialVacatures }: Props) {
  const router = useRouter();
  const [vacatures, setVacatures] = useState<VacatureWithKlant[]>(initialVacatures);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const fresh = await getVacatures();
      setVacatures(fresh);
    });
  };

  const filtered = vacatures.filter((v) => {
    if (statusFilter !== "alle" && v.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.functietitel.toLowerCase().includes(q) ||
        (v.klant?.bedrijfsnaam.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Vacatures</h1>
          <p className="mt-1 text-sm text-muted">
            {vacatures.length} vacature{vacatures.length !== 1 ? "s" : ""} in database
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nieuwe Vacature</Button>
      </div>

      {/* Search + status filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchBar
            placeholder="Zoek op functietitel of klant..."
            onSearch={setSearchQuery}
          />
        </div>
        <div className="flex gap-1">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                statusFilter === key
                  ? "bg-smaragd/10 text-smaragd"
                  : "text-muted hover:bg-surface-light"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {searchQuery && (
        <p className="text-xs text-muted">
          {filtered.length} resultaat{filtered.length !== 1 ? "en" : ""}
        </p>
      )}

      {/* Content */}
      {isPending ? (
        <Skeleton variant="card" count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Geen vacatures gevonden"
          description={
            searchQuery || statusFilter !== "alle"
              ? "Pas je zoekopdracht of filter aan."
              : "Voeg een nieuwe vacature toe om te beginnen."
          }
          action={
            !searchQuery && statusFilter === "alle" ? (
              <Button onClick={() => setShowForm(true)}>+ Nieuwe Vacature</Button>
            ) : undefined
          }
        />
      ) : (
        <CardGrid
          items={filtered.map((v) => ({
            id: v.id,
            title: v.functietitel,
            subtitle: v.klant?.bedrijfsnaam || undefined,
            accent: "#F59E0B",
            status: (
              <Badge
                variant={
                  v.status === "open"
                    ? "smaragd"
                    : v.status === "on_hold"
                    ? "warning"
                    : "default"
                }
              >
                {STATUS_LABELS[v.status] || v.status}
              </Badge>
            ),
            details: [
              {
                label: "Salarisrange",
                value:
                  v.salaris_min && v.salaris_max
                    ? `€${v.salaris_min.toLocaleString("nl-NL")} – €${v.salaris_max.toLocaleString("nl-NL")}`
                    : "—",
              },
              {
                label: "Aangemaakt",
                value: new Date(v.created_at).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
              },
            ],
            onClick: () => router.push(`/admin/vacatures/${v.id}`),
          }))}
          emptyMessage="Geen vacatures gevonden"
        />
      )}

      <VacatureFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          setShowForm(false);
          refresh();
        }}
      />
    </div>
  );
}
