import { Card } from "@/components/crm/ui/Card";

interface KPICardsProps {
  kpis: {
    totaleOmzet: number;
    gemiddeldeTimeToHire: number;
    conversieRatio: number;
    openVacatures: number;
    actieveKandidaten: number;
    dealsPipeline: number;
  };
}

export function KPICards({ kpis }: KPICardsProps) {
  const items = [
    { label: "Totale Omzet", value: `€${kpis.totaleOmzet.toLocaleString("nl-NL")}`, color: "text-smaragd" },
    { label: "Conversieratio", value: `${kpis.conversieRatio}%`, color: "text-smaragd" },
    { label: "Gem. Time to Hire", value: kpis.gemiddeldeTimeToHire > 0 ? `${kpis.gemiddeldeTimeToHire} dagen` : "—", color: "text-coral" },
    { label: "Open Vacatures", value: String(kpis.openVacatures), color: "text-coral" },
    { label: "Actieve Kandidaten", value: String(kpis.actieveKandidaten), color: "text-heading" },
    { label: "Deals in Pipeline", value: String(kpis.dealsPipeline), color: "text-heading" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <Card key={item.label} padding="sm">
          <p className="text-xs text-body">{item.label}</p>
          <p className={`mt-1 text-xl font-bold ${item.color}`}>{item.value}</p>
        </Card>
      ))}
    </div>
  );
}
