import { useEffect, useState } from "react";
import type { ApacDimension } from "@/lib/apac/types";
import { DIMENSION_LABELS, DIMENSION_COLORS, scoreToPercentage } from "@/lib/apac/scoring";

interface ScoreCardProps {
  dimension: ApacDimension;
  score: number;
  description?: string;
  animated?: boolean;
}

export default function ScoreCard({ dimension, score, description, animated = false }: ScoreCardProps) {
  const label = DIMENSION_LABELS[dimension];
  const color = DIMENSION_COLORS[dimension];
  const percentage = scoreToPercentage(score);
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (!animated) {
      setDisplayPercentage(percentage);
      setBarWidth(percentage);
      return;
    }

    // Reset to 0 immediately to prevent flicker
    setDisplayPercentage(0);
    setBarWidth(0);

    const barTimer = setTimeout(() => setBarWidth(percentage), 100);

    const duration = 1000;
    const start = Date.now();
    let raf: number;

    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPercentage(Math.round(eased * percentage));
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
  }, [animated, percentage]);

  return (
    <div className="rounded-[8px] border border-surface-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold" style={{ color }}>
          {label}
        </h3>
        <span className="text-2xl font-bold text-heading tabular-nums">
          {displayPercentage}%
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
