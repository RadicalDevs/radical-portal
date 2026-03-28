import { getAdminKandidaten } from "../actions";
import CandidatesClient from "./CandidatesClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kandidaten — Radical Portal" };

export default async function AdminCandidatesPage() {
  const kandidaten = await getAdminKandidaten();

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-heading">
            Kandidaten Overzicht
          </h1>
          <p className="mt-1 text-muted">
            {kandidaten.length} kandidaten in de database.
          </p>
        </div>

        <CandidatesClient kandidaten={kandidaten} />
      </div>
    </main>
  );
}
