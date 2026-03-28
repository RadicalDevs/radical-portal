export default function AdminAnalyticsPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="text-3xl font-heading font-bold text-heading">
          APAC Analytics
        </h1>
        <p className="mt-2 text-muted">
          Score-distributies, trends en inzichten over alle kandidaten.
        </p>

        {/* TODO: Histogrammen, gemiddelden, percentielen per dimensie */}
        <div className="mt-8 rounded-[8px] border border-surface-border bg-surface p-8 shadow-sm">
          <p className="text-center text-muted">
            Analytics dashboard wordt in volgende fase gebouwd.
          </p>
        </div>
      </div>
    </main>
  );
}
