"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ApacQuestion } from "../actions";
import type { ApacFormConfig } from "@/lib/apac/types";
import { submitApacTest } from "../actions";
import { DIMENSION_LABELS, DIMENSION_COLORS } from "@/lib/apac/scoring";

interface Props {
  questions: ApacQuestion[];
  formConfig: ApacFormConfig | null;
}

function groupByVariable(questions: ApacQuestion[]) {
  const groups: { variable: string; questions: ApacQuestion[] }[] = [];
  const seen = new Set<string>();
  for (const q of questions) {
    if (!seen.has(q.variable)) {
      seen.add(q.variable);
      groups.push({
        variable: q.variable,
        questions: questions.filter((x) => x.variable === q.variable),
      });
    }
  }
  return groups;
}

// Default intro content (used when no DB config available)
const DEFAULT_CONFIG: Omit<ApacFormConfig, "id" | "require_lastname" | "notification_emails" | "thankyou_title" | "thankyou_body"> = {
  intro_title: "The Radical APAC test",
  intro_subtitle: "Adaptability, Personality, Awareness, Connection",
  intro_tagline: "Code is now a commodity. Your character is becoming the true currency.",
  intro_body:
    "Welcome! Technical mastery is your baseline, but at Radical, it is only the beginning. We are looking for the great 'humans in the loop' who can navigate the ethical, cognitive, and social complexity that AI introduces to our world.",
  rules_title: "The rules of the game",
  rules_items: [
    {
      label: "No Safe Havens",
      text: "There are no 'obvious' answers. Every answer is ok and just reflects your internal software.",
      color: "smaragd",
    },
    {
      label: "The Instinct Lock",
      text: "Trust your intuition, refrain socially desirable answers.",
      color: "smaragd",
    },
  ],
  rules_footer: "The total test consists of 30 randomized questions.",
};

function IntroScreen({
  config,
  onStart,
}: {
  config: ApacFormConfig | null;
  onStart: () => void;
}) {
  const c = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  const ruleColor = "#2ed573"; // smaragd

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-heading sm:text-4xl md:text-5xl">
          {c.intro_title}
        </h1>
      </div>

      {/* Subtitle + tagline + body */}
      <div className="space-y-4">
        <h2
          className="font-heading text-2xl font-bold sm:text-3xl"
          style={{ color: "#E6734F" }}
        >
          {c.intro_subtitle}
        </h2>
        {c.intro_tagline && (
          <p className="text-base font-bold text-heading">{c.intro_tagline}</p>
        )}
        {c.intro_body && (
          <p className="text-base leading-relaxed text-label">{c.intro_body}</p>
        )}
      </div>

      {/* Rules */}
      <div className="space-y-3">
        <h3
          className="font-heading text-xl font-bold"
          style={{ color: "#E6734F" }}
        >
          {c.rules_title}
        </h3>
        <div className="space-y-2">
          {c.rules_items.map((rule, i) => (
            <p key={i} className="text-base text-label">
              <span className="font-bold" style={{ color: ruleColor }}>
                {rule.label}:
              </span>{" "}
              {rule.text}
            </p>
          ))}
        </div>
        {c.rules_footer && (
          <p className="text-base text-label">{c.rules_footer}</p>
        )}
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        className="flex items-center gap-2 rounded-[8px] bg-smaragd px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:bg-smaragd-dark hover:shadow-xl"
      >
        Start the APAC test
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
          />
        </svg>
      </button>
    </div>
  );
}

