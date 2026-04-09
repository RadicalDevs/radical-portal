"use client";

interface ViewToggleProps {
  viewMode: "grid" | "list";
  onChange: (mode: "grid" | "list") => void;
}

export function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-[var(--radius-default)] bg-surface-light p-1">
      <button
        onClick={() => onChange("grid")}
        className={`rounded-[var(--radius-sm)] p-2 transition-colors ${
          viewMode === "grid"
            ? "bg-surface text-smaragd shadow-md"
            : "text-muted hover:text-heading"
        }`}
        title="Kaartweergave"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
      </button>
      <button
        onClick={() => onChange("list")}
        className={`rounded-[var(--radius-sm)] p-2 transition-colors ${
          viewMode === "list"
            ? "bg-surface text-smaragd shadow-md"
            : "text-muted hover:text-heading"
        }`}
        title="Lijstweergave"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" x2="21" y1="6" y2="6" />
          <line x1="8" x2="21" y1="12" y2="12" />
          <line x1="8" x2="21" y1="18" y2="18" />
          <line x1="3" x2="3.01" y1="6" y2="6" />
          <line x1="3" x2="3.01" y1="12" y2="12" />
          <line x1="3" x2="3.01" y1="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
