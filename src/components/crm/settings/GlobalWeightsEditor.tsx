"use client";

import { useState, useEffect } from "react";
import { WeightSlider } from "./WeightSlider";
import { Button } from "@/components/crm/ui/Button";
import { Card } from "@/components/crm/ui/Card";
import { DEFAULT_MATCH_CONFIG } from "@/config/matching";
import type { MatchWeights, HardFilterConfig } from "@/config/matching";

const WEIGHT_LABELS: Record<keyof MatchWeights, string> = {
  vaardigheden: "Vaardigheden",
  semantisch: "Semantisch",
  apac: "APAC",
  cultuur: "Cultuur",
  gesprek: "Gesprek",
  salaris: "Salaris",
  beschikbaarheid: "Beschikbaarheid",
};

interface GlobalWeightsEditorProps {
  initialWeights: MatchWeights | null;
  initialFilters: HardFilterConfig | null;
  initialDisabledComponents: string[] | null;
  onSave: (weights: MatchWeights, filters: HardFilterConfig, disabledComponents: string[]) => Promise<void>;
  onReset: () => Promise<void>;
}

export function GlobalWeightsEditor({ initialWeights, initialFilters, initialDisabledComponents, onSave, onReset }: GlobalWeightsEditorProps) {
  const defaults = DEFAULT_MATCH_CONFIG.weights;
  const defaultFilters = DEFAULT_MATCH_CONFIG.hardFilters;

  const [weights, setWeights] = useState<MatchWeights>(initialWeights || defaults);
  const [filters, setFilters] = useState<HardFilterConfig>(initialFilters || defaultFilters);
  const [disabledComponents, setDisabledComponents] = useState<string[]>(initialDisabledComponents || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWeights(initialWeights || defaults);
    setFilters(initialFilters || defaultFilters);
    setDisabledComponents(initialDisabledComponents || []);
  }, [initialWeights, initialFilters, initialDisabledComponents, defaults, defaultFilters]);

  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(total - 1.0) < 0.02;

  const updateWeight = (key: keyof MatchWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const autoNormalize = () => {
    const sum = Object.values(weights).reduce((s, v) => s + v, 0);
    if (sum === 0) return;
    const scale = 1.0 / sum;
    const normalized: MatchWeights = { ...weights };
    for (const key of Object.keys(normalized) as (keyof MatchWeights)[]) {
      normalized[key] = Math.round(normalized[key] * scale * 100) / 100;
    }
    setWeights(normalized);
  };

  const toggleComponent = (key: string) => {
    setDisabledComponents((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(weights, filters, disabledComponents);
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    await onReset();
    setWeights(defaults);
    setFilters(defaultFilters);
    setDisabledComponents([]);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h4 className="text-sm font-medium text-heading mb-4">Scoregewichten</h4>
        {disabledComponents.length > 0 && (
          <p className="mb-4 text-xs text-muted border-l-2 border-smaragd pl-3">
            Uitgeschakelde componenten worden overgeslagen bij matching. Hun gewicht wordt automatisch verdeeld over actieve componenten.
          </p>
        )}
        <div className="space-y-3">
          {(Object.keys(weights) as (keyof MatchWeights)[]).map((key) => {
            const isOff = disabledComponents.includes(key);
            return (
              <div key={key} className={`flex items-center gap-3 ${isOff ? "opacity-40" : ""}`}>
                <input
                  type="checkbox"
                  checked={!isOff}
                  onChange={() => toggleComponent(key)}
                  className="h-4 w-4 rounded accent-smaragd shrink-0"
                  title={isOff ? `${WEIGHT_LABELS[key]} inschakelen` : `${WEIGHT_LABELS[key]} uitschakelen`}
                />
                <div className="flex-1">
                  <WeightSlider
                    label={WEIGHT_LABELS[key]}
                    value={weights[key]}
                    onChange={(v) => updateWeight(key, v)}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${isValid ? "text-smaragd" : "text-red-500"}`}>
              Totaal: {total.toFixed(2)}
            </span>
            {!isValid && (
              <button onClick={autoNormalize} className="text-xs text-smaragd hover:underline">
                Auto-normaliseer
              </button>
            )}
          </div>
          {disabledComponents.length > 0 && (
            <span className="text-xs text-muted">{disabledComponents.length} uitgeschakeld</span>
          )}
        </div>
      </Card>

      <Card>
        <h4 className="text-sm font-medium text-heading mb-4">Hard Filters</h4>
        <div className="space-y-3">
          <WeightSlider
            label="Min. similarity"
            value={filters.minCosineSimilarity}
            onChange={(v) => setFilters((prev) => ({ ...prev, minCosineSimilarity: v }))}
            min={0}
            max={1}
            step={0.05}
          />
          <WeightSlider
            label="Max salaris %"
            value={filters.maxSalarisOverschrijding}
            onChange={(v) => setFilters((prev) => ({ ...prev, maxSalarisOverschrijding: v }))}
            min={1}
            max={2}
            step={0.05}
            suffix="x"
          />
          <div className="flex items-center gap-3">
            <label className="w-36 text-sm text-muted shrink-0">Niet beschikbaar</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.excludeNietBeschikbaar}
                onChange={(e) => setFilters((prev) => ({ ...prev, excludeNietBeschikbaar: e.target.checked }))}
                className="h-4 w-4 rounded accent-smaragd"
              />
              <span className="text-sm text-body">Uitsluiten</span>
            </label>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={handleReset} disabled={saving}>
          Reset naar standaard
        </Button>
        <Button onClick={handleSave} disabled={saving || !isValid}>
          {saving ? "Opslaan..." : "Opslaan"}
        </Button>
      </div>
    </div>
  );
}
