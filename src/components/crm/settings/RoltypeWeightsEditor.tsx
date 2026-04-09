"use client";

import { useState } from "react";
import { WeightSlider } from "./WeightSlider";
import { Button } from "@/components/crm/ui/Button";
import { Card } from "@/components/crm/ui/Card";
import { Input } from "@/components/crm/ui/Input";
import { Badge } from "@/components/crm/ui/Badge";
import type { MatchingRoltype, MatchingConfigRow } from "@/lib/types/crm";
import type { APACRolGewichten } from "@/config/matching";

interface RoltypeWeightsEditorProps {
  roltypes: MatchingRoltype[];
  configRows: MatchingConfigRow[];
  onSaveRoltype: (key: string, label: string) => Promise<void>;
  onDeleteRoltype: (key: string) => Promise<void>;
  onSaveWeights: (key: string, apac: APACRolGewichten) => Promise<void>;
}

const DEFAULT_APAC: APACRolGewichten = {
  adaptability: 1.0,
  personality: 1.0,
  awareness: 1.0,
  connection: 1.0,
};

export function RoltypeWeightsEditor({
  roltypes,
  configRows,
  onSaveRoltype,
  onDeleteRoltype,
  onSaveWeights,
}: RoltypeWeightsEditorProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editWeights, setEditWeights] = useState<APACRolGewichten>(DEFAULT_APAC);
  const [saving, setSaving] = useState(false);

  const getApacForRoltype = (key: string): APACRolGewichten => {
    const row = configRows.find((r) => r.scope_type === "roltype" && r.scope_key === key);
    return (row?.apac_gewichten as unknown as APACRolGewichten) || DEFAULT_APAC;
  };

  const handleAdd = async () => {
    if (!newKey.trim() || !newLabel.trim()) return;
    setSaving(true);
    await onSaveRoltype(newKey.trim().toLowerCase().replace(/\s+/g, "_"), newLabel.trim());
    setNewKey("");
    setNewLabel("");
    setShowAdd(false);
    setSaving(false);
  };

  const handleEdit = (key: string) => {
    setEditingKey(key);
    setEditWeights(getApacForRoltype(key));
  };

  const handleSaveWeights = async () => {
    if (!editingKey) return;
    setSaving(true);
    await onSaveWeights(editingKey, editWeights);
    setEditingKey(null);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-heading">Roltypes ({roltypes.length})</h4>
        <Button variant="ghost" className="text-xs" onClick={() => setShowAdd(!showAdd)}>
          + Nieuw roltype
        </Button>
      </div>

      {showAdd && (
        <Card padding="sm">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Key (slug)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="bijv. product_manager"
              />
            </div>
            <div className="flex-1">
              <Input
                label="Label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="bijv. Product Manager"
              />
            </div>
            <div className="flex gap-2 pb-0.5">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Annuleren</Button>
              <Button onClick={handleAdd} disabled={saving}>{saving ? "..." : "Toevoegen"}</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {roltypes.map((rt) => (
          <Card key={rt.key} padding="sm">
            {editingKey === rt.key ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-heading">{rt.label}</p>
                  <Badge variant="default">{rt.key}</Badge>
                </div>
                <WeightSlider label="Adaptability" value={editWeights.adaptability} onChange={(v) => setEditWeights((p) => ({ ...p, adaptability: v }))} min={0.5} max={2.0} step={0.1} />
                <WeightSlider label="Personality" value={editWeights.personality} onChange={(v) => setEditWeights((p) => ({ ...p, personality: v }))} min={0.5} max={2.0} step={0.1} />
                <WeightSlider label="Awareness" value={editWeights.awareness} onChange={(v) => setEditWeights((p) => ({ ...p, awareness: v }))} min={0.5} max={2.0} step={0.1} />
                <WeightSlider label="Connection" value={editWeights.connection} onChange={(v) => setEditWeights((p) => ({ ...p, connection: v }))} min={0.5} max={2.0} step={0.1} />
                <div className="flex justify-between pt-2">
                  <Button
                    variant="ghost"
                    className="text-xs text-red-500 hover:text-red-400"
                    onClick={async () => {
                      setSaving(true);
                      await onDeleteRoltype(rt.key);
                      setEditingKey(null);
                      setSaving(false);
                    }}
                  >
                    Verwijder roltype
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setEditingKey(null)}>Annuleren</Button>
                    <Button onClick={handleSaveWeights} disabled={saving}>{saving ? "..." : "Opslaan"}</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between cursor-pointer" onClick={() => handleEdit(rt.key)}>
                <div>
                  <p className="text-sm font-medium text-heading">{rt.label}</p>
                  <div className="mt-1 flex gap-3 text-xs text-muted">
                    {(() => {
                      const apac = getApacForRoltype(rt.key);
                      return (
                        <>
                          <span>A:{apac.adaptability}</span>
                          <span>P:{apac.personality}</span>
                          <span>Aw:{apac.awareness}</span>
                          <span>C:{apac.connection}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <Badge variant="default">{rt.key}</Badge>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
