import { notFound } from "next/navigation";
import { getSessionResults } from "../../actions";
import { createClient } from "@/lib/supabase/server";
import ResultsClient from "./ResultsClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return {
    title: "Jouw APAC Resultaten — Radical Portal",
    description: "Bekijk je persoonlijke APAC-scores en ontdek je menselijke kwaliteiten.",
    // Prevent indexing of individual results
    robots: { index: false, follow: false },
  };
}

export default async function ApacResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const [results, { data: { user } }] = await Promise.all([
    getSessionResults(sessionId),
    createClient().then((sb) => sb.auth.getUser()),
  ]);

  if (!results) {
    notFound();
  }

  const isLoggedIn = !!user;

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-3xl">
        <ResultsClient
          scores={results.scores}
          gecombineerd={results.gecombineerd}
          sessionId={sessionId}
          isLoggedIn={isLoggedIn}
        />
      </div>
    </main>
  );
}

