"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PlaatsingenChartProps {
  data: { maand: string; plaatsingen: number }[];
}

const TOOLTIP_STYLE = {
  backgroundColor: "#18181B",
  border: "1px solid #3F3F46",
  borderRadius: "8px",
  color: "#FAFAFA",
};

export function PlaatsingenChart({ data }: PlaatsingenChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
        <XAxis
          dataKey="maand"
          tick={{ fill: "#A1A1AA", fontSize: 12 }}
          axisLine={{ stroke: "#27272A" }}
        />
        <YAxis
          tick={{ fill: "#A1A1AA", fontSize: 12 }}
          axisLine={{ stroke: "#27272A" }}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => [String(value), "Plaatsingen"]}
        />
        <Area
          type="monotone"
          dataKey="plaatsingen"
          stroke="#E6734F"
          fill="#E6734F"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
