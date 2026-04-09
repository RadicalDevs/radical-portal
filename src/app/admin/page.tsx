import Link from "next/link";
import { getAdminKpis } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Beheerder — Radical Network" };

const STATUS_COLORS: Record<string, string> = {
  prospect: "bg-surface-light text-muted",
  in_selectie: "bg-coral/10 text-coral",
  radical: "bg-smaragd/10 text-smaragd",
  alumni: "bg-surface-light text-muted",
};

const PIPELINE_LABELS: Record<string, string> = {
  permanent: "Permanent",
  interim: "Interim",
  project: "Project",
};

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m geleden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}u geleden`;
  return `${Math.floor(hours / 24)}d geleden`;
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
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

        {/* APAC KPI cards */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            APAC & Kandidaten
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Totaal kandidaten"
              value={kpis.totalKandidaten}
              href="/admin/candidates"
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
              href="/admin/candidates"
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
              href="/admin/candidates"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="smaragd"
            />
            <Link href="/admin/poort" className="block rounded-xl border border-surface-border bg-surface p-5 shadow-sm hover:border-smaragd/40 hover:shadow-md transition-all">
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
            </Link>
          </div>
        </div>

        {/* CRM KPI cards */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            CRM & Pipeline
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Omzet (deze maand)"
              value={kpis.omzetMaand}
              sub={`${formatEuro(kpis.omzetTotaal)} totaal`}
              formatAsCurrency
              href="/admin/facturatie"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              }
              color="smaragd"
            />
            <KpiCard
              label="Pipeline waarde"
              value={kpis.pipelineWaarde}
              formatAsCurrency
              href="/admin/pipeline/interim"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
              }
              color="coral"
            />
            <KpiCard
              label="Open vacatures"
              value={kpis.openVacatures}
              href="/admin/vacatures"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                </svg>
              }
              color="smaragd"
            />
            <KpiCard
              label="Openstaande taken"
              value={kpis.openstaandeTaken}
              href="/admin/taken"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              }
              color="coral"
            />
          </div>
        </div>

        {/* Bottom widgets: Recente activiteit + Recente deals */}
        <div className="grid gap-6 lg:grid-cols-2">
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
                      <div className="flex items-center gap-2 mb-0.5">
                        {(() => {
                          const cfg: Record<string, { label: string; cls: string }> = {
                            notitie:         { label: "Notitie",   cls: "bg-surface-light text-muted" },
                            apac:            { label: "APAC",      cls: "bg-smaragd/10 text-smaragd" },
                            email:           { label: "E-mail",    cls: "bg-blue-500/10 text-blue-400" },
                            telefoon:        { label: "Telefoon",  cls: "bg-purple-500/10 text-purple-400" },
                            whatsapp:        { label: "WhatsApp",  cls: "bg-green-500/10 text-green-400" },
                            afspraak:        { label: "Afspraak",  cls: "bg-coral/10 text-coral" },
                            statuswijziging: { label: "Status",    cls: "bg-yellow-500/10 text-yellow-400" },
                          };
                          const c = cfg[item.type] ?? { label: item.type, cls: "bg-surface-light text-muted" };
                          return (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${c.cls}`}>
                              {c.label}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="line-clamp-2 text-sm text-body">{item.beschrijving}</p>
                      {item.kandidaatNaam && (
                        <p className="mt-0.5 text-xs text-muted">{item.kandidaatNaam}</p>
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

          {/* Recent deals */}
          <div className="rounded-xl border border-surface-border bg-surface shadow-sm">
            <div className="border-b border-surface-border px-6 py-4">
              <h2 className="font-heading text-lg font-bold text-heading">
                Recente deals
              </h2>
            </div>
            {kpis.recenteDeals.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted">
                Nog geen actieve deals.
              </p>
            ) : (
              <ul className="divide-y divide-surface-border">
                {kpis.recenteDeals.map((deal) => (
                  <li key={deal.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral/10">
                      <svg className="h-4 w-4 text-coral" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-heading truncate">
                        {deal.klantNaam}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted">
                          {PIPELINE_LABELS[deal.pipelineType] ?? deal.pipelineType}
                        </span>
                        <span className="text-xs text-muted">·</span>
                        <span className="text-xs text-muted capitalize">
                          {deal.stage.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {deal.potentieleOmzet != null ? (
                        <p className="text-sm font-semibold text-heading">
                          {formatEuro(deal.potentieleOmzet)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted">—</p>
                      )}
                      <p className="text-xs text-muted">
                        {formatRelative(deal.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
  formatAsCurrency,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: "smaragd" | "coral";
  formatAsCurrency?: boolean;
  href?: string;
}) {
  const displayValue = formatAsCurrency
    ? new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(value)
    : value;

  const content = (
    <>
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
      <p className="mt-2 text-2xl font-bold text-heading">{displayValue}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-surface-border bg-surface p-5 shadow-sm hover:border-smaragd/40 hover:shadow-md transition-all"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5 shadow-sm">
      {content}
    </div>
  );
}
