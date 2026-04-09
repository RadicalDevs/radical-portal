"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "./Badge";

interface TagInputProps {
  label: string;
  tags: string[];
  onSave: (tags: string[]) => Promise<void>;
  variant?: "smaragd" | "coral" | "default";
  readOnly?: boolean;
}

export function TagInput({
  label,
  tags,
  onSave,
  variant = "smaragd",
  readOnly = false,
}: TagInputProps) {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  const addTag = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setShowInput(false);
      setInputValue("");
      return;
    }
    await onSave([...tags, trimmed]);
    setInputValue("");
    setShowInput(false);
  };

  const removeTag = async (tagToRemove: string) => {
    await onSave(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div>
      <p className="text-xs text-muted mb-2">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant={variant}>
            {tag}
            {!readOnly && (
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 opacity-50 hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                x
              </button>
            )}
          </Badge>
        ))}

        {!readOnly && (showInput ? (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTag();
              if (e.key === "Escape") {
                setShowInput(false);
                setInputValue("");
              }
            }}
            onBlur={addTag}
            placeholder="Typ en Enter..."
            className="rounded-[var(--radius-default)] bg-page px-2 py-1 text-sm text-heading outline-none ring-2 ring-smaragd/40 w-36"
          />
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className="h-6 w-6 rounded-full flex items-center justify-center text-muted hover:text-smaragd hover:bg-smaragd/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
