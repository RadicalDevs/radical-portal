"use client";

import { useState, useEffect, useTransition } from "react";
import { getQuestionAnalytics } from "../actions";
import type { QuestionAnalyticsData, QuestionAnalyticsItem, QuestionAnalyticsRespondent } from "../actions";

const PERIOD_OPTIONS = [
  { value: "all", label: "Alle tijd" },
  { value: "month", label: "Afgelopen 30 dagen" },
  { value: "week", label: "Afgelopen 7 dagen" },
] as const;

type Period = (typeof PERIOD_OPTIONS)[number]["value"];

const VAR_COLORS: Record<string, string> = {
  adaptability: "#2ed573",
  personality: "#E6734F",
  awareness: "#3B82F6",
  connection: "#8B5CF6",
  b5_openness: "#64748b",
  b5_conscientiousness: "#64748b",
  b5_extraversion: "#64748b",
  b5_agreeableness: "#64748b",
  b5_stability: "#64748b",
};

const VAR_LABELS: Record<string, string> = {
  adaptability: "Adaptability",
  personality: "Personality",
  awareness: "Awareness",
  connection: "Connection",
  b5_openness: "B5: Openness",
  b5_conscientiousness: "B5: Conscientiousness",
  b5_extraversion: "B5: Extraversion",
  b5_agreeableness: "B5: Agreeableness",
  b5_stability: "B5: Stability",
};