export default function ApacTestClient({ questions, formConfig }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [session, setSession] = useState<{
    sessionId: string;
    sessionToken: string;
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const hasQuestions = questions.length > 0;

  useEffect(() => {
    const raw = sessionStorage.getItem("apac_session");
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        router.push("/apac");
      }
    } else {
      router.push("/apac");
    }
  }, [router]);

  const groups = groupByVariable(questions);
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress =
    totalQuestions > 0 ? Math.round((currentIndex / totalQuestions) * 100) : 0;

  const currentGroup = groups.find(
    (g) => currentQuestion && g.variable === currentQuestion.variable
  );
  const currentDimColor = currentQuestion
    ? DIMENSION_COLORS[currentQuestion.variable]
    : "#2ed573";
  const currentDimLabel = currentQuestion
    ? DIMENSION_LABELS[currentQuestion.variable]
    : "";

  const selectAnswer = useCallback(
    (questionId: string, value: number) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setTimeout(() => {
        if (currentIndex < totalQuestions - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      }, 300);
    },
    [currentIndex, totalQuestions]
  );

  function goBack() {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  }

  function goForward() {
    if (currentIndex < totalQuestions - 1) setCurrentIndex((prev) => prev + 1);
  }

  const allAnswered =
    hasQuestions && Object.keys(answers).length === totalQuestions;

  function handleSubmit() {
    if (!session || !allAnswered) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("sessionId", session.sessionId);
      formData.set("sessionToken", session.sessionToken);
      formData.set("answers", JSON.stringify(answers));
      const result = await submitApacTest(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      sessionStorage.removeItem("apac_session");
      router.push(`/apac/results/${result.sessionId}`);
    });
  }

  // Loading state
  if (!session) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg
          className="h-8 w-8 animate-spin text-smaragd"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </div>
    );
  }

  if (!hasQuestions) {
    return (
      <div className="rounded-[8px] border border-amber-700 bg-amber-900/30 p-8 text-center">
        <p className="text-lg font-medium text-amber-300">
          De APAC-test is momenteel niet beschikbaar.
        </p>
        <p className="mt-2 text-sm text-amber-400">
          Er zijn nog geen vragen geconfigureerd. Neem contact op met de
          beheerder.
        </p>
      </div>
    );
  }

  // Step 0: intro screen
  if (showIntro) {
    return <IntroScreen config={formConfig} onStart={() => setShowIntro(false)} />;
  }

  if (currentIndex >= totalQuestions) {
    setCurrentIndex(totalQuestions - 1);
  }

  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentAnswered = currentQuestion
    ? answers[currentQuestion.id] !== undefined
    : false;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Vraag {currentIndex + 1} van {totalQuestions}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: currentDimColor }}
          />
        </div>
      </div>

      {/* Dimension indicator */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: currentDimColor }}
        />
        <span
          className="text-sm font-semibold"
          style={{ color: currentDimColor }}
        >
          {currentDimLabel}
        </span>
        {currentGroup && (
          <span className="text-xs text-muted">
            (
            {currentGroup.questions.findIndex(
              (q) => q.id === currentQuestion?.id
            ) + 1}
            /{currentGroup.questions.length})
          </span>
        )}
      </div>

      {/* Question card */}
      {currentQuestion && (
        <div className="rounded-[12px] border border-surface-border bg-surface p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-medium leading-relaxed text-heading sm:text-xl">
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
                  className={`group flex w-full items-center gap-4 rounded-[8px] border-2 px-5 py-4 text-left transition-all ${
                    isSelected
                      ? "border-current bg-current/5 shadow-sm"
                      : "border-surface-border bg-surface hover:border-surface-border hover:bg-surface-light"
                  }`}
                  style={
                    isSelected
                      ? { borderColor: currentDimColor, color: currentDimColor }
                      : {}
                  }
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      isSelected
                        ? "border-current bg-current"
                        : "border-surface-border group-hover:border-gray-500"
                    }`}
                    style={
                      isSelected
                        ? {
                            borderColor: currentDimColor,
                            backgroundColor: currentDimColor,
                          }
                        : {}
                    }
                  >
                    {isSelected && (
                      <svg
                        className="h-3.5 w-3.5 text-white"
                        fill="currentColor"
                        viewBox="0 0 12 12"
                      >
                        <path d="M10.28 2.28a.75.75 0 00-1.06-1.06L4.5 5.94 2.78 4.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25z" />
                      </svg>
                    )}
                  </span>
                  <span
                    className={`text-base ${isSelected ? "font-medium" : "text-label"}`}
                    style={isSelected ? { color: currentDimColor } : {}}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={currentIndex === 0}
          className="flex min-h-[44px] items-center gap-1 rounded-[8px] px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-label disabled:cursor-not-allowed disabled:opacity-30"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Vorige
        </button>

        {isLastQuestion && allAnswered ? (
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 rounded-[8px] bg-smaragd px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-smaragd-dark hover:shadow-xl disabled:opacity-50"
          >
            {isPending ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Verwerken…
              </>
            ) : (
              "Bekijk mijn resultaten"
            )}
          </button>
        ) : (
          <button
            onClick={goForward}
            disabled={!currentAnswered}
            className="flex min-h-[44px] items-center gap-1 rounded-[8px] px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-label disabled:cursor-not-allowed disabled:opacity-30"
          >
            Volgende
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="text-center text-xs text-muted">
        {Object.keys(answers).length} van {totalQuestions} beantwoord
      </div>

      {error && (
        <div className="rounded-[8px] border border-red-800 bg-red-900/30 px-4 py-3 text-center text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
