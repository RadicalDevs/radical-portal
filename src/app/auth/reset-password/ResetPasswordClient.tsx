"use client";

import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPassword } from "../actions";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!token) {
    return (
      <div className="mt-8 text-center">
        <p className="text-sm text-red-400">{t("auth_invalid_reset_link")}</p>
        <a href="/auth/forgot-password" className="mt-2 inline-block text-sm text-smaragd hover:underline">
          {t("auth_forgot_password_link")}
        </a>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t("auth_passwords_no_match"));
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("token", token!);
      fd.set("password", password);

      const result = await resetPassword(fd);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/auth/login?reset=true");
    });
  }

  return (
    <>
      <div className="text-center">
        <p className="font-heading text-2xl font-bold">
          Radical<span className="gradient-text">Portal</span>
        </p>
        <h1 className="mt-3 font-heading text-xl font-bold text-heading">
          {t("auth_new_password")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("auth_new_password_subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-label">
            {t("auth_new_password")}
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 block w-full rounded-xl border border-surface-border bg-surface-light/60 px-3 py-2.5 text-heading placeholder:text-muted focus:border-smaragd focus:outline-none focus:ring-1 focus:ring-smaragd/50 transition-colors"
          />
          <p className="mt-1 text-xs text-muted">{t("auth_password_requirements")}</p>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-label">
            {t("auth_confirm_password")}
          </label>
          <input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          disabled={isPending || !password || !confirm}
          className="flex w-full items-center justify-center rounded-xl bg-smaragd py-3 text-base font-semibold text-white transition-all hover:bg-smaragd-dark hover:shadow-[0_0_24px_rgba(46,213,115,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? t("auth_saving") : t("auth_save_password")}
        </button>
      </form>
    </>
  );
}
