"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import RadarChart from "@/components/apac/RadarChart";
import type {
  AnalyticsData,
  AnalyticsKpis,
  OpleidingsniveauRow,
  WeeklyInstroomRow,
  PoolStatusRow,
} from "../actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIM_COLORS = {
  adaptability: "#2ed573",
  personality: "#E6734F",
  awareness: "#3B82F6",
  connection: "#8B5CF6",
} as const;

const DIM_LABELS = {
  adaptability: "Adaptability",
  personality: "Personality",
  awareness: "Awareness",
  connection: "Connection",
} as const;

const STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect",
  in_selectie: "In selectie",
  pending_review: "Pending review",
  pool: "Pool",
  radical: "Radical",
  onbekend: "Onbekend",
};

const STATUS_COLORS: Record<string, string> = {
  prospect: "#6B7280",
  in_selectie: "#E6734F",
  pending_review: "#3B82F6",
  pool: "#2ed573",
  radical: "#2ed573",
  onbekend: "#374151",
};

const TOOLTIP_STYLE = {
  background: "var(--bg-surface, #1a1a2e)",
  border: "1px solid var(--bg-surface-border, #2a2a3e)",
  borderRadius: 8,
  fontSize: 12,
};

const TICK_STYLE = { fill: "var(--text-muted, #6B7280)", fontSize: 11 };

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[8px] border border-surface-border bg-surface shadow-sm">
      <div className="border-b border-surface-border px-5 py-4">
        <p className="font-heading text-base font-bold text-heading">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[8px] border border-surface-border bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-heading text-3xl font-bold text-heading">
        {value}
        {sub && <span className="ml-1 text-base font-normal text-muted">{sub}</span>}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted">{message}</p>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — KPI Overzicht
// ---------------------------------------------------------------------------

