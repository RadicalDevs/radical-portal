import { notFound } from "next/navigation";
import Link from "next/link";
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

        {/* CTA Block — alleen voor niet-ingelogde gebruikers */}
        {!isLoggedIn && (
          <div className="mt-12 rounded-[12px] border border-smaragd/30 bg-gradient-to-br from-smaragd/10 to-surface p-5 text-center sm:p-8 md:p-10">
            <h2 className="font-heading text-2xl font-bold text-heading">
              Wil je meer weten?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Maak een account aan voor de volledige uitleg van je scores,
              persoonlijke coaching door Nelieke, en toegang tot onze community van
              AI-professionals.
            </p>
            <Link
              href={`/auth/register?session=${sessionId}`}
              className="mt-6 inline-flex items-center gap-2 rounded-[8px] bg-smaragd px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-smaragd-dark hover:shadow-xl"
            >
              Maak een account aan
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="mt-4 text-xs text-muted">
              Gratis account — je resultaten worden gekoppeld aan je profiel.
            </p>
          </div>
        )}
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
