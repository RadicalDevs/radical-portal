"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Klant } from "@/lib/types/crm";
import { CardGrid } from "@/components/crm/tables/CardGrid";
import { DataTable, type Column } from "@/components/crm/tables/DataTable";
import { SearchBar } from "@/components/crm/tables/SearchBar";
import { Button } from "@/components/crm/ui/Button";
import { EmptyState } from "@/components/crm/ui/EmptyState";
import { Skeleton } from "@/components/crm/ui/Skeleton";
import { ViewToggle } from "@/components/crm/ui/ViewToggle";
import { KlantFormModal } from "@/components/crm/forms/KlantFormModal";
import { getKlanten } from "@/app/admin/actions/klanten";

type ViewMode = "grid" | "list";

const TABLE_COLUMNS: Column<Klant>[] = [
  {
    key: "bedrijfsnaam",
    label: "Bedrijfsnaam",
    render: (k) => <span className="font-medium text-heading">{k.bedrijfsnaam}</span>,
  },
  {
    key: "kvk_nummer",
    label: "KVK",
    render: (k) => <span className="text-muted">{k.kvk_nummer || "—"}</span>,
  },
  {
    key: "btw_nummer",
    label: "BTW",
    render: (k) => <span className="text-muted">{k.btw_nummer || "—"}</span>,
  },
  {
    key: "betaalvoorwaarden",
    label: "Betaalvoorwaarden",
    render: (k) => <span className="text-muted">{k.betaalvoorwaarden || "—"}</span>,
  },
  {
    key: "created_at",
    label: "Aangemaakt",
    render: (k) => (
      <span className="text-xs text-muted">
        {new Date(k.created_at).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    ),
  },
];

interface Props {
  initialKlanten: Klant[];
}

export default function KlantenClient({ initialKlanten }: Props) {
  const router = useRouter();
  const [klanten, setKlanten] = useState<Klant[]>(initialKlanten);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const fresh = await getKlanten();
      setKlanten(fresh);
    });
  };

  const filtered = klanten.filter((k) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      k.bedrijfsnaam.toLowerCase().includes(q) ||
      k.kvk_nummer?.toLowerCase().includes(q) ||
      k.btw_nummer?.toLowerCase().includes(q) ||
      k.betaalvoorwaarden?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Klanten</h1>
          <p className="mt-1 text-sm text-muted">
            {klanten.length} klant{klanten.length !== 1 ? "en" : ""} in database
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nieuwe Klant</Button>
      </div>

      {/* Search + view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchBar
            placeholder="Zoek op bedrijfsnaam, KVK, BTW nummer..."
            onSearch={setSearchQuery}
          />
        </div>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      {searchQuery && (
        <p className="text-xs text-muted">
          {filtered.length} resultaat{filtered.length !== 1 ? "en" : ""}
        </p>
      )}

      {/* Content */}
      {isPending ? (
        <Skeleton variant={viewMode === "list" ? "table-row" : "card"} count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Geen klanten gevonden"
          description={
            searchQuery
              ? "Pas je zoekopdracht aan."
              : "Voeg een nieuwe klant toe om te beginnen."
          }
          action={
            !searchQuery ? (
              <Button onClick={() => setShowForm(true)}>+ Nieuwe Klant</Button>
            ) : undefined
          }
        />
      ) : viewMode === "grid" ? (
        <CardGrid
          items={filtered.map((k) => ({
            id: k.id,
            title: k.bedrijfsnaam,
            avatarName: k.bedrijfsnaam,
            accent: "#8B5CF6",
            details: [
              { label: "KVK", value: k.kvk_nummer || "—" },
              { label: "Betaalvoorwaarden", value: k.betaalvoorwaarden || "—" },
            ],
            onClick: () => router.push(`/admin/klanten/${k.id}`),
          }))}
          emptyMessage="Geen klanten gevonden"
        />
      ) : (
        <DataTable
          columns={TABLE_COLUMNS}
          data={filtered}
          keyExtractor={(k) => k.id}
          onRowClick={(k) => router.push(`/admin/klanten/${k.id}`)}
        />
      )}

      <KlantFormModal
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
