"use client";

import { type HTMLAttributes } from "react";

type BadgeVariant =
  | "default"
  | "smaragd"
  | "coral"
  | "warning"
  | "danger"
  | "blue"
  | "purple"
  | "amber";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-light text-body",
  smaragd: "bg-smaragd/15 text-smaragd-dark dark:text-smaragd",
  coral: "bg-coral/15 text-coral-dark dark:text-coral",
  warning: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  danger: "bg-red-500/15 text-red-600 dark:text-red-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export function Badge({
  variant = "default",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