export default function QuestionAnalyticsClient() {
  const [data, setData] = useState<QuestionAnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [isLoading, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function loadData(p: Period) {
    startTransition(async () => {
      const result = await getQuestionAnalytics(p === "all" ? undefined : p);
      setData(result);
    });
  }

  useEffect(() => {
    loadData(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePeriodChange(p: Period) {
    setPeriod(p);
    loadData(p);
  }

  if (!data && isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-smaragd border-t-transparent" />
        <span className="ml-3 text-sm text-muted">Analyse laden...</span>
      </div>
    );
  }

  if (!data) return null;

  const activeQuestions = data.questions.filter((q) => q.isActive);
  const inactiveQuestions = data.questions.filter((q) => !q.isActive && q.totalAnswers > 0);

  return (
    <div className="space-y-6">
      {/* Header: respondenten + periode filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted">
            <span className="font-semibold text-heading">{data.totalRespondents}</span>{" "}
            respondent{data.totalRespondents !== 1 ? "en" : ""}
            {period === "week" && " (afgelopen 7 dagen)"}
            {period === "month" && " (afgelopen 30 dagen)"}
          </p>
          {data.totalRespondents > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.totalPortal > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-smaragd/10 px-2 py-0.5 text-xs font-medium text-smaragd">
                  Portal: {data.totalPortal}
                </span>
              )}
              {data.totalTally > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600">
                  Tally: {data.totalTally}
                </span>
              )}
              {data.totalManual > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-light px-2 py-0.5 text-xs font-medium text-muted">
                  Handmatig: {data.totalManual}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1 rounded-lg border border-surface-border bg-surface p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handlePeriodChange(opt.value)}
              disabled={isLoading}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                period === opt.value
                  ? "bg-smaragd text-white shadow-sm"
                  : "text-muted hover:text-heading"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <div className="h-3 w-3 animate-spin rounded-full border border-smaragd border-t-transparent" />
          Bijwerken...
        </div>
      )}

      {/* Info banner: per-vraag data alleen via portal + tally webhook */}
      {data.totalTally > 0 && data.questions.some((q) => q.totalAnswers === 0 && q.isActive) && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <strong>Tally-synchronisatie</strong> — Er zijn {data.totalTally} Tally-respondenten, maar per-vraag data is alleen beschikbaar voor toekomstige Tally-inzendingen via de webhook. Koppel vragen aan Tally door een <span className="font-mono">veld ID</span> in te vullen bij elke vraag (tabblad &quot;Vragen&quot;).
        </div>
      )}

      {/* Actieve vragen */}
      {activeQuestions.length === 0 && !isLoading ? (
        <div className="rounded-xl border border-surface-border bg-surface p-8 text-center text-sm text-muted">
          Nog geen antwoorden ontvangen. Zodra kandidaten de APAC-test invullen, verschijnt hier de analyse per vraag.
        </div>
      ) : (
        <div className="space-y-3">
          {activeQuestions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              isExpanded={expandedId === q.id}
              onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
            />
          ))}
        </div>
      )}

      {/* Inactieve vragen met historische data */}
      {inactiveQuestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted">
            Inactieve vragen (historische data)
          </h3>
          {inactiveQuestions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={activeQuestions.length + idx}
              isExpanded={expandedId === q.id}
              onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionCard — compacte weergave per vraag met uitklapbare details
// ---------------------------------------------------------------------------

function RespondentPills({ respondents }: { respondents: QuestionAnalyticsRespondent[] }) {
  const [expanded, setExpanded] = useState(false);
  if (respondents.length === 0) return null;
  const shown = expanded ? respondents : respondents.slice(0, 3);
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {shown.map((r) => (
        <span
          key={r.kandidaatId}
          title={r.email}
          className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-body border border-surface-border"
        >
          {r.naam}
        </span>
      ))}
      {respondents.length > 3 && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="text-xs text-muted hover:text-heading"
        >
          {expanded ? "minder" : `+${respondents.length - 3} meer`}
        </button>
      )}
    </div>
  );
}

function QuestionCard({
  question: q,
  index,
  isExpanded,
  onToggle,
}: {
  question: QuestionAnalyticsItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const color = VAR_COLORS[q.variable] ?? "#64748b";
  const maxCount = Math.max(...q.distribution.map((d) => d.count), 1);

  return (
    <div
      className={`rounded-xl border border-surface-border bg-surface transition-all ${
        !q.isActive ? "opacity-60" : ""
      }`}
    >
      {/* Compacte rij */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-light/50"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-light text-xs font-bold text-muted">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-heading line-clamp-1">
            {q.questionText}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: `${color}18`, color }}
            >
              {VAR_LABELS[q.variable] ?? q.variable}
            </span>
            <span className="text-xs text-muted">
              {q.totalAnswers} antwoord{q.totalAnswers !== 1 ? "en" : ""}
            </span>
            {q.totalAnswers > 0 && (
              <span className="text-xs font-medium text-heading">
                Gem: {q.averageScore}
              </span>
            )}
          </div>
        </div>

        <svg
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Uitklapbare details */}
      {isExpanded && (
        <div className="border-t border-surface-border px-4 pb-4 pt-3">
          {q.totalAnswers === 0 ? (
            <p className="text-sm text-muted">Nog geen antwoorden voor deze vraag.</p>
          ) : (
            <div className="space-y-3">
              {q.distribution.map((d) => (
                <div key={d.value}>
                  <div className="flex items-center gap-3">
                    <div className="w-36 shrink-0 text-right">
                      <span className="text-xs text-body">{d.label}</span>
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-5 flex-1 overflow-hidden rounded-md bg-surface-light">
                        <div
                          className="h-full rounded-md transition-all"
                          style={{
                            width: `${maxCount > 0 ? (d.count / maxCount) * 100 : 0}%`,
                            backgroundColor: color,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                      <div className="w-16 shrink-0 text-right">
                        <span className="text-xs font-medium text-heading">{d.count}</span>
                        <span className="ml-0.5 text-xs text-muted">({d.percentage}%)</span>
                      </div>
                    </div>
                  </div>
                  {d.respondents.length > 0 && (
                    <div className="pl-[156px]">
                      <RespondentPills respondents={d.respondents} />
                    </div>
                  )}
                </div>
              ))}

              {/* Samenvatting */}
              <div className="mt-3 flex items-center gap-4 rounded-lg bg-surface-light px-3 py-2">
                <div className="text-xs text-muted">
                  Totaal: <span className="font-semibold text-heading">{q.totalAnswers}</span>
                </div>
                <div className="text-xs text-muted">
                  Gemiddelde: <span className="font-semibold text-heading">{q.averageScore}</span>
                </div>
                <div className="text-xs text-muted">
                  Weging: <span className="font-semibold text-heading">{q.weight}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
