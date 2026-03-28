"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import type { ApacFormConfig } from "@/lib/apac/types";
import type { ApacQuestion } from "@/app/apac/actions";
import { DIMENSION_LABELS, DIMENSION_COLORS } from "@/lib/apac/scoring";

// ── Fallback config ────────────────────────────────────────────────────────
const FALLBACK: ApacFormConfig = {
  id: "",
  intro_title: "The Radical APAC test",
  intro_subtitle: "Adaptability, Personality, Awareness, Connection",
  intro_tagline: "Code is now a commodity. Your character is becoming the true currency.",
  intro_body:
    "Welcome! Technical mastery is your baseline, but at Radical, it is only the beginning. We are looking for the great 'humans in the loop' who can navigate the ethical, cognitive, and social complexity that AI introduces to our world.",
  rules_title: "The rules of the game",
  rules_items: [
    { label: "No Safe Havens", text: "There are no 'obvious' answers. Every answer is ok and just reflects your internal software.", color: "smaragd" },
    { label: "The Instinct Lock", text: "Trust your intuition, refrain socially desirable answers.", color: "smaragd" },
  ],
  rules_footer: "The total test consists of 30 randomized questions.",
  thankyou_title: "Bedankt!",
  thankyou_body: "Je hebt de APAC-test voltooid. Hieronder zie je je persoonlijk profiel.",
  require_lastname: false,
  notification_emails: [],
};

type Stage = "intro" | "questions" | "done";

function groupByVariable(questions: ApacQuestion[]) {
  const groups: { variable: string; questions: ApacQuestion[] }[] = [];
  const seen = new Set<string>();
  for (const q of questions) {
    if (!seen.has(q.variable)) {
      seen.add(q.variable);
      groups.push({ variable: q.variable, questions: questions.filter((x) => x.variable === q.variable) });
    }
  }
  return groups;
}

