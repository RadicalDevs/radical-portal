import { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-label">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`mt-1 block w-full rounded-[8px] border px-3 py-2 text-heading placeholder-muted focus:ring-1 ${
          error
            ? "border-red-700 focus:border-red-500 focus:ring-red-500"
            : "border-surface-border focus:border-smaragd focus:ring-smaragd"
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
