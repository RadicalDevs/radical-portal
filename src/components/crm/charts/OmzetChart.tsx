"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface OmzetChartProps {
  data: { maand: string; omzet: number }[];
}

const TOOLTIP_STYLE = {
  backgroundColor: "#18181B",
  border: "1px solid #3F3F46",
  borderRadius: "8px",
  color: "#FAFAFA",
};

export function OmzetChart({ data }: OmzetChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
        <XAxis
          dataKey="maand"
          tick={{ fill: "#A1A1AA", fontSize: 12 }}
          axisLine={{ stroke: "#27272A" }}
        />
        <YAxis
          tick={{ fill: "#A1A1AA", fontSize: 12 }}
          axisLine={{ stroke: "#27272A" }}
          tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [`€${Number(value).toLocaleString("nl-NL")}`, "Omzet"]}
        />
        <Bar dataKey="omzet" fill="#2ed573" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
