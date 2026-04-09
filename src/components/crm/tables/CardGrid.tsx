"use client";

import { type ReactNode } from "react";
import { Avatar } from "@/components/crm/ui/Avatar";

export interface CardGridItem {
  id: string;
  title: string;
  subtitle?: string;
  avatarName?: string;
  badges?: ReactNode;
  details?: { label: string; value: string }[];
  status?: ReactNode;
  accent?: string; // left border color
  onClick?: () => void;
}

interface CardGridProps {
  items: CardGridItem[];
  emptyMessage?: string;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function CardGrid({ items, emptyMessage = "Geen items gevonden", selectedIds, onToggleSelect }: CardGridProps) {
  if (items.length === 0) {
    return (
      <p className="text-center text-muted py-12">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const isSelected = selectedIds?.has(item.id) ?? false;
        return (
        <div
          key={item.id}
          onClick={item.onClick}
          className={`relative rounded-xl bg-surface shadow-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover ${
            item.onClick ? "cursor-pointer" : ""
          } ${item.accent ? "border-l-4" : ""} ${isSelected ? "ring-2 ring-smaragd" : ""}`}
          style={item.accent ? { borderLeftColor: item.accent } : undefined}
        >
          {selectedIds && onToggleSelect && (
            <div
              className="absolute top-3 right-3 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(item.id)}
                className="h-4 w-4 rounded accent-smaragd cursor-pointer"
              />
            </div>
          )}
          <div className="flex items-start gap-3">
            {item.avatarName && (
              <Avatar name={item.avatarName} size="lg" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold truncate text-heading">
                  {item.title}
                </h3>
                {item.status}
              </div>
              {item.subtitle && (
                <p className="text-sm text-muted mt-0.5">
                  {item.subtitle}
                </p>
              )}
            </div>
          </div>

          {item.badges && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {item.badges}
            </div>
          )}

          {item.details && item.details.length > 0 && (
            <div className="mt-3 pt-3 border-t border-surface-border grid grid-cols-2 gap-2">
              {item.details.map((d) => (
                <div key={d.label}>
                  <p className="text-xs text-muted">{d.label}</p>
                  <p className="text-sm font-medium mt-0.5 text-body">{d.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
