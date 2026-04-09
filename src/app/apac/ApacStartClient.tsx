"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Turnstile } from "@marsidev/react-turnstile";
import { createApacSession } from "./actions";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export default function ApacStartClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "website";
  const { t } = useLanguage();

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fallback: als Turnstile niet laadt (ad blocker), ontgrendel knop na 3s
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    const timer = setTimeout(() => {
      setTurnstileToken((current) => {
        if (!current) setCaptchaFailed(true);
        return current;
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const canStart =
    firstName.trim().length > 0 &&
    email.trim().length > 0 &&
    email.includes("@");

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!turnstileToken && TURNSTILE_SITE_KEY && !captchaFailed) {
      setError(t("apac_form_captcha_error"));
      return;
    }
    const token = turnstileToken || "";

    startTransition(async () => {
      const formData = new FormData();
      formData.set("turnstileToken", token);
      formData.set("source", source);
      formData.set("firstName", firstName.trim());
      formData.set("email", email.trim().toLowerCase());

      const result = await createApacSession(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      sessionStorage.setItem(
        "apac_session",
        JSON.stringify({
          sessionId: result.sessionId,
          sessionToken: result.sessionToken,
          kandidaatId: result.kandidaatId,
        })
      );

      router.push("/apac/test");
    });
  }

  return (
    <form onSubmit={handleStart} className="mt-8 space-y-4">
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-label">
          {t("apac_form_firstname")}
        </label>
        <input
          id="firstName"
          type="text"
          required
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={t("apac_form_firstname_placeholder")}
          className="mt-1 block w-full rounded-[8px] border border-surface-border bg-surface px-4 py-2.5 text-heading placeholder-muted focus:border-smaragd focus:ring-1 focus:ring-smaragd"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-label">
          {t("apac_form_email")}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="mt-1 block w-full rounded-[8px] border border-surface-border bg-surface px-4 py-2.5 text-heading placeholder-muted focus:border-smaragd focus:ring-1 focus:ring-smaragd"
        />
        <p className="mt-1 text-xs text-muted">
          {t("apac_form_email_hint")}
        </p>
      </div>

      {/* Turnstile captcha */}
      {TURNSTILE_SITE_KEY ? (
        <div className="flex justify-center pt-2">
          <Turnstile
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => { setCaptchaFailed(true); }}
            options={{ theme: "dark", size: "normal" }}
          />
        </div>
      ) : null}

      {error && (
        <p className="text-center text-sm text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={
          isPending ||
          !canStart ||
          (TURNSTILE_SITE_KEY !== "" && !turnstileToken && !captchaFailed)
        }
        className="flex w-full items-center justify-center rounded-[8px] bg-smaragd px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-smaragd-dark hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {t("apac_form_waiting")}
          </span>
        ) : (
          t("apac_form_submit")
        )}
      </button>
    </form>
  );
}
