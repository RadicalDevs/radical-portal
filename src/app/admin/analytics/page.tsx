import { getAnalyticsData } from "../actions";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — Radical Network" };

export default async function AdminAnalyticsPage() {
  const data = await getAnalyticsData();

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-heading">APAC Analytics</h1>
          <p className="mt-1 text-muted">
            Score-distributies, trends en inzichten over alle {data.kpis.totaalGetest} geteste kandidaten.
          </p>
        </div>
        <AnalyticsClient data={data} />
      </div>
    </main>
  );
}
