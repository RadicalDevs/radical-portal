"use client";

import { useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { updatePoortConfig, togglePoortFase } from "../actions";
import type { PoortPageData, UpdatePoortResult } from "../actions";

const DIM_COLORS = {
  adaptability: "#2ed573",
  personality: "#E6734F",
  awareness: "#3B82F6",
  connection: "#8B5CF6",
};

const DIM_LABELS = {
  adaptability: "Adaptability",
  personality: "Personality",
  awareness: "Awareness",
  connection: "Connection",
  gecombineerd: "Gecombineerd",
};

export default function PoortClient({ data }: { data: PoortPageData }) {
  const { config, teller, stats, histogramData } = data;
  const fase = config?.fase ?? "learning";
  const drempel = config?.kandidaat_drempel ?? 150;
  const progress = Math.min(100, Math.round((teller / drempel) * 100));

  const [isPendingToggle, startToggle] = useTransition();
  const [isPendingConfig, startConfig] = useTransition();
  const [saveResult, setSaveResult] = useState<UpdatePoortResult | null>(null);

  function handleToggle() {
    startToggle(async () => {
      await togglePoortFase();
    });
  }

  function handleSaveConfig(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startConfig(async () => {
      const res = await updatePoortConfig(fd);
      setSaveResult(res);
    });
  }

  return (
    <div className="space-y-8">
      {/* Status banner */}
      <div
        className={`flex items-center justify-between rounded-xl border p-5 ${
          fase === "learning"
            ? "border-smaragd/30 bg-smaragd/5"
            : "border-coral/30 bg-coral/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${
              fase === "learning" ? "bg-smaragd" : "bg-coral"
            } animate-pulse`}
          />
          <div>
            <p className="font-heading text-lg font-bold text-heading">
              {fase === "learning" ? "LEERFASE" : "ACTIEVE FASE"}
            </p>
            <p className="text-sm text-muted">
              {fase === "learning"
                ? "Alle kandidaten worden doorgelaten. Scores worden verzameld."
                : "Drempelscores worden toegepast op nieuwe kandidaten."}
            </p>
          </div>
        </div>
        {(fase === "active" || teller >= drempel) && (
          <button
            onClick={handleToggle}
            disabled={isPendingToggle}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
              fase === "learning"
                ? "bg-coral/10 text-coral hover:bg-coral/20"
                : "bg-smaragd/10 text-smaragd hover:bg-smaragd/20"
            }`}
          >
            {isPendingToggle
              ? "Wisselen…"
              : fase === "learning"
              ? "Activeer actieve fase →"
              : "← Terug naar leerfase"}
          </button>
        )}
      </div>

      {/* Counter */}
      <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-muted">Kandidaten (excl. seed)</p>
          <p className="font-heading text-2xl font-bold text-heading">
            {teller}
            <span className="ml-1 text-base font-normal text-muted">/ {drempel}</span>
          </p>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-surface-light">
          <div
            className="h-2 rounded-full bg-smaragd transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted">{progress}% van de leerfase voltooid</p>
      </div>

      {/* Statistics table */}
      {teller > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface shadow-sm">
          <div className="border-b border-surface-border px-5 py-4">
            <h2 className="font-heading text-lg font-bold text-heading">
              Score statistieken
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-surface-border bg-surface-light">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Dimensie
                  </th>
                  {["Gemiddelde", "P50 (mediaan)", "P75", "P90"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {(["adaptability", "personality", "awareness", "connection", "gecombineerd"] as const).map(
                  (dim) => {
                    const s = stats[dim];
                    const color = dim === "gecombineerd" ? "#2ed573" : DIM_COLORS[dim as keyof typeof DIM_COLORS];
                    return (
                      <tr key={dim} className="hover:bg-surface-light">
                        <td className="px-4 py-3 font-medium" style={{ color }}>
                          {DIM_LABELS[dim]}
                        </td>
                        {[s.avg, s.p50, s.p75, s.p90].map((v, i) => (
                          <td key={i} className="px-4 py-3 text-right tabular-nums text-heading">
                            {v.toFixed(1)}
                          </td>
                        ))}
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Histogram */}
      {teller > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
          <h2 className="mb-5 font-heading text-lg font-bold text-heading">
            Score distributie
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histogramData} barSize={8} barCategoryGap="30%">
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-surface-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
              />
              {(["adaptability", "personality", "awareness", "connection"] as const).map(
                (dim) => (
                  <Bar
                    key={dim}
                    dataKey={dim}
                    name={DIM_LABELS[dim]}
                    fill={DIM_COLORS[dim]}
                    radius={[3, 3, 0, 0]}
                    fillOpacity={0.85}
                  />
                )
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Threshold config (active phase only) */}
      {fase === "active" && (
        <div className="rounded-xl border border-surface-border bg-surface p-6 shadow-sm">
          <h2 className="mb-5 font-heading text-lg font-bold text-heading">
            Drempel configuratie
          </h2>
          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(["adaptability", "personality", "awareness", "connection"] as const).map(
                (dim) => (
                  <ThresholdInput
                    key={dim}
                    name={`drempel_${dim}`}
                    label={DIM_LABELS[dim]}
                    defaultValue={
                      config?.[`drempel_${dim}` as keyof typeof config] as
                        | number
                        | null
                        | undefined
                    }
                    color={DIM_COLORS[dim]}
                  />
                )
              )}
              <ThresholdInput
                name="drempel_gecombineerd"
                label="Gecombineerd"
                defaultValue={config?.drempel_gecombineerd}
                color="#2ed573"
              />
            </div>

            {saveResult && (
              <div
                className={`rounded-lg p-3 text-sm font-medium ${
                  saveResult.success
                    ? "bg-smaragd/10 text-smaragd"
                    : "bg-coral/10 text-coral"
                }`}
              >
                {saveResult.success
                  ? "Drempels opgeslagen."
                  : saveResult.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPendingConfig}
              className="rounded-xl bg-smaragd px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-smaragd-dark disabled:opacity-50"
            >
              {isPendingConfig ? "Opslaan…" : "Drempels opslaan"}
            </button>
          </form>
        </div>
      )}

      {/* Leerfase — drempel config disabled hint */}
      {fase === "learning" && (
        <div className="rounded-xl border border-surface-border bg-surface p-6 opacity-60">
          <h2 className="mb-2 font-heading text-lg font-bold text-heading">
            Drempel configuratie
          </h2>
          <p className="text-sm text-muted">
            Drempelwaarden kunnen pas worden ingesteld wanneer de actieve fase is
            geactiveerd. Schakel eerst over naar de actieve fase om drempels te
            configureren.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pointer-events-none select-none">
            {(["adaptability", "personality", "awareness", "connection"] as const).map(
              (dim) => (
                <ThresholdInput
                  key={dim}
                  name={`drempel_${dim}_preview`}
                  label={DIM_LABELS[dim]}
                  defaultValue={
                    config?.[`drempel_${dim}` as keyof typeof config] as
                      | number
                      | null
                      | undefined
                  }
                  color={DIM_COLORS[dim]}
                  disabled
                />
              )
            )}
            <ThresholdInput
              name="drempel_gecombineerd_preview"
              label="Gecombineerd"
              defaultValue={config?.drempel_gecombineerd}
              color="#2ed573"
              disabled
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ThresholdInput({
  name,
  label,
  defaultValue,
  color,
  disabled,
}: {
  name: string;
  label: string;
  defaultValue?: number | null;
  color: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium" style={{ color }}>
        {label}
      </label>
      <input
        name={name}
        type="number"
        step="1"
        min="0"
        max="200"
        defaultValue={defaultValue ?? ""}
        placeholder="0–50 per dim / 0–200 totaal (leeg = geen drempel)"
        disabled={disabled}
        className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        style={{ "--tw-ring-color": color } as React.CSSProperties}
        onFocus={(e) => (e.target.style.borderColor = color)}
        onBlur={(e) => (e.target.style.borderColor = "")}
      />
    </div>
  );
}
