import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/app/dashboard/actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Coaching — Radical Portal",
};

export default async function SupportPage() {
  const data = await getDashboardData();
  if (!data) redirect("/auth/login");

  if (!data.scores) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-8">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-smaragd/10">
            <svg
              className="h-8 w-8 text-smaragd"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <h1 className="mt-6 font-heading text-2xl font-bold text-heading">
            Coaching nog niet beschikbaar
          </h1>
          <p className="mt-3 text-muted">
            Je kunt pas een gesprek inplannen met Nelieke nadat je de APAC-test
            hebt gemaakt. De test duurt ongeveer 20 minuten.
          </p>
          <Link
            href="/apac"
            className="mt-8 inline-flex items-center gap-2 rounded-[8px] bg-smaragd px-6 py-3 font-semibold text-white shadow transition-all hover:bg-smaragd-dark"
          >
            Start de APAC-test
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-smaragd">
            Persoonlijke begeleiding
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-heading">
            Coaching & Ondersteuning
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-muted">
            Jouw APAC-resultaten zijn het startpunt. Samen met Nelieke ontdek
            je hoe je je menselijke kwaliteiten kunt inzetten in de AI-sector.
          </p>
        </div>

        {/* Nelieke profile card */}
        <div className="mt-10 rounded-[12px] border border-surface-border bg-surface p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Avatar placeholder */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-smaragd/10">
              <span className="font-heading text-2xl font-bold text-smaragd">
                N
              </span>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-heading">
                Nelieke
              </h2>
              <p className="mt-1 text-sm font-medium text-smaragd">
                Personal Coach &amp; Recruitment Specialist
              </p>
              <p className="mt-3 text-body leading-relaxed">
                Nelieke begeleidt AI-professionals bij het ontdekken van hun
                unieke kwaliteiten. Met jarenlange ervaring in recruitment en
                coaching helpt ze je om de brug te slaan tussen wie je bent als
                mens en wat de AI-sector nodig heeft.
              </p>
              <p className="mt-3 text-body leading-relaxed">
                In een persoonlijk gesprek bespreek je je APAC-resultaten,
                carrieremogelijkheden en hoe je je sterke punten kunt inzetten.
              </p>
            </div>
          </div>
        </div>

        {/* What to expect */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "APAC Bespreking",
              description:
                "Loop samen door je resultaten. Wat betekenen ze voor jouw carriere?",
              icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              ),
            },
            {
              title: "Ontwikkeladvies",
              description:
                "Concrete tips om je zwakkere punten te versterken en je sterke punten in te zetten.",
              icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              ),
            },
            {
              title: "Carriere Match",
              description:
                "Ontdek welke rollen en bedrijven het beste bij jouw profiel passen.",
              icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              ),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[12px] border border-surface-border bg-surface p-5 text-center"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[8px] bg-smaragd/10 text-smaragd">
                {item.icon}
              </div>
              <h3 className="mt-3 font-heading font-bold text-heading">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-muted">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Calendly CTA */}
        <div className="mt-10 rounded-[12px] border border-smaragd/30 bg-gradient-to-br from-smaragd/10 to-surface p-8 text-center sm:p-10">
          <h2 className="font-heading text-2xl font-bold text-heading">
            Plan een gesprek
          </h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Kies een moment dat je uitkomt. Het gesprek duurt ongeveer 30
            minuten en is volledig gratis.
          </p>
          <a
            href="https://calendly.com/radicalrecruitment"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-[8px] bg-smaragd px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-smaragd-dark hover:shadow-xl"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Boek een gesprek met Nelieke
          </a>
        </div>

        {/* FAQ */}
        <div className="mt-10">
          <h2 className="font-heading text-xl font-bold text-heading">
            Veelgestelde vragen
          </h2>
          <div className="mt-4 space-y-4">
            {[
              {
                q: "Is het gesprek echt gratis?",
                a: "Ja, het eerste kennismakingsgesprek is altijd gratis en vrijblijvend.",
              },
              {
                q: "Wat als ik nog geen APAC-test heb gemaakt?",
                a: "Je kunt altijd een gesprek plannen, maar we raden aan om eerst de test te maken zodat Nelieke je resultaten kan bespreken.",
              },
              {
                q: "Hoe lang duurt een coachtraject?",
                a: "Dat hangt af van je doelen. Het eerste gesprek bepaalt samen wat je nodig hebt — van een eenmalig advies tot een doorlopend traject.",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="group rounded-[8px] border border-surface-border bg-surface"
              >
                <summary className="cursor-pointer px-5 py-4 font-medium text-heading">
                  {faq.q}
                </summary>
                <p className="px-5 pb-4 text-sm text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
