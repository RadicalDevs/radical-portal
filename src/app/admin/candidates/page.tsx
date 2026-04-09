import { getAdminKandidaten, getApacMaxScores } from "../actions";
import CandidatesClient from "./CandidatesClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kandidaten — Radical Network" };

export default async function AdminCandidatesPage() {
  const [kandidaten, maxScores] = await Promise.all([
    getAdminKandidaten(),
    getApacMaxScores(),
  ]);

  return (
    <main className="flex flex-1 flex-col px-4 py-6">
      <div className="w-full space-y-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-heading">
            Kandidaten Overzicht
          </h1>
          <p className="mt-1 text-muted">
            {kandidaten.length} kandidaten in de database.
          </p>
        </div>

        <CandidatesClient kandidaten={kandidaten} maxScores={maxScores} />
      </div>
    </main>
  );
}
