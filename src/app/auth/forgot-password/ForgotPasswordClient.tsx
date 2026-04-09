"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { forgotPassword } from "../actions";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { t } = useLanguage();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", email);

      const result = await forgotPassword(fd);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="mt-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-smaragd/10">
          <svg
            className="h-6 w-6 text-smaragd"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="mt-4 text-label">
          {t("auth_reset_link_sent")}
        </p>
        <Link
          href="/auth/login"
          className="mt-4 inline-block text-sm text-smaragd hover:underline"
        >
          {t("auth_back_to_login")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold text-heading">
          {t("auth_forgot_password_title")}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {t("auth_forgot_password_desc")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-label"
          >
            {t("auth_email_label")}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth_email_placeholder")}
            className="mt-1 block w-full rounded-[8px] border border-surface-border bg-surface px-3 py-2.5 text-heading placeholder-muted focus:border-smaragd focus:ring-1 focus:ring-smaragd"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending || !email}
          className="flex w-full items-center justify-center rounded-[8px] bg-smaragd py-3 text-base font-semibold text-white transition-colors hover:bg-smaragd-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? t("auth_sending") : t("auth_send_reset_link")}
        </button>

        <p className="text-center text-sm text-muted">
          <Link href="/auth/login" className="text-smaragd hover:underline">
            {t("auth_back_to_login")}
          </Link>
        </p>
      </form>
    </>
  );
}
