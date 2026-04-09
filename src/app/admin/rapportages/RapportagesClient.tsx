"use client";

import type { RapportageData } from "@/app/admin/actions/rapportages";
import { Card } from "@/components/crm/ui/Card";
import { KPICards } from "@/components/crm/charts/KPICards";
import { OmzetChart } from "@/components/crm/charts/OmzetChart";
import { PlaatsingenChart } from "@/components/crm/charts/PlaatsingenChart";
import { PipelineChart } from "@/components/crm/charts/PipelineChart";

interface Props {
  data: RapportageData;
}

export default function RapportagesClient({ data }: Props) {
  const year = new Date().getFullYear();

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Rapportages</h1>
        <p className="mt-1 text-sm text-muted">
          Prestaties, omzet en conversieratios — {year}
        </p>
      </div>

      <KPICards kpis={data.kpis} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-smaragd">Omzet per Maand</h2>
          <OmzetChart data={data.omzetPerMaand} />
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold text-smaragd">Afgeronde Deals per Maand</h2>
          <PlaatsingenChart data={data.plaatsingenPerMaand} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-smaragd">Permanente Werving</h2>
          <PipelineChart data={data.pipelinePermanent} />
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold text-smaragd">Interim Plaatsing</h2>
          <PipelineChart data={data.pipelineInterim} />
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold text-smaragd">Project Detachering</h2>
          <PipelineChart data={data.pipelineProject} />
        </Card>
      </div>
    </div>
  );
}
