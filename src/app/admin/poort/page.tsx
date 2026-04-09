import { getPoortPageData } from "../actions";
import PoortClient from "./PoortClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "De Poort — Radical Network" };

export default async function AdminPoortPage() {
  const data = await getPoortPageData();

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-heading">
            De Poort — Configuratie
          </h1>
          <p className="mt-1 text-muted">
            Twee-fasen selectiemodel: leerfase (eerste {data.config?.kandidaat_drempel ?? 150}{" "}
            kandidaten) → actieve fase.
          </p>
        </div>

        <PoortClient data={data} />
      </div>
    </main>
  );
}
