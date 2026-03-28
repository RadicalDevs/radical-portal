import type { ApacDimension } from "@/lib/apac/types";
import { DIMENSION_LABELS, DIMENSION_COLORS, scoreToPercentage } from "@/lib/apac/scoring";

interface ScoreCardProps {
  dimension: ApacDimension;
  score: number;
  description?: string;
}

export default function ScoreCard({ dimension, score, description }: ScoreCardProps) {
  const label = DIMENSION_LABELS[dimension];
  const color = DIMENSION_COLORS[dimension];
  const percentage = scoreToPercentage(score);

  return (
    <div className="rounded-[8px] border border-surface-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold" style={{ color }}>
          {label}
        </h3>
        <span className="text-2xl font-bold text-heading">{percentage}%</span>
      </div>
      {/* Score bar */}
      <div className="mt-3 h-2 w-full rounded-full bg-surface">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      {description && (
        <p className="mt-3 text-sm text-muted">{description}</p>
      )}
    </div>
  );
}
