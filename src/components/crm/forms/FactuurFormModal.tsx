"use client";

import { useState, useEffect } from "react";
import type { FactuurRegel } from "@/lib/types/crm";
import type { FactuurWithKlant } from "@/app/admin/actions/facturatie";
import { createFactuur, updateFactuur, getKlantenVoorFactuur } from "@/app/admin/actions/facturatie";
import { Modal } from "@/components/crm/ui/Modal";
import { Input } from "@/components/crm/ui/Input";
import { Textarea } from "@/components/crm/ui/Textarea";
import { Select } from "@/components/crm/ui/Select";
import { Button } from "@/components/crm/ui/Button";

interface FactuurFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  factuur?: FactuurWithKlant;
  preselectedKlantId?: string;
  initialRegels?: FactuurRegel[];
  initialNotities?: string;
}

const emptyRegel = (): FactuurRegel => ({
  omschrijving: "",
  aantal: 1,
  eenheidsprijs: 0,
  btw_percentage: 21,
});

function generateFactuurnummer(): string {
  const year = new Date().getFullYear();
  const nr = String(Date.now() % 100000).padStart(5, "0");
  return `RAD-${year}-${nr}`;
}

export function FactuurFormModal({
  isOpen,
  onClose,
  onSuccess,
  factuur,
  preselectedKlantId,
  initialRegels,
  initialNotities,
}: FactuurFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [klanten, setKlanten] = useState<{ id: string; bedrijfsnaam: string }[]>([]);
  const [regels, setRegels] = useState<FactuurRegel[]>([emptyRegel()]);
  const isEdit = !!factuur;

  useEffect(() => {
    if (isOpen) {
      if (factuur?.regels?.length) {
        setRegels(factuur.regels as FactuurRegel[]);
      } else if (initialRegels?.length) {
        setRegels(initialRegels);
      } else {
        setRegels([emptyRegel()]);
      }
      setError(null);
      getKlantenVoorFactuur().then(setKlanten).catch(() => setError("Kon klanten niet laden."));
    }
  }, [isOpen, factuur, initialRegels]);

  const subtotaal = regels.reduce((s, r) => s + r.aantal * r.eenheidsprijs, 0);
  const btwBedrag = regels.reduce(
    (s, r) => s + r.aantal * r.eenheidsprijs * (r.btw_percentage / 100),
    0
  );
  const totaalBedrag = subtotaal + btwBedrag;

  const addRegel = () => setRegels((prev) => [...prev, emptyRegel()]);
  const removeRegel = (i: number) => setRegels((prev) => prev.filter((_, idx) => idx !== i));
  const updateRegel = (i: number, field: keyof FactuurRegel, raw: string) => {
    setRegels((prev) =>
      prev.map((r, idx) =>
        idx === i
          ? { ...r, [field]: field === "omschrijving" ? raw : Number(raw) || 0 }
          : r
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);

    const result = isEdit
      ? await updateFactuur(factuur!.id, formData, regels)
      : await createFactuur(formData, regels);

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
    }
  };

  const fmt = (v: number) =>
    `€${v.toLocaleString("nl-NL", { minimumFractionDigits: 2 })}`;
  const today = new Date().toISOString().split("T")[0];
  const defaultVervaldatum = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Factuur Bewerken" : "Nieuwe Factuur"}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Factuurnummer"
            name="factuurnummer"
            defaultValue={factuur?.factuurnummer || generateFactuurnummer()}
            required
          />
          <Select
            label="Klant"
            name="klant_id"
            defaultValue={factuur?.klant_id || preselectedKlantId || ""}
            placeholder="Selecteer een klant..."
            options={klanten.map((k) => ({ value: k.id, label: k.bedrijfsnaam }))}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Factuurdatum"
            name="factuurdatum"
            type="date"
            defaultValue={factuur?.factuurdatum || today}
            required
          />
          <Input
            label="Vervaldatum"
            name="vervaldatum"
            type="date"
            defaultValue={factuur?.vervaldatum || defaultVervaldatum}
            required
          />
          <Select
            label="Status"
            name="status"
            defaultValue={factuur?.status || "concept"}
            options={[
              { value: "concept", label: "Concept" },
              { value: "openstaand", label: "Openstaand" },
              { value: "betaald", label: "Betaald" },
              { value: "vervallen", label: "Vervallen" },
            ]}
          />
        </div>

        {/* Factuurregels */}
        <div>
          <p className="block text-sm font-medium text-body mb-2">Factuurregels</p>
          <div className="rounded-xl border border-surface-border overflow-hidden">
            {/* Header */}
            <div
              className="grid gap-2 px-3 py-2 bg-surface-light text-xs font-medium text-muted uppercase tracking-wider"
              style={{ gridTemplateColumns: "1fr 72px 120px 76px 88px 28px" }}
            >
              <span>Omschrijving</span>
              <span className="text-center">Aantal</span>
              <span className="text-right">Eenheidsprijs</span>
              <span className="text-center">BTW</span>
              <span className="text-right">Totaal</span>
              <span />
            </div>

            {/* Regels */}
            <div className="divide-y divide-surface-border">
              {regels.map((r, i) => {
                const regelTotaal = r.aantal * r.eenheidsprijs;
                return (
                  <div
                    key={i}
                    className="grid gap-2 px-3 py-2 items-center"
                    style={{ gridTemplateColumns: "1fr 72px 120px 76px 88px 28px" }}
                  >
                    <input
                      type="text"
                      value={r.omschrijving}
                      onChange={(e) => updateRegel(i, "omschrijving", e.target.value)}
                      placeholder="Omschrijving..."
                      className="rounded-lg border border-surface-border bg-page px-2 py-1.5 text-sm text-heading outline-none focus:border-smaragd/50 w-full"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.aantal}
                      onChange={(e) => updateRegel(i, "aantal", e.target.value)}
                      className="rounded-lg border border-surface-border bg-page px-2 py-1.5 text-sm text-heading text-center outline-none focus:border-smaragd/50 w-full"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.eenheidsprijs}
                      onChange={(e) => updateRegel(i, "eenheidsprijs", e.target.value)}
                      className="rounded-lg border border-surface-border bg-page px-2 py-1.5 text-sm text-heading text-right outline-none focus:border-smaragd/50 w-full"
                    />
                    <select
                      value={r.btw_percentage}
                      onChange={(e) => updateRegel(i, "btw_percentage", e.target.value)}
                      className="rounded-lg border border-surface-border bg-page px-2 py-1.5 text-sm text-heading text-center outline-none focus:border-smaragd/50 w-full"
                    >
                      <option value={0}>0%</option>
                      <option value={9}>9%</option>
                      <option value={21}>21%</option>
                    </select>
                    <span className="text-sm text-right font-medium text-heading">
                      {fmt(regelTotaal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRegel(i)}
                      disabled={regels.length === 1}
                      className="flex items-center justify-center rounded text-muted hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-surface-border px-3 py-2">
              <button type="button" onClick={addRegel} className="text-xs text-smaragd hover:underline">
                + Regel toevoegen
              </button>
            </div>
          </div>

          {/* Totalen */}
          <div className="mt-3 flex justify-end">
            <div className="w-56 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-body">Subtotaal</span>
                <span className="text-heading">{fmt(subtotaal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body">BTW</span>
                <span className="text-heading">{fmt(btwBedrag)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-surface-border pt-1.5">
                <span className="text-heading">Totaal</span>
                <span className="text-smaragd">{fmt(totaalBedrag)}</span>
              </div>
            </div>
          </div>
        </div>

        <Textarea
          label="Notities"
          name="notities"
          defaultValue={factuur?.notities || initialNotities || ""}
          placeholder="Interne notities bij deze factuur..."
        />

        {error && (
          <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Annuleren</Button>
          <Button type="submit" loading={loading}>{isEdit ? "Opslaan" : "Aanmaken"}</Button>
        </div>
      </form>
    </Modal>
  );
}
