"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FactuurWithKlant } from "@/app/admin/actions/facturatie";
import { updateFactuurStatus, deleteFactuur, getFactuur } from "@/app/admin/actions/facturatie";
import type { FactuurRegel, FactuurStatus } from "@/lib/types/crm";
import { Card } from "@/components/crm/ui/Card";
import { Badge } from "@/components/crm/ui/Badge";
import { Button } from "@/components/crm/ui/Button";
import { FactuurFormModal } from "@/components/crm/forms/FactuurFormModal";
import { generateFactuurPDF } from "@/lib/utils/pdf-export";

const STATUS_VARIANT: Record<string, "default" | "warning" | "smaragd" | "danger"> = {
  concept: "default",
  openstaand: "warning",
  betaald: "smaragd",
  vervallen: "danger",
};

const formatCurrency = (val: number) =>
  `€${val.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`;

interface Props {
  factuur: FactuurWithKlant;
}

export default function FactuurDetailClient({ factuur: initialFactuur }: Props) {
  const router = useRouter();
  const [factuur, setFactuur] = useState(initialFactuur);
  const [showEdit, setShowEdit] = useState(false);
  const [, startTransition] = useTransition();

  const refreshFactuur = () => {
    startTransition(async () => {
      const fresh = await getFactuur(factuur.id);
      if (fresh) setFactuur(fresh);
    });
  };

  const handleUpdateStatus = async (newStatus: FactuurStatus) => {
    const result = await updateFactuurStatus(factuur.id, newStatus);
    if (!result.error) {
      if (newStatus === "betaald") {
        fetch("/api/notificatie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "factuur_betaald",
            factuur_nummer: factuur.factuurnummer,
            klant_naam: factuur.klant?.bedrijfsnaam || "—",
            bedrag: factuur.totaal_bedrag,
          }),
        }).catch(() => {});
      }
      refreshFactuur();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Weet je zeker dat je deze factuur wilt verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    const result = await deleteFactuur(factuur.id);
    if (!result.error) router.push("/admin/facturatie");
  };

  const regels: FactuurRegel[] = factuur.regels?.length
    ? (factuur.regels as FactuurRegel[])
    : [{ omschrijving: "Recruitment diensten", aantal: 1, eenheidsprijs: factuur.bedrag, btw_percentage: 21 }];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <button
            onClick={() => router.push("/admin/facturatie")}
            className="text-sm text-muted hover:text-heading transition-colors"
          >
            ← Facturatie
          </button>
          <h1 className="mt-1 text-2xl font-bold text-heading">{factuur.factuurnummer}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => window.print()}>Print</Button>
          <Button
            variant="secondary"
            onClick={() => generateFactuurPDF(factuur as Parameters<typeof generateFactuurPDF>[0])}
          >
            Download PDF
          </Button>
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Bewerken</Button>
          <Button variant="danger" onClick={handleDelete}>Verwijderen</Button>
        </div>
      </div>

      {/* Status actions */}
      <div className="flex items-center gap-3 flex-wrap print:hidden">
        <Badge variant={STATUS_VARIANT[factuur.status] || "default"}>{factuur.status}</Badge>
        {factuur.status === "concept" && (
          <Button variant="secondary" className="text-sm" onClick={() => handleUpdateStatus("openstaand")}>
            Markeer als Openstaand
          </Button>
        )}
        {factuur.status === "openstaand" && (
          <>
            <Button className="text-sm" onClick={() => handleUpdateStatus("betaald")}>
              Markeer als Betaald
            </Button>
            <Button variant="danger" className="text-sm" onClick={() => handleUpdateStatus("vervallen")}>
              Markeer als Vervallen
            </Button>
          </>
        )}
        {factuur.status === "vervallen" && (
          <Button className="text-sm" onClick={() => handleUpdateStatus("betaald")}>
            Alsnog Betaald
          </Button>
        )}
      </div>

      {/* Printable invoice card */}
      <Card padding="lg" className="print:shadow-none print:border-0">
        {/* Invoice header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold text-smaragd">radicalAI</h2>
            <p className="text-sm text-body mt-1">Recruitment Bureau</p>
          </div>
          <div className="text-right">
            <h3 className="text-xl font-bold text-heading">FACTUUR</h3>
            <p className="text-sm text-body mt-1">{factuur.factuurnummer}</p>
          </div>
        </div>

        {/* Client & dates */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Factuur aan</p>
            <p className="text-sm font-medium text-heading">{factuur.klant?.bedrijfsnaam}</p>
            {factuur.klant?.kvk_nummer && <p className="text-xs text-body">KVK: {factuur.klant.kvk_nummer}</p>}
            {factuur.klant?.btw_nummer && <p className="text-xs text-body">BTW: {factuur.klant.btw_nummer}</p>}
          </div>
          <div className="text-right space-y-1">
            {[
              ["Factuurdatum:", new Date(factuur.factuurdatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })],
              ["Vervaldatum:", new Date(factuur.vervaldatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })],
              ...(factuur.betaaldatum ? [["Betaald op:", new Date(factuur.betaaldatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex justify-end gap-4">
                <span className="text-xs text-muted">{label}</span>
                <span className="text-sm text-heading">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Line items */}
        <div className="border-t border-b border-surface-border py-4 mb-4">
          <div
            className="grid gap-4 text-xs font-medium text-muted uppercase tracking-wider mb-3"
            style={{ gridTemplateColumns: "1fr 60px 100px 60px 100px" }}
          >
            <span>Omschrijving</span>
            <span className="text-center">Aantal</span>
            <span className="text-right">Eenheidsprijs</span>
            <span className="text-center">BTW</span>
            <span className="text-right">Totaal</span>
          </div>
          <div className="space-y-2">
            {regels.map((r, i) => (
              <div key={i} className="grid gap-4 text-sm" style={{ gridTemplateColumns: "1fr 60px 100px 60px 100px" }}>
                <span className="text-heading">{r.omschrijving}</span>
                <span className="text-center text-body">{r.aantal}</span>
                <span className="text-right text-body">{formatCurrency(r.eenheidsprijs)}</span>
                <span className="text-center text-body">{r.btw_percentage}%</span>
                <span className="text-right font-medium text-heading">{formatCurrency(r.aantal * r.eenheidsprijs)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-body">Subtotaal</span>
              <span className="text-heading">{formatCurrency(factuur.bedrag)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-body">BTW</span>
              <span className="text-heading">{formatCurrency(factuur.btw_bedrag)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-surface-border pt-2">
              <span className="text-heading">Totaal</span>
              <span className="text-smaragd">{formatCurrency(factuur.totaal_bedrag)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {factuur.notities && (
          <div className="mt-8 pt-4 border-t border-surface-border">
            <p className="text-xs text-muted mb-1">Notities</p>
            <p className="text-sm text-body whitespace-pre-wrap">{factuur.notities}</p>
          </div>
        )}
      </Card>

      <FactuurFormModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onSuccess={() => { setShowEdit(false); refreshFactuur(); }}
        factuur={factuur}
      />
    </div>
  );
}
