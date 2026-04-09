"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface PipelineChartProps {
  data: { stage: string; count: number; color: string }[];
}

export function PipelineChart({ data }: PipelineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 45)}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
        <XAxis
          type="number"
          tick={{ fill: "#A1A1AA", fontSize: 12 }}
          axisLine={{ stroke: "#27272A" }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="stage"
          tick={{ fill: "#A1A1AA", fontSize: 11 }}
          axisLine={{ stroke: "#27272A" }}
          width={110}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div style={{ backgroundColor: "#18181B", border: "1px solid #3F3F46", borderRadius: 8, padding: "8px 12px" }}>
                <p style={{ color: "#FAFAFA", margin: 0, fontWeight: 600 }}>{label}</p>
                <p style={{ color: "#2ed573", margin: "4px 0 0" }}>Aantal: {payload[0].value}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
