"use client";

import { useCallback, useState, useEffect } from "react";

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export function SearchBar({
  placeholder = "Zoeken...",
  onSearch,
  debounceMs = 300,
}: SearchBarProps) {
  const [value, setValue] = useState("");

  const debouncedSearch = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => onSearch(query), debounceMs);
      };
    })(),
    [onSearch, debounceMs]
  );

  useEffect(() => {
    debouncedSearch(value);
  }, [value, debouncedSearch]);

  return (
    <div className="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border-0 bg-surface-light py-2.5 pl-10 pr-4 text-sm text-heading placeholder:text-muted transition-all focus:bg-surface focus:outline-none focus:ring-2 focus:ring-smaragd/30 focus:shadow-card"
      />
    </div>
  );
}
