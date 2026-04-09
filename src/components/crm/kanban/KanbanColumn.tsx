"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: ReactNode;
  description?: string;
  isInvoiceTrigger?: boolean;
  invoiceLabel?: string;
  isCloseStage?: boolean;
}

export function KanbanColumn({
  id,
  title,
  color,
  count,
  children,
  description,
  isInvoiceTrigger = false,
  invoiceLabel,
  isCloseStage = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const dotColor = isInvoiceTrigger
    ? "#1B4D3E"
    : isCloseStage
    ? "#9CA3AF"
    : color;

  return (
    <div className="flex w-72 flex-shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-3 flex items-center gap-2 relative group">
        <span
          className="h-3 w-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <h3 className="text-base font-bold text-heading truncate">
          {title}
        </h3>
        <span className="rounded-full bg-surface-light px-2 py-0.5 text-sm font-medium text-body flex-shrink-0">
          {count}
        </span>

        {/* Hover ? icon for description */}
        {description && (
          <div className="relative ml-auto flex-shrink-0 group/tooltip">
            <div className="h-5 w-5 rounded-full flex items-center justify-center text-transparent group-hover:text-muted group-hover:bg-surface-light transition-all cursor-default">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <div className="absolute top-7 right-0 z-50 hidden group-hover/tooltip:block w-56 rounded-lg bg-surface border border-surface-border px-3 py-2 text-xs text-body shadow-lg">
              {description}
              {isInvoiceTrigger && invoiceLabel && (
                <span className="mt-1 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white w-fit" style={{ backgroundColor: "#1B4D3E" }}>
                  {invoiceLabel}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Invoice badge always visible */}
        {isInvoiceTrigger && invoiceLabel && !description && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white flex-shrink-0" style={{ backgroundColor: "#1B4D3E" }}>
            {invoiceLabel}
          </span>
        )}
      </div>

      {/* Invoice badge below header when description exists */}
      {isInvoiceTrigger && invoiceLabel && description && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: "#1B4D3E" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
              <path d="M12 17.5v-11" />
            </svg>
            {invoiceLabel}
          </span>
        </div>
      )}

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-3 rounded-xl border-2 border-dashed p-3 min-h-[200px] transition-colors ${
          isOver
            ? "border-smaragd/50 bg-smaragd/5"
            : isInvoiceTrigger
            ? "border-[#1B4D3E]/20 bg-[#1B4D3E]/5"
            : isCloseStage
            ? "border-gray-300/20 bg-gray-100/5"
            : "border-transparent bg-surface-light/30"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
