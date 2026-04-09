"use client";

import type { Taak } from "@/lib/types/crm";
import { TakenLijst } from "@/components/crm/layout/TakenLijst";
import { Card } from "@/components/crm/ui/Card";

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, hoog: 1, normaal: 2, laag: 3 };

interface Props {
  initialTaken: Taak[];
}

export default function TakenClient({ initialTaken }: Props) {
  const open = initialTaken.filter((t) => t.status === "open").length;
  const inProgress = initialTaken.filter((t) => t.status === "in_progress").length;
  const urgent = initialTaken.filter((t) => t.prioriteit === "urgent" && t.status !== "afgerond").length;
  const overdue = initialTaken.filter((t) => {
    if (!t.deadline || t.status === "afgerond") return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(t.deadline + "T00:00:00") < today;
  }).length;

  // Sort for display
  const sorted = [...initialTaken].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.prioriteit] ?? 2;
    const pb = PRIORITY_ORDER[b.prioriteit] ?? 2;
    return pa - pb;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-heading">Taken</h1>
        <p className="mt-1 text-sm text-muted">
          {open} open · {inProgress} in progress
          {urgent > 0 && ` · ${urgent} urgent`}
          {overdue > 0 && ` · ${overdue} verlopen`}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card padding="sm">
          <p className="text-xs text-body">Open</p>
          <p className="mt-1 text-lg font-bold text-heading">{open}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-body">In Progress</p>
          <p className="mt-1 text-lg font-bold text-smaragd">{inProgress}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-body">Urgent</p>
          <p className={`mt-1 text-lg font-bold ${urgent > 0 ? "text-red-500" : "text-heading"}`}>{urgent}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-body">Verlopen</p>
          <p className={`mt-1 text-lg font-bold ${overdue > 0 ? "text-red-500" : "text-heading"}`}>{overdue}</p>
        </Card>
      </div>

      {/* Taken lijst */}
      <TakenLijst initialTaken={sorted} />
    </div>
  );
}
