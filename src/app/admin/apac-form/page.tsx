import { getAdminApacQuestions, getFormConfig } from "../actions";
import ApacFormTabs from "./ApacFormTabs";

export const dynamic = "force-dynamic";

export const metadata = { title: "APAC Formulier — Radical Portal" };

export default async function AdminApacFormPage() {
  const [questions, formConfig] = await Promise.all([
    getAdminApacQuestions(),
    getFormConfig(),
  ]);

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-heading">
            APAC Formulier Beheer
          </h1>
          <p className="mt-1 text-muted">
            Bewerk vragen, de introductie, het dankjewel-scherm en notificaties.
          </p>
        </div>

        <ApacFormTabs questions={questions} formConfig={formConfig} />
      </div>
    </main>
  );
}
