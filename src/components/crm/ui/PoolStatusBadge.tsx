"use client";

import { Badge } from "./Badge";
import type { PoolStatus } from "@/lib/types/crm";

const POOL_CONFIG: Record<PoolStatus, { label: string; variant: "smaragd" | "warning" | "default" | "purple" }> = {
  radical: { label: "Radical", variant: "smaragd" },
  in_selectie: { label: "In Selectie", variant: "warning" },
  prospect: { label: "Prospect", variant: "default" },
  alumni: { label: "Alumni", variant: "purple" },
};

interface PoolStatusBadgeProps {
  status: PoolStatus;
  size?: "sm" | "md";
}

export function PoolStatusBadge({ status, size = "md" }: PoolStatusBadgeProps) {
  const config = POOL_CONFIG[status] || POOL_CONFIG.prospect;
  return (
    <Badge variant={config.variant} className={size === "sm" ? "text-[10px] px-1.5 py-0" : ""}>
      {config.label}
    </Badge>
  );
}