// ── Background ─────────────────────────────────────────────────────────────
function PreviewBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden" style={{ background: "#0a0e0f" }}>
      {/* Smaragd blob — top left */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          left: "-10%",
          width: "65%",
          height: "65%",
          background: "radial-gradient(ellipse at center, rgba(46,213,115,0.22) 0%, rgba(46,213,115,0.08) 35%, transparent 65%)",
          filter: "blur(48px)",
          pointerEvents: "none",
          willChange: "filter",
        }}
      />
      {/* Coral blob — bottom right */}
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          right: "-10%",
          width: "70%",
          height: "70%",
          background: "radial-gradient(ellipse at center, rgba(230,115,79,0.18) 0%, rgba(230,115,79,0.06) 35%, transparent 65%)",
          filter: "blur(64px)",
          pointerEvents: "none",
          willChange: "filter",
        }}
      />
      {/* Smaragd accent — top right */}
      <div
        style={{
          position: "absolute",
          top: "5%",
          right: "0%",
          width: "35%",
          height: "40%",
          background: "radial-gradient(ellipse at center, rgba(46,213,115,0.10) 0%, transparent 60%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          willChange: "filter",
        }}
      />
      {/* Subtle coral — mid left */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "-5%",
          width: "30%",
          height: "30%",
          background: "radial-gradient(ellipse at center, rgba(230,115,79,0.08) 0%, transparent 60%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          willChange: "filter",
        }}
      />
      {/* Dot pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          pointerEvents: "none",
        }}
      />
      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 120% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ── Admin bar ──────────────────────────────────────────────────────────────
function AdminBar({ stage, totalQ, currentIdx }: { stage: Stage; totalQ: number; currentIdx: number }) {
  return (
    <div
      className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5"
      style={{
        background: "rgba(10,14,15,0.80)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(46,213,115,0.15)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
          style={{ background: "rgba(46,213,115,0.15)", color: "#2ed573" }}
        >
          Preview
        </span>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.75rem" }}>
          {stage === "intro" && "Intro scherm"}
          {stage === "questions" && `Vraag ${currentIdx + 1} van ${totalQ}`}
          {stage === "done" && "Resultaten scherm"}
        </span>
      </div>
      <Link
        href="/admin/apac-form"
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Terug naar beheer
      </Link>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function IntroPreviewPage({
  config,
  questions,
}: {
  config: ApacFormConfig | null;
  questions: ApacQuestion[];
}) {
  const c = config ?? FALLBACK;
  const [stage, setStage] = useState<Stage>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Lock body scroll — preview takes over the full viewport
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] ?? null;
  const progress = totalQuestions > 0 ? Math.round((currentIndex / totalQuestions) * 100) : 0;
  const currentDimColor = currentQuestion ? DIMENSION_COLORS[currentQuestion.variable] : "#2ed573";
  const currentDimLabel = currentQuestion ? DIMENSION_LABELS[currentQuestion.variable] : "";
  const groups = groupByVariable(questions);
  const currentGroup = groups.find((g) => currentQuestion && g.variable === currentQuestion.variable);
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const allAnswered = totalQuestions > 0 && Object.keys(answers).length === totalQuestions;
  const currentAnswered = currentQuestion ? answers[currentQuestion.id] !== undefined : false;

  const selectAnswer = useCallback((questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setTimeout(() => {
      setCurrentIndex((prev) => {
        if (prev < totalQuestions - 1) return prev + 1;
        return prev;
      });
    }, 300);
  }, [totalQuestions]);

  // Shared text colors for dark background
  const headingColor = "#F0F2F8";
  const bodyColor = "#B8BDD4";
  const mutedColor = "#5D6280";
  const surfaceColor = "rgba(19,19,31,0.75)";
  const borderColor = "rgba(255,255,255,0.08)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflowY: "auto",
        color: bodyColor,
      }}
    >
      <PreviewBackground />

      {/* Scrollable content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <AdminBar stage={stage} totalQ={totalQuestions} currentIdx={currentIndex} />

        <main className="flex flex-1 flex-col items-center px-4 py-10 sm:py-14">
          <div className="w-full max-w-2xl">

            {/* ── INTRO ─────────────────────────────────────────────── */}
            {stage === "intro" && (
              <div className="space-y-8">
                <h1
                  className="font-heading text-3xl font-bold sm:text-4xl md:text-5xl"
                  style={{ color: headingColor }}
                >
                  {c.intro_title}
                </h1>

                <div className="space-y-4">
                  <h2 className="font-heading text-2xl font-bold sm:text-3xl" style={{ color: "#E6734F" }}>
                    {c.intro_subtitle}
                  </h2>
                  {c.intro_tagline && (
                    <p className="text-base font-bold" style={{ color: headingColor }}>{c.intro_tagline}</p>
                  )}
                  {c.intro_body && (
                    <p className="text-base leading-relaxed" style={{ color: bodyColor }}>{c.intro_body}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-heading text-xl font-bold" style={{ color: "#E6734F" }}>
                    {c.rules_title}
                  </h3>
                  <div className="space-y-2">
                    {(c.rules_items ?? []).map((rule, i) => (
                      <p key={i} className="text-base" style={{ color: bodyColor }}>
                        <span className="font-bold" style={{ color: "#2ed573" }}>{rule.label}:</span>{" "}
                        {rule.text}
                      </p>
                    ))}
                  </div>
                  {c.rules_footer && (
                    <p className="text-base" style={{ color: bodyColor }}>{c.rules_footer}</p>
                  )}
                </div>

                {totalQuestions === 0 ? (
                  <div
                    className="rounded-xl px-5 py-4 text-sm"
                    style={{ background: "rgba(230,115,79,0.12)", border: "1px solid rgba(230,115,79,0.25)", color: "#f09e85" }}
                  >
                    Geen actieve vragen gevonden. Voeg eerst vragen toe via het &quot;Vragen&quot; tabblad.
                  </div>
                ) : (
                  <button
                    onClick={() => setStage("questions")}
                    className="flex items-center gap-2 rounded-[8px] px-8 py-4 text-base font-semibold text-white shadow-lg transition-all"
                    style={{ background: "#2ed573", boxShadow: "0 0 32px rgba(46,213,115,0.35)" }}
                  >
                    Start the APAC test
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* ── QUESTIONS ─────────────────────────────────────────── */}
            {stage === "questions" && currentQuestion && (
              <div className="space-y-6">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-sm" style={{ color: mutedColor }}>
                    <span>Vraag {currentIndex + 1} van {totalQuestions}</span>
                    <span>{progress}%</span>
                  </div>
                  <div
                    className="mt-2 h-2 w-full overflow-hidden rounded-full"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%`, backgroundColor: currentDimColor }}
                    />
                  </div>
                </div>

                {/* Dimension indicator */}
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: currentDimColor }} />
                  <span className="text-sm font-semibold" style={{ color: currentDimColor }}>
                    {currentDimLabel}
                  </span>
                  {currentGroup && (
                    <span className="text-xs" style={{ color: mutedColor }}>
                      ({currentGroup.questions.findIndex((q) => q.id === currentQuestion.id) + 1}/{currentGroup.questions.length})
                    </span>
                  )}
                </div>

                {/* Question card */}
                <div
                  className="rounded-[12px] p-6 shadow-sm sm:p-8"
                  style={{ background: surfaceColor, border: `1px solid ${borderColor}`, backdropFilter: "blur(16px)" }}
                >
                  <h2 className="text-lg font-medium leading-relaxed sm:text-xl" style={{ color: headingColor }}>
                    {currentQuestion.question_text}
                  </h2>
                  <div className="mt-6 space-y-3">
                    {currentQuestion.options.map((option) => {
                      const isSelected = answers[currentQuestion.id] === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => selectAnswer(currentQuestion.id, option.value)}
                          className="group flex w-full items-center gap-4 rounded-[8px] px-5 py-4 text-left transition-all"
                          style={{
                            border: isSelected ? `2px solid ${currentDimColor}` : "2px solid rgba(255,255,255,0.08)",
                            background: isSelected ? `${currentDimColor}12` : "rgba(255,255,255,0.03)",
                          }}
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all"
                            style={{
                              borderColor: isSelected ? currentDimColor : "rgba(255,255,255,0.2)",
                              backgroundColor: isSelected ? currentDimColor : "transparent",
                            }}
                          >
                            {isSelected && (
                              <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                                <path d="M10.28 2.28a.75.75 0 00-1.06-1.06L4.5 5.94 2.78 4.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25z" />
                              </svg>
                            )}
                          </span>
                          <span
                            className="text-base"
                            style={{ color: isSelected ? currentDimColor : bodyColor, fontWeight: isSelected ? 500 : 400 }}
                          >
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => currentIndex > 0 && setCurrentIndex((p) => p - 1)}
                    disabled={currentIndex === 0}
                    className="flex min-h-[44px] items-center gap-1 rounded-[8px] px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                    style={{ color: mutedColor }}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Vorige
                  </button>

                  {isLastQuestion && allAnswered ? (
                    <button
                      onClick={() => setStage("done")}
                      className="flex items-center gap-2 rounded-[8px] px-6 py-3 text-base font-semibold text-white shadow-lg transition-all"
                      style={{ background: "#2ed573", boxShadow: "0 0 24px rgba(46,213,115,0.30)" }}
                    >
                      Bekijk mijn resultaten
                    </button>
                  ) : (
                    <button
                      onClick={() => !isLastQuestion && setCurrentIndex((p) => p + 1)}
                      disabled={!currentAnswered}
                      className="flex min-h-[44px] items-center gap-1 rounded-[8px] px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                      style={{ color: mutedColor }}
                    >
                      Volgende
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="text-center text-xs" style={{ color: mutedColor }}>
                  {Object.keys(answers).length} van {totalQuestions} beantwoord
                </div>
              </div>
            )}

            {/* ── DONE ──────────────────────────────────────────────── */}
            {stage === "done" && (
              <div className="space-y-8 text-center">
                <div
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-full"
                  style={{ background: "rgba(46,213,115,0.15)", boxShadow: "0 0 48px rgba(46,213,115,0.25)" }}
                >
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="#2ed573" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <div>
                  <h2 className="font-heading text-3xl font-bold" style={{ color: headingColor }}>
                    {c.thankyou_title}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed" style={{ color: bodyColor }}>
                    {c.thankyou_body}
                  </p>
                </div>

                <div
                  className="rounded-xl px-5 py-4 text-sm"
                  style={{ background: "rgba(46,213,115,0.10)", border: "1px solid rgba(46,213,115,0.20)", color: "#5ee89a" }}
                >
                  In de echte test verschijnt hier het persoonlijke APAC-profiel van de kandidaat.
                </div>

                <button
                  onClick={() => { setStage("intro"); setCurrentIndex(0); setAnswers({}); }}
                  className="rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)" }}
                >
                  ↩ Opnieuw beginnen
                </button>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
