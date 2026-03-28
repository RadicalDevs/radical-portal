import { type HTMLAttributes } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface text-label",
  success: "bg-smaragd/10 text-smaragd",
  warning: "bg-amber-900/30 text-amber-400",
  error: "bg-red-900/30 text-red-400",
  info: "bg-blue-900/30 text-blue-400",
};

export default function Badge({
  variant = "default",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
