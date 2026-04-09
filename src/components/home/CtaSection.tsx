"use client";

import Link from "next/link";
import AnimatedSection from "./AnimatedSection";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function CtaSection() {
  const { t } = useLanguage();

  return (
    <section className="px-4 py-24 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <AnimatedSection>
          <div className="card-gradient-border relative overflow-hidden rounded-2xl p-10 text-center sm:p-14">
            {/* Background glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-smaragd/10 blur-[80px]" />

            <div className="relative">
              <h2 className="font-heading text-3xl font-bold text-heading sm:text-4xl">
                {t("cta_title_pre")}{" "}
                <span className="gradient-text">{t("cta_title_accent")}</span>
                {t("cta_title_post")}
              </h2>

              <p className="mx-auto mt-4 max-w-lg text-muted">
                {t("cta_desc")}
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/apac"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-smaragd px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:bg-smaragd-dark hover:shadow-[0_0_40px_rgba(46,213,115,0.4)] hover:-translate-y-1 animate-shimmer"
                >
                  {t("cta_primary")}
                  <svg
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
                <Link
                  href="/auth/register"
                  className="text-sm font-medium text-muted transition-colors hover:text-smaragd"
                >
                  {t("cta_secondary")}
                </Link>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
