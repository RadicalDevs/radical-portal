"use client";

import { useDraggable } from "@dnd-kit/core";
import type { ReactNode } from "react";

interface KanbanCardProps {
  id: string;
  children: ReactNode;
  onClick?: () => void;
}

export function KanbanCard({ id, children, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{ touchAction: "none", userSelect: "none" }}
      className={`relative rounded-xl bg-surface p-4 shadow-card cursor-grab active:cursor-grabbing transition-[box-shadow,ring-color,transform,opacity] duration-150 ${
        isDragging
          ? "opacity-30 pointer-events-none"
          : "hover:shadow-card-hover hover:-translate-y-0.5 hover:ring-1 hover:ring-smaragd/30"
      }`}
    >
      {children}
    </div>
  );
}

/** Lightweight overlay card — rendered by DragOverlay, no dnd hooks */
export function KanbanCardOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface p-4 shadow-card-hover ring-2 ring-smaragd/40 cursor-grabbing rotate-[2deg]">
      {children}
    </div>
  );
}
