"use client";

import { type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className = "",
  id,
  ...props
}: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-body"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full rounded-[var(--radius-lg)] border border-surface-border bg-page px-3.5 py-2.5 text-sm text-heading placeholder:text-muted transition-colors focus:border-smaragd focus:outline-none focus:ring-1 focus:ring-smaragd resize-y min-h-[80px] ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
