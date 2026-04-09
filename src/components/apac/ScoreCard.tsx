"use client";

import { useEffect, useState } from "react";
import type { ApacDimension } from "@/lib/apac/types";
import { DIMENSION_LABELS, DIMENSION_COLORS, scoreToPercentage } from "@/lib/apac/scoring";

interface ScoreCardProps {
  dimension: ApacDimension;
  score: number;
  maxScore: number;
  description?: string;
  animated?: boolean;
  /** Display mode: "points" shows 22/30, "percentage" shows 73% */
  displayMode?: "points" | "percentage";
}

export default function ScoreCard({
  dimension,
  score,
  maxScore,
  description,
  animated = false,
  displayMode = "points",
}: ScoreCardProps) {
  const label = DIMENSION_LABELS[dimension];
  const color = DIMENSION_COLORS[dimension];
  const percentage = scoreToPercentage(score, maxScore);
  const [displayValue, setDisplayValue] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  const targetValue = displayMode === "points" ? score : percentage;

  useEffect(() => {
    if (!animated) {
      setDisplayValue(targetValue);
      setBarWidth(percentage);
      return;
    }

    setDisplayValue(0);
    setBarWidth(0);

    const barTimer = setTimeout(() => setBarWidth(percentage), 100);

    const duration = 1000;
    const start = Date.now();
    let raf: number;

    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * targetValue));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    const startTimer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 50);

    return () => {
      clearTimeout(barTimer);
      clearTimeout(startTimer);
      cancelAnimationFrame(raf);
    };
  }, [animated, percentage, targetValue]);

  return (
    <div className="rounded-[8px] border border-surface-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold" style={{ color }}>
          {label}
        </h3>
        <span className="text-2xl font-bold text-heading tabular-nums">
          {displayMode === "points" ? (
            <>{displayValue}<span className="text-base font-normal text-muted">/{maxScore}</span></>
          ) : (
            <>{displayValue}%</>
          )}
        </span>
      </div>
      {/* Score bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-light">
        <div
          className="h-2 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${barWidth}%`, backgroundColor: color }}
        />
      </div>
      {description && (
        <p className="mt-3 text-sm text-muted">{description}</p>
      )}
    </div>
  );
}
