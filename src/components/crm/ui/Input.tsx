"use client";

import { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-body"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-[var(--radius-lg)] border border-surface-border bg-page px-3.5 py-2.5 text-sm text-heading placeholder:text-muted transition-colors focus:border-smaragd focus:outline-none focus:ring-1 focus:ring-smaragd ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
