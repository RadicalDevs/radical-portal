import { redirect } from "next/navigation";
import { getDashboardData, getRelatedArticles } from "../actions";
import ResultsClient from "./ResultsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Jouw Resultaten — Radical Network",
};

export default async function DashboardResultsPage() {
  const data = await getDashboardData();

  if (!data) redirect("/auth/login");
  if (!data.scores || !data.maxScores) redirect("/apac");

  const articles = await getRelatedArticles(data.scores);

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 bg-radial-smaragd opacity-60" />
      <div className="pointer-events-none absolute left-1/3 top-[15%] h-[500px] w-[500px] rounded-full bg-smaragd/6 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 top-[30%] h-[400px] w-[400px] rounded-full bg-coral/5 blur-[100px] animate-float-slow" />
      <div className="pointer-events-none absolute left-[15%] bottom-[20%] h-[350px] w-[350px] rounded-full bg-[#8B5CF6]/4 blur-[100px] animate-float-delay" />

      <div className="relative px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <ResultsClient
            kandidaatId={data.user.kandidaatId}
            firstName={data.user.firstName}
            initialScores={data.scores}
            maxScores={data.maxScores}
            articles={articles}
          />
        </div>
      </div>
    </main>
  );
}
