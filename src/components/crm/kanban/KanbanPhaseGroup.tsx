"use client";

import type { ReactNode } from "react";

interface KanbanPhaseGroupProps {
  label: string;
  color: string;
  borderColor: string;
  children: ReactNode;
}

export function KanbanPhaseGroup({
  label,
  color,
  borderColor,
  children,
}: KanbanPhaseGroupProps) {
  return (
    <div className="flex flex-col flex-shrink-0">
      {/* Phase header */}
      <div
        className="mb-3 flex items-center gap-2 rounded-t-lg px-3 py-1.5"
        style={{ backgroundColor: `${color}15`, borderBottom: `2px solid ${borderColor}` }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: borderColor }}
        />
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: borderColor }}
        >
          {label}
        </span>
      </div>

      {/* Columns within this phase */}
      <div className="flex gap-3 flex-1 items-stretch">
        {children}
      </div>
    </div>
  );
}
