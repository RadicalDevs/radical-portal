"use client";

import { useState } from "react";
import Link from "next/link";
import ApacFormClient from "./ApacFormClient";
import FormConfigClient from "./FormConfigClient";
import QuestionAnalyticsClient from "./QuestionAnalyticsClient";
import type { AdminApacQuestion } from "../actions";
import type { ApacFormConfig } from "@/lib/apac/types";

const TABS = [
  { id: "vragen", label: "Vragen" },
  { id: "configuratie", label: "Formulier instellingen" },
  { id: "analyse", label: "Vraag Analyse" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function ApacFormTabs({
  questions,
  formConfig,
}: {
  questions: AdminApacQuestion[];
  formConfig: ApacFormConfig | null;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("vragen");

  return (
    <div className="space-y-4">
      {/* Tab bar + preview button */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1 rounded-xl border border-surface-border bg-surface p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-smaragd text-white shadow-sm"
                  : "text-muted hover:text-heading"
              }`}
            >
              {tab.label}
              {tab.id === "vragen" && (
                <span
                  className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-surface-light text-muted"
                  }`}
                >
                  {questions.filter((q) => q.is_active).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <Link
          href="/admin/apac-form/preview"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-medium text-heading transition-all hover:bg-surface-light"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Preview
        </Link>
      </div>

      {/* Tab content */}
      {activeTab === "vragen" && <ApacFormClient questions={questions} />}
      {activeTab === "configuratie" && <FormConfigClient config={formConfig} />}
      {activeTab === "analyse" && <QuestionAnalyticsClient />}
    </div>
  );
}
