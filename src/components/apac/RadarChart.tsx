"use client";

/**
 * APAC Radarchart — de WOW-factor van het portal.
 *
 * Elke dimensie heeft zijn eigen kleur:
 * - Adaptability: smaragd (#2ed573)
 * - Personality: coral (#E6734F)
 * - Awareness: blauw (#3B82F6)
 * - Connection: paars (#8B5CF6)
 *
 * Gradient fill van smaragd → coral voor de brand identity.
 */

import { useEffect, useState } from "react";
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import type { ApacScores } from "@/lib/apac/types";
import { DIMENSION_LABELS, DIMENSION_COLORS } from "@/lib/apac/scoring";
import type { ApacDimension } from "@/lib/apac/types";

interface RadarChartProps {
  scores: ApacScores;
  size?: number;
  animated?: boolean;
}

// Map label back to dimension key for color lookup
const LABEL_TO_DIM: Record<string, ApacDimension> = {
  [DIMENSION_LABELS.adaptability]: "adaptability",
  [DIMENSION_LABELS.personality]: "personality",
  [DIMENSION_LABELS.awareness]: "awareness",
  [DIMENSION_LABELS.connection]: "connection",
};

export default function RadarChart({
  scores,
  size = 360,
  animated = true,
}: RadarChartProps) {
  const [mounted, setMounted] = useState(false);
  const [animatedScores, setAnimatedScores] = useState<ApacScores>(
    animated
      ? { adaptability: 0, personality: 0, awareness: 0, connection: 0 }
      : scores
  );

  useEffect(() => {
    setMounted(true);
    if (animated) {
      const timer = setTimeout(() => setAnimatedScores(scores), 100);
      return () => clearTimeout(timer);
    }
  }, [scores, animated]);

  if (!mounted) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <div className="h-16 w-16 animate-pulse rounded-full bg-smaragd/10" />
      </div>
    );
  }

  const data = [
    { dimension: DIMENSION_LABELS.adaptability, score: animatedScores.adaptability, fullMark: 10 },
    { dimension: DIMENSION_LABELS.personality, score: animatedScores.personality, fullMark: 10 },
    { dimension: DIMENSION_LABELS.awareness, score: animatedScores.awareness, fullMark: 10 },
    { dimension: DIMENSION_LABELS.connection, score: animatedScores.connection, fullMark: 10 },
  ];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Multi-color glow behind chart */}
      <div
        className="absolute inset-0 rounded-full opacity-25 blur-[50px]"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, #2ed573 0%, transparent 50%), " +
            "radial-gradient(circle at 70% 60%, #E6734F 0%, transparent 50%), " +
            "radial-gradient(circle at 30% 70%, #8B5CF6 0%, transparent 50%)",
        }}
      />

      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
          <PolarGrid
            stroke="var(--bg-surface-border)"
            strokeDasharray="3 3"
            gridType="polygon"
          />
          <PolarAngleAxis
            dataKey="dimension"
            tick={({ x, y, payload }) => {
              const dim = LABEL_TO_DIM[payload.value];
              const color = dim ? DIMENSION_COLORS[dim] : "#2ed573";
              return (
                <CustomAxisTick
                  x={Number(x)}
                  y={Number(y)}
                  value={payload.value}
                  score={data.find((d) => d.dimension === payload.value)?.score ?? 0}
                  color={color}
                />
              );
            }}
          />
          <Radar
            name="APAC"
            dataKey="score"
            stroke="url(#radarStroke)"
            strokeWidth={2.5}
            fill="url(#radarFill)"
            fillOpacity={0.3}
            animationDuration={animated ? 1200 : 0}
            animationEasing="ease-out"
          />
          <defs>
            {/* Gradient stroke: smaragd → coral */}
            <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2ed573" />
              <stop offset="50%" stopColor="#E6734F" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            {/* Gradient fill: smaragd → coral blend */}
            <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2ed573" stopOpacity={0.5} />
              <stop offset="50%" stopColor="#E6734F" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.1} />
            </radialGradient>
          </defs>
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomAxisTick({
  x,
  y,
  value,
  score,
  color,
}: {
  x: number;
  y: number;
  value: string;
  score: number;
  color: string;
}) {
  const percentage = Math.round(score * 10);

  const offset = 20;
  const centerX = 180;
  const centerY = 180;
  const angle = Math.atan2(y - centerY, x - centerX);
  const labelX = x + Math.cos(angle) * offset;
  const labelY = y + Math.sin(angle) * offset;

  return (
    <g>
      <text
        x={labelX}
        y={labelY - 8}
        textAnchor="middle"
        className="fill-label text-xs font-semibold"
        style={{ fontFamily: "'Afacad Flux', sans-serif" }}
      >
        {value}
      </text>
      <text
        x={labelX}
        y={labelY + 8}
        textAnchor="middle"
        className="text-sm font-bold"
        style={{ fill: color, fontFamily: "'Afacad Flux', sans-serif" }}
      >
        {percentage}%
      </text>
    </g>
  );
}
