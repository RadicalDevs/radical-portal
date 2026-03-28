import { Suspense } from "react";
import ApacStartClient from "./ApacStartClient";

export const metadata = {
  title: "APAC Assessment — Radical Portal",
  description:
    "Ontdek je Adaptability, Personality, Awareness en Connection. De test die meet wat AI niet kan meten: het menselijke.",
};

export default function ApacStartPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Hero */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-smaragd">
            APAC Assessment
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-heading sm:text-4xl">
            Ontdek je menselijke kwaliteiten
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            APAC meet wat AI niet kan meten:{" "}
            <span className="font-medium text-heading">
              Adaptability, Personality, Awareness en Connection
            </span>
            . Vier dimensies die bepalen hoe jij als mens het verschil maakt in
            de AI-sector.
          </p>
        </div>

        {/* Info cards */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          {[
            { icon: "⏱", label: "~10 minuten" },
            { icon: "🎯", label: "Eerlijk antwoorden" },
            { icon: "🔒", label: "Resultaten privé" },
            { icon: "📊", label: "Direct inzicht" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-[8px] border border-surface-border bg-surface px-4 py-3"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-medium text-label">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Captcha + Start button (client component) */}
        <Suspense fallback={<div className="mt-8 h-24" />}>
          <ApacStartClient />
        </Suspense>

        <p className="mt-6 text-center text-xs text-muted">
          Je gegevens worden vertrouwelijk behandeld conform onze
          privacyverklaring.
        </p>
      </div>
    </main>
  );
}
