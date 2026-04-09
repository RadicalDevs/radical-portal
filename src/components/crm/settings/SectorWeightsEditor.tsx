"use client";

import { useState } from "react";
import { WeightSlider } from "./WeightSlider";
import { Button } from "@/components/crm/ui/Button";
import { Card } from "@/components/crm/ui/Card";
import { Input } from "@/components/crm/ui/Input";
import { Badge } from "@/components/crm/ui/Badge";
import { DEFAULT_MATCH_CONFIG } from "@/config/matching";
import type { MatchWeights } from "@/config/matching";
import type { MatchingSector, MatchingConfigRow } from "@/lib/types/crm";

interface SectorWeightsEditorProps {
  sectors: MatchingSector[];
  configRows: MatchingConfigRow[];
  onSaveSector: (key: string, label: string) => Promise<void>;
  onDeleteSector: (key: string) => Promise<void>;
  onSaveWeights: (key: string, weights: MatchWeights) => Promise<void>;
}

export function SectorWeightsEditor({
  sectors,
  configRows,
  onSaveSector,
  onDeleteSector,
  onSaveWeights,
}: SectorWeightsEditorProps) {
  const defaults = DEFAULT_MATCH_CONFIG.weights;
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editWeights, setEditWeights] = useState<MatchWeights>(defaults);
  const [saving, setSaving] = useState(false);

  const getWeightsForSector = (key: string): MatchWeights => {
    const row = configRows.find((r) => r.scope_type === "sector" && r.scope_key === key);
    return row?.weights ? { ...defaults, ...row.weights as unknown as Partial<MatchWeights> } : defaults;
  };

  const handleAdd = async () => {
    if (!newKey.trim() || !newLabel.trim()) return;
    setSaving(true);
    await onSaveSector(newKey.trim().toLowerCase().replace(/\s+/g, "_"), newLabel.trim());
    setNewKey("");
    setNewLabel("");
    setShowAdd(false);
    setSaving(false);
  };

  const handleEdit = (key: string) => {
    setEditingKey(key);
    setEditWeights(getWeightsForSector(key));
  };

  const handleSave = async () => {
    if (!editingKey) return;
    setSaving(true);
    await onSaveWeights(editingKey, editWeights);
    setEditingKey(null);
    setSaving(false);
  };

  const total = Object.values(editWeights).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(total - 1.0) < 0.02;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-heading">Sectoren ({sectors.length})</h4>
        <Button variant="ghost" className="text-xs" onClick={() => setShowAdd(!showAdd)}>
          + Nieuwe sector
        </Button>
      </div>

      {showAdd && (
        <Card padding="sm">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input label="Key (slug)" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="bijv. fintech" />
            </div>
            <div className="flex-1">
              <Input label="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="bijv. FinTech & Banking" />
            </div>
            <div className="flex gap-2 pb-0.5">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Annuleren</Button>
              <Button onClick={handleAdd} disabled={saving}>{saving ? "..." : "Toevoegen"}</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {sectors.map((sec) => (
          <Card key={sec.key} padding="sm">
            {editingKey === sec.key ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-heading">{sec.label}</p>
                  <Badge variant="default">{sec.key}</Badge>
                </div>
                <WeightSlider label="Vaardigheden" value={editWeights.vaardigheden} onChange={(v) => setEditWeights((p) => ({ ...p, vaardigheden: v }))} />
                <WeightSlider label="Semantisch" value={editWeights.semantisch} onChange={(v) => setEditWeights((p) => ({ ...p, semantisch: v }))} />
                <WeightSlider label="APAC" value={editWeights.apac} onChange={(v) => setEditWeights((p) => ({ ...p, apac: v }))} />
                <WeightSlider label="Cultuur" value={editWeights.cultuur} onChange={(v) => setEditWeights((p) => ({ ...p, cultuur: v }))} />
                <WeightSlider label="Gesprek" value={editWeights.gesprek} onChange={(v) => setEditWeights((p) => ({ ...p, gesprek: v }))} />
                <WeightSlider label="Salaris" value={editWeights.salaris} onChange={(v) => setEditWeights((p) => ({ ...p, salaris: v }))} />
                <WeightSlider label="Beschikbaarheid" value={editWeights.beschikbaarheid} onChange={(v) => setEditWeights((p) => ({ ...p, beschikbaarheid: v }))} />
                <div className="flex items-center gap-3 border-t border-border pt-2">
                  <span className={`text-sm font-medium ${isValid ? "text-smaragd" : "text-red-500"}`}>
                    Totaal: {total.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    className="text-xs text-red-500 hover:text-red-400"
                    onClick={async () => {
                      setSaving(true);
                      await onDeleteSector(sec.key);
                      setEditingKey(null);
                      setSaving(false);
                    }}
                  >
                    Verwijder sector
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setEditingKey(null)}>Annuleren</Button>
                    <Button onClick={handleSave} disabled={saving || !isValid}>{saving ? "..." : "Opslaan"}</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between cursor-pointer" onClick={() => handleEdit(sec.key)}>
                <div>
                  <p className="text-sm font-medium text-heading">{sec.label}</p>
                  {(() => {
                    const hasOverride = configRows.some((r) => r.scope_type === "sector" && r.scope_key === sec.key);
                    const w = getWeightsForSector(sec.key);
                    return hasOverride ? (
                      <p className="mt-1 text-xs text-muted">
                        V:{w.vaardigheden} S:{w.semantisch} A:{w.apac} C:{w.cultuur} G:{w.gesprek} Sa:{w.salaris} B:{w.beschikbaarheid}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted">Gebruikt globale gewichten</p>
                    );
                  })()}
                </div>
                <Badge variant="default">{sec.key}</Badge>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
