"use client";

import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
}

const paddingStyles = {
  sm: "p-4",
  md: "p-7",
  lg: "p-8",
};

export function Card({
  padding = "md",
  hover = true,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] bg-surface shadow-md transition-all duration-200 ${
        hover ? "hover:-translate-y-0.5 hover:shadow-lg" : ""
      } ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
