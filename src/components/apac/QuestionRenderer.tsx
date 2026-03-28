"use client";

/**
 * APAC Test Vraag Component
 *
 * Rendert een enkele APAC-vraag met multiple-choice opties.
 * Vragen worden dynamisch geladen uit de apac_questions tabel.
 *
 * TODO: Implementeer volledig in volgende fase
 */

interface QuestionOption {
  label: string;
  value: number;
}

interface QuestionRendererProps {
  questionText: string;
  options: QuestionOption[];
  selectedValue?: number;
  onSelect: (value: number) => void;
}

export default function QuestionRenderer({
  questionText,
  options,
  selectedValue,
  onSelect,
}: QuestionRendererProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-heading">{questionText}</h3>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`w-full rounded-[8px] border px-4 py-3 text-left transition-colors ${
              selectedValue === option.value
                ? "border-smaragd bg-smaragd/10 text-smaragd"
                : "border-surface-border bg-surface text-label hover:border-surface-border"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
