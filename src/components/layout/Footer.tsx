"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-surface-border/60 bg-surface/50 backdrop-blur-sm py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="font-heading text-sm font-bold">
            Radical<span className="gradient-text">{t("brand_suffix")}</span>
          </p>
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Radical Recruitment.{" "}
            {t("footer_rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
