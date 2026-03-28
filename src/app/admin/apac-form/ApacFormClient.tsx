"use client";

import { useState, useTransition } from "react";
import {
  updateApacQuestion,
  addApacQuestion,
  deleteApacQuestion,
  reorderApacQuestions,
} from "../actions";
import type { AdminApacQuestion, QuestionMutationResult } from "../actions";

const VARIABLES = [
  { value: "adaptability", label: "Adaptability", color: "#2ed573" },
  { value: "personality",  label: "Personality",  color: "#E6734F" },
  { value: "awareness",    label: "Awareness",     color: "#3B82F6" },
  { value: "connection",   label: "Connection",    color: "#8B5CF6" },
  { value: "b5_openness",          label: "B5: Openness",          color: "#64748b" },
  { value: "b5_conscientiousness", label: "B5: Conscientiousness", color: "#64748b" },
  { value: "b5_extraversion",      label: "B5: Extraversion",      color: "#64748b" },
  { value: "b5_agreeableness",     label: "B5: Agreeableness",     color: "#64748b" },
  { value: "b5_stability",         label: "B5: Stability",         color: "#64748b" },
];

const VAR_COLOR: Record<string, string> = Object.fromEntries(
  VARIABLES.map((v) => [v.value, v.color])
);

export default function ApacFormClient({
  questions: initial,
}: {
  questions: AdminApacQuestion[];
}) {
  const [questions, setQuestions] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  function handleUpdated(updated: AdminApacQuestion) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updated.id ? updated : q))
    );
    setEditingId(null);
  }

  function handleAdded(newQ: AdminApacQuestion) {
    setQuestions((prev) => [...prev, newQ]);
    setAddingNew(false);
  }

  function handleDeleted(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  async function moveQuestion(index: number, dir: "up" | "down") {
    const newList = [...questions];
    const swapIdx = dir === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[index], newList[swapIdx]] = [newList[swapIdx], newList[index]];
    const reordered = newList.map((q, i) => ({ ...q, sort_order: i + 1 }));
    setQuestions(reordered);
    await reorderApacQuestions(reordered.map((q) => ({ id: q.id, sort_order: q.sort_order })));
  }

  return (
    <div className="space-y-4">
      {/* Question list */}
      <div className="space-y-2">
        {questions.map((q, idx) => (
          <div key={q.id}>
            {editingId === q.id ? (
              <QuestionEditor
                question={q}
                onSaved={handleUpdated}
                onCancel={() => setEditingId(null)}
                onDeleted={() => handleDeleted(q.id)}
              />
            ) : (
              <QuestionRow
                question={q}
                index={idx}
                total={questions.length}
                onEdit={() => setEditingId(q.id)}
                onMove={moveQuestion}
              />
            )}
          </div>
        ))}
      </div>

      {/* Add new question */}
      {addingNew ? (
        <QuestionEditor
          onSaved={(newQ) => handleAdded(newQ)}
          onCancel={() => setAddingNew(false)}
        />
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-border py-4 text-sm font-medium text-muted transition-colors hover:border-smaragd/50 hover:text-smaragd"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nieuwe vraag toevoegen
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question row (view mode)
// ---------------------------------------------------------------------------

function QuestionRow({
  question,
  index,
  total,
  onEdit,
  onMove,
}: {
  question: AdminApacQuestion;
  index: number;
  total: number;
  onEdit: () => void;
  onMove: (index: number, dir: "up" | "down") => void;
}) {
  const color = VAR_COLOR[question.variable] ?? "#64748b";

  return (
    <div
      className={`flex items-start gap-4 rounded-xl border border-surface-border bg-surface p-4 transition-opacity ${
        !question.is_active ? "opacity-50" : ""
      }`}
    >
      {/* Sort order controls */}
      <div className="flex flex-col gap-0.5 pt-0.5">
        <button
          onClick={() => onMove(index, "up")}
          disabled={index === 0}
          className="rounded p-0.5 text-muted hover:text-heading disabled:opacity-20"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <button
          onClick={() => onMove(index, "down")}
          disabled={index === total - 1}
          className="rounded p-0.5 text-muted hover:text-heading disabled:opacity-20"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Number */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-light text-xs font-bold text-muted">
        {index + 1}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-heading line-clamp-2">
          {question.question_text}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: `${color}18`, color }}
          >
            {VARIABLES.find((v) => v.value === question.variable)?.label ?? question.variable}
          </span>
          <span className="text-xs text-muted">
            Weging: {question.weight}
          </span>
          <span className="text-xs text-muted">
            {question.options.length} opties
          </span>
          {!question.is_active && (
            <span className="rounded-full bg-surface-light px-2 py-0.5 text-xs text-muted">
              Inactief
            </span>
          )}
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={onEdit}
        className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-smaragd hover:bg-smaragd/10"
      >
        Bewerken
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question editor (edit / create mode)
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS = JSON.stringify([
  { label: "Helemaal mee oneens", value: 1 },
  { label: "Mee oneens", value: 3 },
  { label: "Neutraal", value: 5 },
  { label: "Mee eens", value: 7 },
  { label: "Helemaal mee eens", value: 10 },
]);

function QuestionEditor({
  question,
  onSaved,
  onCancel,
  onDeleted,
}: {
  question?: AdminApacQuestion;
  onSaved: (q: AdminApacQuestion) => void;
  onCancel: () => void;
  onDeleted?: () => void;
}) {
  const isNew = !question;
  const [isPending, startTransition] = useTransition();
  const [isPendingDelete, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optionsRaw, setOptionsRaw] = useState(
    question ? JSON.stringify(question.options, null, 2) : DEFAULT_OPTIONS
  );
  const [isActive, setIsActive] = useState(question?.is_active ?? true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  function validateOptions(raw: string): { label: string; value: number }[] | null {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      for (const o of parsed) {
        if (typeof o.label !== "string" || typeof o.value !== "number") return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const opts = validateOptions(optionsRaw);
    if (!opts) {
      setOptionsError("Ongeldige JSON. Verwacht: [{label: string, value: number}]");
      return;
    }
    setOptionsError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("options", JSON.stringify(opts));
    fd.set("is_active", String(isActive));

    startTransition(async () => {
      let result: QuestionMutationResult;
      if (isNew) {
        result = await addApacQuestion(fd);
      } else {
        result = await updateApacQuestion(question!.id, fd);
      }

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Build updated question object for optimistic update
      const updated: AdminApacQuestion = {
        id: question?.id ?? crypto.randomUUID(),
        question_text: fd.get("question_text") as string,
        options: opts,
        variable: fd.get("variable") as string,
        weight: Number(fd.get("weight")),
        sort_order: question?.sort_order ?? 999,
        is_active: isActive,
      };
      onSaved(updated);
    });
  }

  function handleDelete() {
    if (!question || !onDeleted) return;
    if (!confirm("Vraag verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    startDelete(async () => {
      const result = await deleteApacQuestion(question.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border-2 border-smaragd/30 bg-surface p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-heading">
          {isNew ? "Nieuwe vraag" : "Vraag bewerken"}
        </h3>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            Actief
          </label>
        </div>
      </div>

      {/* Question text */}
      <div>
        <label className="mb-1 block text-sm font-medium text-label">
          Vraagtekst *
        </label>
        <textarea
          name="question_text"
          defaultValue={question?.question_text}
          required
          rows={3}
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-body placeholder:text-muted focus:border-smaragd focus:outline-none resize-none"
          placeholder="Stel hier je vraag…"
        />
      </div>

      {/* Variable + weight */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-label">
            Variabele *
          </label>
          <select
            name="variable"
            defaultValue={question?.variable ?? "adaptability"}
            required
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-body focus:border-smaragd focus:outline-none"
          >
            {VARIABLES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-label">
            Weging
          </label>
          <input
            name="weight"
            type="number"
            step="0.1"
            min="0.1"
            max="5"
            defaultValue={question?.weight ?? 1}
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-body focus:border-smaragd focus:outline-none"
          />
        </div>
      </div>

      {/* Options JSON */}
      <div>
        <label className="mb-1 block text-sm font-medium text-label">
          Antwoordopties (JSON)
        </label>
        <textarea
          value={optionsRaw}
          onChange={(e) => { setOptionsRaw(e.target.value); setOptionsError(null); }}
          rows={8}
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 font-mono text-xs text-body focus:border-smaragd focus:outline-none resize-y"
          placeholder='[{"label": "Optie", "value": 5}]'
        />
        {optionsError && (
          <p className="mt-1 text-xs text-coral">{optionsError}</p>
        )}
        <p className="mt-1 text-xs text-muted">
          Formaat: <code>[{"{"}"label": "Helemaal mee eens", "value": 10{"}"}]</code>
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-smaragd px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-smaragd-dark disabled:opacity-50"
        >
          {isPending ? "Opslaan…" : isNew ? "Vraag toevoegen" : "Wijzigingen opslaan"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted hover:bg-surface-light"
        >
          Annuleren
        </button>
        {!isNew && onDeleted && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPendingDelete}
            className="ml-auto rounded-xl px-5 py-2.5 text-sm font-medium text-coral hover:bg-coral/10 disabled:opacity-50"
          >
            {isPendingDelete ? "Verwijderen…" : "Verwijderen"}
          </button>
        )}
      </div>
    </form>
  );
}
