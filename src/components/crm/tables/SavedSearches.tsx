"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/crm/ui/Button";

export interface FilterState {
  searchQuery: string;
  bFilter: boolean | null;
  poolFilter: string | null;
  salaryMin: number | "";
  salaryMax: number | "";
  selectedVaardigheden: string[];
  selectedTags: string[];
}

interface SavedSearch {
  id: string;
  naam: string;
  filters: FilterState;
}

interface SavedSearchesProps {
  storageKey: string;
  currentFilters: FilterState;
  onLoad: (filters: FilterState) => void;
}

export function SavedSearches({ storageKey, currentFilters, onLoad }: SavedSearchesProps) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [naam, setNaam] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setSearches(JSON.parse(stored));
    } catch (e) { console.warn("[SavedSearches] read failed:", e); }
  }, [storageKey]);

  const persist = (updated: SavedSearch[]) => {
    setSearches(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleSave = () => {
    if (!naam.trim()) return;
    const newSearch: SavedSearch = {
      id: crypto.randomUUID(),
      naam: naam.trim(),
      filters: currentFilters,
    };
    persist([newSearch, ...searches]);
    setNaam("");
    setShowSave(false);
  };

  const handleDelete = (id: string) => {
    persist(searches.filter((s) => s.id !== id));
  };

  const hasFilters =
    currentFilters.searchQuery ||
    currentFilters.bFilter !== null ||
    currentFilters.poolFilter !== null ||
    currentFilters.salaryMin !== "" ||
    currentFilters.salaryMax !== "" ||
    currentFilters.selectedVaardigheden.length > 0 ||
    currentFilters.selectedTags.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Saved search chips */}
      {searches.map((s) => (
        <div key={s.id} className="group flex items-center gap-1">
          <button
            onClick={() => onLoad(s.filters)}
            className="rounded-full border border-surface-border bg-surface-light px-3 py-1 text-xs font-medium text-muted transition-all hover:border-smaragd hover:text-smaragd"
          >
            {s.naam}
          </button>
          <button
            onClick={() => handleDelete(s.id)}
            className="hidden text-xs text-muted hover:text-red-400 group-hover:inline"
          >
            ×
          </button>
        </div>
      ))}

      {/* Save button */}
      {hasFilters && !showSave && (
        <button
          onClick={() => setShowSave(true)}
          className="rounded-full border border-dashed border-surface-border px-3 py-1 text-xs text-muted transition-all hover:border-smaragd hover:text-smaragd"
        >
          + Zoekopdracht opslaan
        </button>
      )}

      {/* Save form */}
      {showSave && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Naam..."
            autoFocus
            className="w-32 rounded-lg border border-surface-border bg-surface-light px-2 py-1 text-xs text-heading outline-none focus:border-smaragd/50"
          />
          <Button onClick={handleSave} variant="secondary" className="text-xs py-1 px-2">
            Opslaan
          </Button>
          <button
            onClick={() => { setShowSave(false); setNaam(""); }}
            className="text-xs text-muted hover:text-heading"
          >
            Annuleren
          </button>
        </div>
      )}
    </div>
  );
}
