"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FactuurWithKlant, DevSubscriptionWithRelations } from "@/app/admin/actions/facturatie";
import { getFacturen, updateFactuurStatusField } from "@/app/admin/actions/facturatie";
import { DataTable, type Column } from "@/components/crm/tables/DataTable";
import { SearchBar } from "@/components/crm/tables/SearchBar";
import { Badge } from "@/components/crm/ui/Badge";
import { Button } from "@/components/crm/ui/Button";
import { Card } from "@/components/crm/ui/Card";
import { EmptyState } from "@/components/crm/ui/EmptyState";
import { Skeleton } from "@/components/crm/ui/Skeleton";
import { FactuurFormModal } from "@/components/crm/forms/FactuurFormModal";

type ActiveTab = "facturen" | "subscriptions";

const STATUS_VARIANT: Record<string, "default" | "warning" | "smaragd" | "danger"> = {
  concept: "default",
  openstaand: "warning",
  betaald: "smaragd",
  vervallen: "danger",
};

const formatCurrency = (val: number | null | undefined) =>
  `€${(val ?? 0).toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`;

function SubscriptionsView({ subscriptions }: { subscriptions: DevSubscriptionWithRelations[] }) {
  const actief = subscriptions.filter((s) => s.status === "actief");
  const mrr = actief.reduce((sum, s) => sum + (s.bedrag_per_maand || 500), 0);
  const totalBilled = actief.reduce((sum, s) => {
    const months = Math.max(1, Math.ceil((Date.now() - new Date(s.startdatum).getTime()) / (1000 * 60 * 60 * 24 * 30)));
    return sum + months * (s.bedrag_per_maand || 500);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card padding="sm">
          <p className="text-xs text-body">Actieve Subscriptions</p>
          <p className="mt-1 text-lg font-bold text-smaragd">{actief.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-body">MRR (Monthly Recurring)</p>
          <p className="mt-1 text-lg font-bold text-smaragd">{formatCurrency(mrr)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-body">Totaal Gefactureerd (est.)</p>
          <p className="mt-1 text-lg font-bold text-heading">{formatCurrency(totalBilled)}</p>
        </Card>
      </div>

      {subscriptions.length === 0 ? (
        <EmptyState
          title="Geen Dev Subscriptions"
          description="Dev Subscriptions worden aangemaakt bij plaatsing van een Radical (€500/maand)."
        />
      ) : (
        <Card hover={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                {["Radical", "Klant", "Bedrag/mnd", "Sinds", "Status", "Maanden"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => {
                const months = Math.max(1, Math.ceil((Date.now() - new Date(s.startdatum).getTime()) / (1000 * 60 * 60 * 24 * 30)));
                const kNaam = s.kandidaat ? `${s.kandidaat.voornaam} ${s.kandidaat.achternaam}` : "—";
                return (
                  <tr key={s.id} className="border-b border-surface-border hover:bg-surface-light/50">
                    <td className="px-4 py-3 font-medium text-heading">{kNaam}</td>
                    <td className="px-4 py-3 text-body">{s.klant?.bedrijfsnaam || "—"}</td>
                    <td className="px-4 py-3 text-heading">{formatCurrency(s.bedrag_per_maand)}</td>
                    <td className="px-4 py-3 text-body">
                      {new Date(s.startdatum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === "actief" ? "smaragd" : s.status === "gepauzeerd" ? "warning" : "default"}>
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-body">{months}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

interface Props {
  initialFacturen: FactuurWithKlant[];
  initialSubscriptions: DevSubscriptionWithRelations[];
}

export default function FacturatieClient({ initialFacturen, initialSubscriptions }: Props) {
  const router = useRouter();
  const [facturen, setFacturen] = useState(initialFacturen);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("alle");
  const [activeTab, setActiveTab] = useState<ActiveTab>("facturen");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const fresh = await getFacturen();
      setFacturen(fresh);
    });
  };

  const filtered = facturen.filter((f) => {
    if (statusFilter !== "alle" && f.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return f.factuurnummer.toLowerCase().includes(q) || (f.klant?.bedrijfsnaam.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  const totaalOpenstaand = facturen.filter((f) => f.status === "openstaand").reduce((s, f) => s + (f.totaal_bedrag ?? 0), 0);
  const totaalBetaald = facturen.filter((f) => f.status === "betaald").reduce((s, f) => s + (f.totaal_bedrag ?? 0), 0);
  const totaalVervallen = facturen.filter((f) => f.status === "vervallen").reduce((s, f) => s + (f.totaal_bedrag ?? 0), 0);

  const handleCellEdit = async (itemId: string, field: string, value: string | number | string[]) => {
    await updateFactuurStatusField(itemId, field, String(value));
    refresh();
  };

  const columns: Column<FactuurWithKlant>[] = [
    {
      key: "factuurnummer",
      label: "Factuurnr",
      render: (f) => (
        <button onClick={() => router.push(`/admin/facturatie/${f.id}`)} className="font-medium text-smaragd hover:underline text-left">
          {f.factuurnummer}
        </button>
      ),
    },
    { key: "klant", label: "Klant", render: (f) => <span className="text-body">{f.klant?.bedrijfsnaam || "—"}</span> },
    {
      key: "totaal_bedrag",
      label: "Totaal",
      render: (f) => <span className="font-medium text-heading">{formatCurrency(f.totaal_bedrag)}</span>,
    },
    {
      key: "status",
      label: "Status",
      editable: true,
      editKey: "status",
      editType: "select",
      editOptions: [
        { value: "concept", label: "Concept" },
        { value: "openstaand", label: "Openstaand" },
        { value: "betaald", label: "Betaald" },
        { value: "vervallen", label: "Vervallen" },
      ],
      render: (f) => <Badge variant={STATUS_VARIANT[f.status] || "default"}>{f.status}</Badge>,
    },
    {
      key: "factuurdatum",
      label: "Datum",
      render: (f) => <span className="text-body">{new Date(f.factuurdatum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}</span>,
    },
    {
      key: "vervaldatum",
      label: "Vervaldatum",
      render: (f) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const isOverdue = f.status === "openstaand" && new Date(f.vervaldatum + "T00:00:00") < today;
        return (
          <span className={isOverdue ? "text-red-500 font-medium" : "text-body"}>
            {new Date(f.vervaldatum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Facturatie</h1>
          <p className="mt-1 text-sm text-muted">
            {facturen.length} factu{facturen.length !== 1 ? "ren" : "ur"} · {initialSubscriptions.filter((s) => s.status === "actief").length} actieve subscriptions
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nieuwe Factuur</Button>
      </div>

      {/* Tab toggle */}
      <div className="flex items-center gap-1 rounded-xl bg-surface-light p-1 w-fit">
        {(["facturen", "subscriptions"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-surface text-heading shadow-card"
                : "text-muted hover:text-heading"
            }`}
          >
            {tab === "facturen" ? "Facturen" : "Dev Subscriptions"}
          </button>
        ))}
      </div>

      {activeTab === "subscriptions" ? (
        <SubscriptionsView subscriptions={initialSubscriptions} />
      ) : (
        <>
          {/* Financial summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card padding="sm">
              <p className="text-xs text-body">Openstaand</p>
              <p className="mt-1 text-lg font-bold text-yellow-500">{formatCurrency(totaalOpenstaand)}</p>
            </Card>
            <Card padding="sm">
              <p className="text-xs text-body">Betaald</p>
              <p className="mt-1 text-lg font-bold text-smaragd">{formatCurrency(totaalBetaald)}</p>
            </Card>
            <Card padding="sm">
              <p className="text-xs text-body">Vervallen</p>
              <p className="mt-1 text-lg font-bold text-red-500">{formatCurrency(totaalVervallen)}</p>
            </Card>
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <SearchBar placeholder="Zoek op factuurnummer of klant..." onSearch={setSearchQuery} />
            </div>
            <div className="flex gap-1">
              {["alle", "concept", "openstaand", "betaald", "vervallen"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    statusFilter === s ? "bg-smaragd/10 text-smaragd" : "text-muted hover:bg-surface-light"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {isPending ? (
            <Skeleton variant="table-row" count={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Geen facturen gevonden"
              description="Maak je eerste factuur aan."
              action={<Button onClick={() => setShowForm(true)}>+ Nieuwe Factuur</Button>}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              keyExtractor={(f) => f.id}
              onCellEdit={handleCellEdit}
            />
          )}
        </>
      )}

      <FactuurFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => { setShowForm(false); refresh(); }}
      />
    </div>
  );
}
