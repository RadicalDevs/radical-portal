"use client";

interface SkeletonProps {
  variant?: "text" | "card" | "kpi" | "table-row";
  width?: string;
  count?: number;
}

function SkeletonLine({ width = "100%" }: { width?: string }) {
  return <div className="skeleton h-4" style={{ width }} />;
}

function SkeletonKPI() {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface shadow-md p-7 space-y-3">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-8 w-20" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[var(--radius-lg)] bg-surface shadow-md p-7 space-y-3">
      <div className="skeleton h-5 w-32" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-3/4" />
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <div className="flex gap-4 px-4 py-3">
      <div className="skeleton h-4 w-1/4" />
      <div className="skeleton h-4 w-1/4" />
      <div className="skeleton h-4 w-1/6" />
      <div className="skeleton h-4 w-1/6" />
    </div>
  );
}

export function Skeleton({ variant = "text", width, count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count });

  switch (variant) {
    case "kpi":
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((_, i) => (
            <SkeletonKPI key={i} />
          ))}
        </div>
      );
    case "card":
      return (
        <div className="space-y-4">
          {items.map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    case "table-row":
      return (
        <div className="rounded-[var(--radius-lg)] bg-surface shadow-md overflow-hidden">
          <div className="flex gap-4 px-4 py-3 bg-surface-light">
            <div className="skeleton h-3 w-1/4" />
            <div className="skeleton h-3 w-1/4" />
            <div className="skeleton h-3 w-1/6" />
            <div className="skeleton h-3 w-1/6" />
          </div>
          {items.map((_, i) => (
            <SkeletonTableRow key={i} />
          ))}
        </div>
      );
    default:
      return (
        <div className="space-y-2">
          {items.map((_, i) => (
            <SkeletonLine key={i} width={width} />
          ))}
        </div>
      );
  }
}
