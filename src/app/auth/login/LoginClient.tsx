"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "../actions";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const verified = searchParams.get("verified");
  const reset = searchParams.get("reset");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCrmUser, setIsCrmUser] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsCrmUser(false);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", email);
      fd.set("password", password);

      const result = await login(fd);

      if (!result.success) {
        if (result.error === "CRM_USER") {
          setIsCrmUser(true);
          return;
        }
        setError(result.error);
        return;
      }

      router.push(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <>
      <div className="text-center">
        <p className="font-heading text-2xl font-bold">
          Radical<span className="gradient-text">Network</span>
        </p>
        <h1 className="mt-3 font-heading text-xl font-bold text-heading">
          {t("auth_welcome_back")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("auth_login_subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {verified === "true" && (
          <div className="rounded-[8px] border border-smaragd/40 bg-smaragd/10 px-4 py-3 text-sm text-smaragd">
            {t("auth_email_verified")}
          </div>
        )}
        {verified === "already" && (
          <div className="rounded-[8px] border border-smaragd/40 bg-smaragd/10 px-4 py-3 text-sm text-smaragd">
            {t("auth_email_already_verified")}
          </div>
        )}
        {reset === "true" && (
          <div className="rounded-[8px] border border-smaragd/40 bg-smaragd/10 px-4 py-3 text-sm text-smaragd">
            {t("auth_password_changed")}
          </div>
        )}

        {isCrmUser && (
          <div className="rounded-[8px] border border-amber-700 bg-amber-900/30 px-4 py-4 text-sm">
            <p className="font-medium text-amber-300">
              {t("auth_crm_account_title")}
            </p>
            <p className="mt-1 text-amber-400">
              {t("auth_crm_account_desc")}
            </p>
            <a
              href="https://crm.radicalai.nl"
              className="mt-2 inline-block text-sm font-medium text-amber-300 underline hover:text-amber-900"
            >
              {t("auth_crm_go_to")}
            </a>
          </div>
        )}

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
            className="mt-1 block w-full rounded-xl border border-surface-border bg-surface-light/60 px-3 py-2.5 text-heading placeholder:text-muted focus:border-smaragd focus:outline-none focus:ring-1 focus:ring-smaragd/50 transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-label"
            >
              {t("auth_password_label")}
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-smaragd hover:underline"
            >
              {t("auth_forgot_password")}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 block w-full rounded-xl border border-surface-border bg-surface-light/60 px-3 py-2.5 text-heading placeholder:text-muted focus:border-smaragd focus:outline-none focus:ring-1 focus:ring-smaragd/50 transition-colors"
          />
        </div>

        {error && (
          <div className="rounded-[8px] border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !email || !password}
          className="flex w-full items-center justify-center rounded-xl bg-smaragd py-3 text-base font-semibold text-white transition-all hover:bg-smaragd-dark hover:shadow-[0_0_24px_rgba(46,213,115,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
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
              {t("auth_signing_in")}
            </span>
          ) : (
            t("auth_sign_in")
          )}
        </button>

        <p className="text-center text-sm text-muted">
          {t("auth_no_account")}{" "}
          <Link href="/auth/register" className="text-smaragd hover:underline">
            {t("auth_register_here")}
          </Link>
        </p>
      </form>
    </>
  );
}
