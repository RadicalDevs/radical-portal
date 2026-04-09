"use client";

import { useState } from "react";
import { WeightSlider } from "./WeightSlider";
import { Button } from "@/components/crm/ui/Button";
import { Card } from "@/components/crm/ui/Card";
import { Input } from "@/components/crm/ui/Input";
import { Badge } from "@/components/crm/ui/Badge";
import type { CultuurPijler, MatchingSector, MatchingConfigRow } from "@/lib/types/crm";

interface CultuurPijlersEditorProps {
  pijlers: CultuurPijler[];
  sectors: MatchingSector[];
  configRows: MatchingConfigRow[];
  onSavePijler: (key: string, label: string, beschrijving: string, apac_mapping: string | null, kleur: string) => Promise<void>;
  onDeletePijler: (key: string) => Promise<void>;
  onSaveSectorDefaults: (sectorKey: string, defaults: Record<string, number>) => Promise<void>;
}

const APAC_OPTIONS = [
  { value: "", label: "Geen" },
  { value: "adaptability", label: "Adaptability" },
  { value: "personality", label: "Personality" },
  { value: "awareness", label: "Awareness" },
  { value: "connection", label: "Connection" },
];

export function CultuurPijlersEditor({
  pijlers,
  sectors,
  configRows,
  onSavePijler,
  onDeletePijler,
  onSaveSectorDefaults,
}: CultuurPijlersEditorProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newBeschrijving, setNewBeschrijving] = useState("");
  const [newApacMapping, setNewApacMapping] = useState("");
  const [newKleur, setNewKleur] = useState("#10b981");
  const [saving, setSaving] = useState(false);

  const [selectedSector, setSelectedSector] = useState<string>("");
  const [sectorDefaults, setSectorDefaults] = useState<Record<string, number>>({});
  const [savingSector, setSavingSector] = useState(false);

  const getSectorDefaults = (sectorKey: string): Record<string, number> => {
    const row = configRows.find((r) => r.scope_type === "sector" && r.scope_key === sectorKey);
    const defaults = (row as unknown as { cultuur_defaults?: Record<string, number> })?.cultuur_defaults;
    if (defaults && typeof defaults === "object") return defaults;
    const fallback: Record<string, number> = {};
    pijlers.forEach((p) => { fallback[p.key] = 5; });
    return fallback;
  };

  const handleSelectSector = (sectorKey: string) => {
    setSelectedSector(sectorKey);
    if (sectorKey) {
      const defaults = getSectorDefaults(sectorKey);
      const full: Record<string, number> = {};
      pijlers.forEach((p) => { full[p.key] = defaults[p.key] ?? 5; });
      setSectorDefaults(full);
    } else {
      setSectorDefaults({});
    }
  };

  const handleAdd = async () => {
    if (!newKey.trim() || !newLabel.trim()) return;
    setSaving(true);
    await onSavePijler(
      newKey.trim().toLowerCase().replace(/\s+/g, "_"),
      newLabel.trim(),
      newBeschrijving.trim(),
      newApacMapping || null,
      newKleur
    );
    setNewKey("");
    setNewLabel("");
    setNewBeschrijving("");
    setNewApacMapping("");
    setNewKleur("#10b981");
    setShowAdd(false);
    setSaving(false);
  };

  const handleSaveSectorDefaults = async () => {
    if (!selectedSector) return;
    setSavingSector(true);
    await onSaveSectorDefaults(selectedSector, sectorDefaults);
    setSavingSector(false);
  };

  return (
    <div className="space-y-8">
      <Card padding="sm">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-heading">Wat zijn cultuurpijlers?</h4>
          <p className="text-xs text-body leading-relaxed">
            Cultuurpijlers zijn de kernwaarden waarop de bedrijfscultuur van een klant wordt beoordeeld.
            Bij het matchen van kandidaten met vacatures wordt naast harde skills ook gekeken hoe goed
            een kandidaat cultureel past bij het bedrijf. Elke pijler krijgt een score van 1–10.
          </p>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-heading">Pijlers beheren ({pijlers.length})</h4>
          <Button variant="ghost" className="text-xs" onClick={() => setShowAdd(!showAdd)}>
            + Nieuwe pijler
          </Button>
        </div>

        {showAdd && (
          <Card padding="sm">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input label="Key (slug)" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="bijv. innovatie" />
                </div>
                <div className="flex-1">
                  <Input label="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="bijv. Innovatief" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-body mb-1">Beschrijving</label>
                <textarea
                  value={newBeschrijving}
                  onChange={(e) => setNewBeschrijving(e.target.value)}
                  placeholder="Wat betekent deze pijler?"
                  className="w-full rounded-[var(--radius-default)] border border-border bg-surface px-3 py-2 text-sm text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-smaragd/50 resize-y min-h-[60px]"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-body mb-1">APAC Mapping</label>
                  <select
                    value={newApacMapping}
                    onChange={(e) => setNewApacMapping(e.target.value)}
                    className="w-full rounded-[var(--radius-default)] border border-border bg-surface px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-smaragd/50"
                  >
                    {APAC_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <Input label="Kleur (hex)" value={newKleur} onChange={(e) => setNewKleur(e.target.value)} placeholder="#10b981" />
                </div>
                <div className="flex items-end pb-0.5">
                  <div className="h-9 w-9 rounded-[var(--radius-default)] border border-border" style={{ backgroundColor: newKleur }} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => setShowAdd(false)}>Annuleren</Button>
                <Button onClick={handleAdd} disabled={saving}>{saving ? "..." : "Toevoegen"}</Button>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {pijlers.map((p) => (
            <Card key={p.key} padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.kleur }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-heading">{p.label}</p>
                      {p.apac_mapping && <Badge variant="default">{p.apac_mapping}</Badge>}
                    </div>
                    {p.beschrijving && (
                      <p className="mt-0.5 text-xs text-muted line-clamp-2">{p.beschrijving}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="text-xs text-red-500 hover:text-red-400"
                  onClick={async () => {
                    setSaving(true);
                    await onDeletePijler(p.key);
                    setSaving(false);
                  }}
                >
                  Verwijder
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-heading">Sector-typische cultuurscores (fallback)</h4>
          <p className="mt-1 text-xs text-muted">
            Stel per sector de typische cultuurscores in. Deze worden gebruikt als een klant in die sector geen eigen cultuurprofiel heeft.
          </p>
        </div>

        <div>
          <label className="block text-sm text-body mb-1">Sector</label>
          <select
            value={selectedSector}
            onChange={(e) => handleSelectSector(e.target.value)}
            className="w-full max-w-xs rounded-[var(--radius-default)] border border-border bg-surface px-3 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-smaragd/50"
          >
            <option value="">Selecteer een sector...</option>
            {sectors.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {selectedSector && (
          <Card>
            <div className="space-y-3">
              {pijlers.map((p) => (
                <WeightSlider
                  key={p.key}
                  label={p.label}
                  value={sectorDefaults[p.key] ?? 5}
                  onChange={(v) => setSectorDefaults((prev) => ({ ...prev, [p.key]: v }))}
                  min={1}
                  max={10}
                  step={0.5}
                />
              ))}
            </div>
            <div className="mt-4 flex justify-end border-t border-border pt-3">
              <Button onClick={handleSaveSectorDefaults} disabled={savingSector}>
                {savingSector ? "Opslaan..." : "Opslaan"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
