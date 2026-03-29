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
        {/* Chapeau */}
        <ChapeauText gecombineerd={results.gecombineerd} />

        {/* Splash → Radar Chart → Score Cards → Combined Score (all animated) */}
        <div className="mt-8">
          <ResultsClient
            scores={results.scores}
            gecombineerd={results.gecombineerd}
            sessionId={sessionId}
            isLoggedIn={isLoggedIn}
          />
        </div>

      </div>
    </main>
  );
}

/** Dynamische chapeau tekst op basis van gecombineerde score */
function ChapeauText({ gecombineerd }: { gecombineerd: number }) {
  let title: string;
  let subtitle: string;

  if (gecombineerd >= 8) {
    title = "Uitzonderlijk profiel";
    subtitle =
      "Je scoort bovengemiddeld op alle menselijke kwaliteiten. Je combineert aanpassingsvermogen, persoonlijkheid, bewustzijn en verbinding op een manier die zeldzaam is in de AI-sector.";
  } else if (gecombineerd >= 6.5) {
    title = "Sterk profiel";
    subtitle =
      "Je menselijke kwaliteiten vormen een solide basis. Je hebt duidelijke sterke punten en weet deze in te zetten. Ontdek hieronder waar je je nog verder kunt ontwikkelen.";
  } else if (gecombineerd >= 5) {
    title = "Veelbelovend profiel";
    subtitle =
      "Je hebt een interessante mix van kwaliteiten. Er zit potentie in je profiel — met de juiste begeleiding kun je hier veel meer uit halen.";
  } else {
    title = "Jouw startpunt";
    subtitle =
      "Iedereen begint ergens. Je APAC-resultaten laten zien waar je nu staat en waar de meeste groei mogelijk is. Dit is het begin van je ontwikkeltraject.";
  }

  return (
    <div className="text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-smaragd">
        Jouw resultaten
      </p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-heading sm:text-4xl">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-lg text-muted">
        {subtitle}
      </p>
    </div>
  );
}
