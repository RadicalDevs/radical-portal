import ImportClient from "./ImportClient";

export const metadata = { title: "Tally Import — Radical Network" };

export default function AdminImportPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-heading">
            Tally Import
          </h1>
          <p className="mt-1 text-muted">
            Importeer APAC-resultaten handmatig of via CSV-bulk upload.
          </p>
        </div>

        <ImportClient />
      </div>
    </main>
  );
}
