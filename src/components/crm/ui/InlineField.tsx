"use client";

import { useState, useRef, useEffect } from "react";

interface InlineFieldProps {
  label: string;
  value: string;
  onSave: (newValue: string) => Promise<void>;
  type?: "text" | "number" | "textarea" | "select";
  options?: { value: string; label: string }[];
  placeholder?: string;
  readOnly?: boolean;
}

export function InlineField({
  label,
  value,
  onSave,
  type = "text",
  options,
  placeholder,
  readOnly = false,
}: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(editValue);
    } catch (err) {
      console.error("InlineField save failed:", err);
      setEditValue(value);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type !== "textarea") {
      handleSave();
    } else if (e.key === "Enter" && type === "textarea" && e.metaKey) {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(value);
      setEditing(false);
    }
  };

  const displayValue = value || placeholder || "\u2014";

  if (editing) {
    const baseClass =
      "w-full bg-page text-sm text-heading rounded-[var(--radius-default)] px-3 py-2 outline-none ring-2 ring-smaragd/40 transition-all";

    if (type === "select" && options) {
      return (
        <div className="space-y-1">
          <p className="text-xs text-muted">{label}</p>
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              setSaving(true);
              onSave(e.target.value)
                .then(() => {
                  setSaving(false);
                  setEditing(false);
                })
                .catch((err) => {
                  console.error("InlineField select save failed:", err);
                  setEditValue(value);
                  setSaving(false);
                  setEditing(false);
                });
            }}
            onKeyDown={handleKeyDown}
            className={baseClass}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (type === "textarea") {
      return (
        <div className="space-y-1">
          <p className="text-xs text-muted">{label}</p>
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            rows={3}
            className={`${baseClass} resize-y min-h-[80px]`}
          />
          <p className="text-xs text-muted">Cmd+Enter om op te slaan</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="text-xs text-muted">{label}</p>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={baseClass}
        />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className={`mt-1 text-sm ${value ? "" : "text-muted"}`}>
          {displayValue}
        </p>
      </div>
    );
  }

  return (
    <div
      className="group cursor-text"
      onClick={() => !saving && setEditing(true)}
    >
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className={`text-sm ${value ? "" : "text-muted"} group-hover:text-smaragd transition-colors`}>
          {displayValue}
        </p>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-transparent group-hover:text-muted transition-colors flex-shrink-0"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </div>
    </div>
  );
}
