"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { resendVerification } from "../actions";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const email = searchParams.get("email") || "";
  const urlError = searchParams.get("error");

  const ERROR_MESSAGES: Record<string, string> = {
    missing_token: t("auth_verify_invalid"),
    invalid_token: t("auth_verify_invalid_used"),
    expired_token: t("auth_verify_expired"),
  };

  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError ? ERROR_MESSAGES[urlError] || t("auth_something_wrong") : null
  );
  const [isPending, startTransition] = useTransition();

  function handleResend() {
    if (!email) return;
    setError(null);
    setSent(false);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("email", email);

      const result = await resendVerification(fd);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSent(true);
    });
  }

  return (
    <>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-smaragd/10">
        <svg
          className="h-8 w-8 text-smaragd"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
      </div>
      <h1 className="mt-4 font-heading text-2xl font-bold text-heading">
        {t("auth_check_email")}
      </h1>
      <p className="mt-2 text-muted">
        {t("auth_verify_desc")}
      </p>

      <div className="mt-6 space-y-3">
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        {sent && (
          <p className="text-sm text-smaragd">
            {t("auth_verify_resent")}
          </p>
        )}
        {email ? (
          <button
            onClick={handleResend}
            disabled={isPending || sent}
            className="text-sm font-medium text-smaragd hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? t("auth_resending")
              : sent
                ? t("auth_resent")
                : t("auth_resend_verification")}
          </button>
        ) : (
          <p className="text-xs text-muted">
            {t("auth_no_email_available")} <a href="/auth/login" className="text-smaragd hover:underline">{t("auth_sign_in")}</a> {t("auth_login_to_resend")}
          </p>
        )}
      </div>

      <p className="mt-8 text-xs text-muted">
        {t("auth_check_spam")}
      </p>
    </>
  );
}
