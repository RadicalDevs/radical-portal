"use client";

import AnimatedSection from "./AnimatedSection";

const STEPS = [
  {
    number: "01",
    title: "Doe de test",
    description:
      "20 minuten, 4 dimensies. Eerlijk, persoonlijk, zonder trucjes. Ontdek hoe je scoort op Adaptability, Personality, Awareness en Connection.",
    color: "#2ed573",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Ontvang je profiel",
    description:
      "Een gedetailleerde analyse van je menselijke kwaliteiten, visueel weergegeven in een persoonlijk APAC-profiel met radarchart.",
    color: "#E6734F",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Word gevonden",
    description:
      "Word onderdeel van een netwerk waar karakter telt. Bedrijven vinden jou op basis van wie je bent, niet alleen wat op je CV staat.",
    color: "#8B5CF6",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
];

export default function HowItWorksSection() {
  return (
    <section id="hoe-het-werkt" className="px-4 py-24 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <AnimatedSection className="text-center">
          <h2 className="font-heading text-3xl font-bold text-heading sm:text-4xl lg:text-5xl">
            Hoe het <span className="gradient-text">werkt</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            In drie stappen ontdek je wat jou uniek maakt.
          </p>
        </AnimatedSection>

        <div className="relative mt-16">
          {/* Connecting line (desktop) */}
          <div className="absolute left-0 right-0 top-[60px] hidden h-px bg-gradient-to-r from-transparent via-surface-border to-transparent lg:block" />

          <div className="grid gap-8 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <AnimatedSection key={step.number} delay={i * 0.15}>
                <div className="glass group relative rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1">
                  {/* Colored top accent */}
                  <div
                    className="absolute inset-x-0 top-0 h-1 rounded-t-2xl transition-all duration-500 group-hover:h-1.5"
                    style={{ background: step.color }}
                  />

                  {/* Step number */}
                  <div
                    className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${step.color}15`, color: step.color }}
                  >
                    {step.icon}
                  </div>

                  <span
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: step.color }}
                  >
                    Stap {step.number}
                  </span>

                  <h3 className="mt-2 font-heading text-xl font-bold text-heading">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {step.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
