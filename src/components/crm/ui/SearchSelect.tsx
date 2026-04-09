"use client";

import { useState, useRef, useEffect } from "react";

interface SearchSelectProps {
  label?: string;
  name: string;
  value?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  onChange?: (value: string) => void;
  required?: boolean;
}

export function SearchSelect({
  label,
  name,
  value = "",
  placeholder = "Zoeken...",
  options,
  onChange,
  required,
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selectedLabel = options.find((o) => o.value === selected)?.label;

  const handleSelect = (val: string) => {
    setSelected(val);
    onChange?.(val);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <p className="block text-sm font-medium text-body">
          {label}
        </p>
      )}
      <input type="hidden" name={name} value={selected} />

      {/* Trigger / Display */}
      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className={`w-full text-left rounded-[var(--radius-default)] border border-surface-border bg-page px-3.5 py-2.5 text-sm transition-colors hover:border-smaragd/50 ${
            selected ? "text-heading" : "text-muted"
          }`}
        >
          {selectedLabel || placeholder}
        </button>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsOpen(false);
                setQuery("");
              }
              if (e.key === "Enter" && filtered.length === 1) {
                e.preventDefault();
                handleSelect(filtered[0].value);
              }
            }}
            placeholder={placeholder}
            className="w-full rounded-[var(--radius-default)] border border-smaragd bg-page px-3.5 py-2.5 text-sm text-heading outline-none ring-2 ring-smaragd/30"
          />

          {/* Dropdown */}
          <div className="absolute z-[100] top-full left-0 right-0 mt-1 rounded-[var(--radius-lg)] bg-surface shadow-lg max-h-48 overflow-y-auto border border-surface-border">
            {filtered.length === 0 ? (
              <p className="px-3.5 py-3 text-sm text-muted">
                Geen resultaten
              </p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors hover:bg-surface-light ${
                    opt.value === selected
                      ? "text-smaragd font-medium"
                      : "text-heading"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {required && !selected && (
        <input type="text" required value="" className="sr-only" tabIndex={-1} onChange={() => {}} />
      )}
    </div>
  );
}
