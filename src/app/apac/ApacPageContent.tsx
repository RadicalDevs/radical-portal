"use client";

import { Suspense } from "react";
import ApacStartClient from "./ApacStartClient";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ApacPageContent() {
  const { t } = useLanguage();

  const infoCards = [
    { icon: "⏱", label: t("apac_card_time") },
    { icon: "🎯", label: t("apac_card_honest") },
    { icon: "🔒", label: t("apac_card_private") },
    { icon: "📊", label: t("apac_card_insight") },
  ];

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Hero */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-smaragd">
            {t("apac_badge")}
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-heading sm:text-4xl">
            {t("apac_title")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-heading">
            {t("apac_desc_pre")}{" "}
            <span className="font-medium text-smaragd">Adaptability</span>
            {", "}
            <span className="font-medium text-smaragd">Personality</span>
            {", "}
            <span className="font-medium text-smaragd">Awareness</span>
            {" and "}
            <span className="font-medium text-smaragd">Connection</span>
            {t("apac_desc_post")}
          </p>
        </div>

        {/* Info cards */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          {infoCards.map((item) => (
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
          {t("apac_privacy")}
        </p>
      </div>
    </main>
  );
}
