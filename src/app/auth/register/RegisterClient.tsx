"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { register } from "../actions";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const sessionId = searchParams.get("session") || "";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const strength = useMemo(() => {
    const pw = form.password;
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const levels: { max: number; key: TranslationKey; color: string }[] = [
      { max: 1, key: "auth_pw_weak", color: "#EF4444" },
      { max: 2, key: "auth_pw_fair", color: "#F59E0B" },
      { max: 3, key: "auth_pw_good", color: "#3B82F6" },
      { max: Infinity, key: "auth_pw_strong", color: "#2ed573" },
    ];
    const level = levels.find((l) => score <= l.max) ?? levels[3];
    return { score, label: t(level.key), color: level.color };
  }, [form.password, t]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("firstName", form.firstName);
      fd.set("lastName", form.lastName);
      fd.set("email", form.email);
      fd.set("password", form.password);
      fd.set("sessionId", sessionId);

      const result = await register(fd);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const params = new URLSearchParams({ email: form.email });
      router.push(`/auth/verify?${params}`);
    });
  }

  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.password.length >= 8;

  return (
    <>
      <div className="text-center">
        <p className="font-heading text-2xl font-bold">
          Radical<span className="gradient-text">Portal</span>
        </p>
        <h1 className="mt-3 font-heading text-xl font-bold text-heading">
          {t("auth_create_account")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t("auth_register_subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {sessionId && (
          <div className="rounded-[8px] border border-smaragd/30 bg-smaragd/10 px-4 py-3 text-sm text-smaragd">
            {t("auth_apac_linked")}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-label"
            >
              {t("auth_first_name")}
            </label>
            <input
              id="firstName"
              type="text"
              required
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className="mt-1 block w-full rounded-xl border border-surface-border bg-surface-light/60 px-3 py-2.5 text-heading placeholder:text-muted focus:border-smaragd focus:outline-none focus:ring-1 focus:ring-smaragd/50 transition-colors"
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-label"
            >
              {t("auth_last_name")}
            </label>
            <input
              id="lastName"
              type="text"
              required
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className="mt-1 block w-full rounded-xl border border-surface-border bg-surface-light/60 px-3 py-2.5 text-heading placeholder:text-muted focus:border-smaragd focus:outline-none focus:ring-1 focus:ring-smaragd/50 transition-colors"
            />
          </div>
        </div>

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
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder={t("auth_email_placeholder")}
            className="mt-1 block w-full rounded-xl border border-surface-border bg-surface-light/60 px-3 py-2.5 text-heading placeholder:text-muted focus:border-smaragd focus:outline-none focus:ring-1 focus:ring-smaragd/50 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-label"
          >
            {t("auth_password_label")}
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder={t("auth_password_min")}
            className="mt-1 block w-full rounded-xl border border-surface-border bg-surface-light/60 px-3 py-2.5 text-heading placeholder:text-muted focus:border-smaragd focus:outline-none focus:ring-1 focus:ring-smaragd/50 transition-colors"
          />

          {/* Password strength indicator */}
          {form.password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        i <= strength.score ? strength.color : "#E5E7EB",
                    }}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs" style={{ color: strength.color }}>
                {strength.label}
              </p>
            </div>
          )}

          <ul className="mt-2 space-y-0.5 text-xs text-muted">
            <li className={form.password.length >= 8 ? "text-smaragd" : ""}>
              {form.password.length >= 8 ? "✓" : "○"} {t("auth_password_min")}
            </li>
            <li className={/[A-Z]/.test(form.password) ? "text-smaragd" : ""}>
              {/[A-Z]/.test(form.password) ? "✓" : "○"} {t("auth_password_uppercase")}
            </li>
            <li className={/[0-9]/.test(form.password) ? "text-smaragd" : ""}>
              {/[0-9]/.test(form.password) ? "✓" : "○"} {t("auth_password_number")}
            </li>
          </ul>
        </div>

        {error && (
          <div className="rounded-[8px] border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !canSubmit}
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
              {t("auth_creating_account")}
            </span>
          ) : (
            t("auth_register")
          )}
        </button>

        <p className="text-center text-sm text-muted">
          {t("auth_have_account")}{" "}
          <Link href="/auth/login" className="text-smaragd hover:underline">
            {t("auth_login_here")}
          </Link>
        </p>
      </form>
    </>
  );
}