function Section1Kpis({ kpis }: { kpis: AnalyticsKpis }) {
  const dims = ["adaptability", "personality", "awareness", "connection"] as const;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard label="Totaal getest" value={String(kpis.totaalGetest)} />
      <KpiCard
        label="Gem. gecombineerd"
        value={kpis.gemiddeldeGecombineerd.toFixed(1)}
        sub="/ 10"
      />
      <KpiCard
        label="Doorstroom"
        value={`${kpis.doorstroomPercentage}%`}
        sub="in selectie / pool"
      />
      {/* 4 dimensies mini-grid */}
      <div className="rounded-[8px] border border-surface-border bg-surface p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Per dimensie</p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
          {dims.map((dim) => (
            <div key={dim}>
              <p className="text-xs text-muted">{DIM_LABELS[dim]}</p>
              <p
                className="font-heading text-xl font-bold"
                style={{ color: DIM_COLORS[dim] }}
              >
                {kpis.gemiddeldePerDimensie[dim].toFixed(1)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Scores per Opleidingsniveau
// ---------------------------------------------------------------------------

function Section2Opleidingsniveaus({ rows }: { rows: OpleidingsniveauRow[] }) {
  return (
    <SectionCard
      title="Scores per opleidingsniveau"
      subtitle="Alleen niveaus met minimaal 3 geteste kandidaten"
    >
      {rows.length === 0 ? (
        <EmptyState message="Te weinig data per opleidingsniveau (minimaal 3 kandidaten per niveau vereist)." />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <XAxis
                dataKey="level"
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 10]}
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => (typeof v === "number" ? v.toFixed(1) : v)} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "var(--text-muted, #6B7280)" }}
                formatter={(value) => DIM_LABELS[value as keyof typeof DIM_LABELS] ?? value}
              />
              {(["adaptability", "personality", "awareness", "connection"] as const).map((dim) => (
                <Bar key={dim} dataKey={dim} fill={DIM_COLORS[dim]} radius={[3, 3, 0, 0]} maxBarSize={24} />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* Tabel */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">Niveau</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">Aantal</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted" style={{ color: DIM_COLORS.adaptability }}>A</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted" style={{ color: DIM_COLORS.personality }}>P</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted" style={{ color: DIM_COLORS.awareness }}>A</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted" style={{ color: DIM_COLORS.connection }}>C</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">Gecomb.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {rows.map((r) => (
                  <tr key={r.level} className="hover:bg-surface-light">
                    <td className="py-2 font-medium text-heading">{r.level}</td>
                    <td className="py-2 text-right text-muted">{r.count}</td>
                    <td className="py-2 text-right" style={{ color: DIM_COLORS.adaptability }}>{r.adaptability.toFixed(1)}</td>
                    <td className="py-2 text-right" style={{ color: DIM_COLORS.personality }}>{r.personality.toFixed(1)}</td>
                    <td className="py-2 text-right" style={{ color: DIM_COLORS.awareness }}>{r.awareness.toFixed(1)}</td>
                    <td className="py-2 text-right" style={{ color: DIM_COLORS.connection }}>{r.connection.toFixed(1)}</td>
                    <td className="py-2 text-right font-semibold text-heading">{r.gecombineerd.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — Populatie Radar
// ---------------------------------------------------------------------------

function Section3Radar({
  radar,
  totaal,
}: {
  radar: AnalyticsData["populatieRadar"];
  totaal: number;
}) {
  return (
    <SectionCard
      title="Populatie radar"
      subtitle={`Gemiddelde scores over alle ${totaal} kandidaten`}
    >
      <div className="flex items-center justify-center py-2">
        <RadarChart scores={radar} maxSize={280} animated={false} />
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 4 — Pool Status Verdeling
// ---------------------------------------------------------------------------

function Section4PoolStatus({ verdeling }: { verdeling: PoolStatusRow[] }) {
  const total = verdeling.reduce((s, r) => s + r.count, 0);

  return (
    <SectionCard title="Pool status verdeling" subtitle="Huidige status van alle kandidaten">
      {verdeling.length === 0 ? (
        <EmptyState message="Geen kandidaatdata beschikbaar." />
      ) : (
        <div className="space-y-3">
          {verdeling.map((row) => {
            const color = STATUS_COLORS[row.status] ?? "#6B7280";
            const label = STATUS_LABELS[row.status] ?? row.status;
            return (
              <div key={row.status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium text-heading">{label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    <span>{row.count} kandidaten</span>
                    <span className="w-10 text-right font-semibold text-heading">
                      {row.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-light">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${row.percentage}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
          <p className="pt-1 text-right text-xs text-muted">{total} totaal</p>
        </div>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Section 5 — Instroom over tijd
// ---------------------------------------------------------------------------

function Section5Instroom({ weeklyInstroom }: { weeklyInstroom: WeeklyInstroomRow[] }) {
  const hasActivity = weeklyInstroom.some((w) => w.count > 0);

  return (
    <SectionCard
      title="Instroom over tijd"
      subtitle="Aantal APAC-tests afgenomen per week (laatste 12 weken)"
    >
      {!hasActivity ? (
        <EmptyState message="Nog geen activiteit in de afgelopen 12 weken." />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={weeklyInstroom} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
            <XAxis
              dataKey="weekLabel"
              tick={TICK_STYLE}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis
              tick={TICK_STYLE}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => [v, "Tests"]}
            />
            <Line
              type="monotone"
              dataKey="count"
              name="Tests"
              stroke="#2ed573"
              strokeWidth={2}
              dot={{ r: 3, fill: "#2ed573", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function AnalyticsClient({ data }: { data: AnalyticsData }) {
  if (!data.hasData) {
    return (
      <div className="rounded-[8px] border border-surface-border bg-surface p-12 shadow-sm">
        <p className="text-center text-muted">
          Nog geen APAC-resultaten beschikbaar. Zodra kandidaten de test afnemen verschijnt hier het dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section1Kpis kpis={data.kpis} />
      <Section2Opleidingsniveaus rows={data.opleidingsniveaus} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section3Radar radar={data.populatieRadar} totaal={data.kpis.totaalGetest} />
        <Section4PoolStatus verdeling={data.poolStatusVerdeling} />
      </div>
      <Section5Instroom weeklyInstroom={data.weeklyInstroom} />
    </div>
  );
}
