import { getAdminKpis } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Beheerder — Radical Portal" };

const STATUS_COLORS: Record<string, string> = {
  prospect: "bg-surface-light text-muted",
  in_selectie: "bg-coral/10 text-coral",
  radical: "bg-smaragd/10 text-smaragd",
  alumni: "bg-surface-light text-muted",
};

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}u geleden`;
  return `${Math.floor(hours / 24)}d geleden`;
}

export default async function AdminHomePage() {
  const kpis = await getAdminKpis();

  const leerfaseProgress = Math.min(
    100,
    Math.round((kpis.poortTeller / kpis.poortDrempel) * 100)
  );

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold text-heading">
            Beheerder Dashboard
          </h1>
          <p className="mt-1 text-muted">
            Overzicht van kandidaten, APAC-resultaten en portal-activiteit.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Totaal kandidaten"
            value={kpis.totalKandidaten}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            }
            color="smaragd"
          />
          <KpiCard
            label="APAC tests (week)"
            value={kpis.apacThisWeek}
            sub={`${kpis.apacThisMonth} deze maand`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            }
            color="coral"
          />
          <KpiCard
            label="APAC tests (totaal)"
            value={kpis.apacTotal}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="smaragd"
          />
          <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted">De Poort</p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  kpis.poortFase === "learning"
                    ? "bg-smaragd/10 text-smaragd"
                    : "bg-coral/10 text-coral"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    kpis.poortFase === "learning" ? "bg-smaragd" : "bg-coral"
                  }`}
                />
                {kpis.poortFase === "learning" ? "Leerfase" : "Actieve fase"}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-heading">
              {kpis.poortTeller}
              <span className="ml-1 text-base font-normal text-muted">
                / {kpis.poortDrempel}
              </span>
            </p>
            <div className="mt-3 h-1.5 w-full rounded-full bg-surface-light">
              <div
                className="h-1.5 rounded-full bg-smaragd transition-all duration-700"
                style={{ width: `${leerfaseProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-surface-border bg-surface shadow-sm">
          <div className="border-b border-surface-border px-6 py-4">
            <h2 className="font-heading text-lg font-bold text-heading">
              Recente activiteit
            </h2>
          </div>
          {kpis.recenteActiviteit.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted">
              Nog geen activiteit geregistreerd.
            </p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {kpis.recenteActiviteit.map((item) => (
                <li key={item.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-smaragd/10">
                    <svg className="h-4 w-4 text-smaragd" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-body">
                      {item.beschrijving}
                    </p>
                    {item.kandidaatNaam && (
                      <p className="mt-0.5 text-xs text-muted">
                        {item.kandidaatNaam}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {formatRelative(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: "smaragd" | "coral";
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            color === "smaragd"
              ? "bg-smaragd/10 text-smaragd"
              : "bg-coral/10 text-coral"
          }`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-heading">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}
