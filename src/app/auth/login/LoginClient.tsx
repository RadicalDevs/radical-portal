"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "../actions";

export default function LoginClient() {
  const router = useRouter();
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
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {isCrmUser && (
        <div className="rounded-[8px] border border-amber-700 bg-amber-900/30 px-4 py-4 text-sm">
          <p className="font-medium text-amber-300">
            Dit account hoort bij het CRM
          </p>
          <p className="mt-1 text-amber-400">
            Je probeert in te loggen op het Radical Portal, maar je account is
            gekoppeld aan het CRM-systeem.
          </p>
          <a
            href="https://crm.radicalai.nl"
            className="mt-2 inline-block text-sm font-medium text-amber-300 underline hover:text-amber-900"
          >
            Ga naar crm.radicalai.nl →
          </a>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-label"
        >
          E-mailadres
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jouw@email.nl"
          className="mt-1 block w-full rounded-xl border border-surface-border bg-surface-light/60 px-3 py-2.5 text-heading placeholder:text-muted focus:border-smaragd focus:outline-none focus:ring-1 focus:ring-smaragd/50 transition-colors"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-label"
          >
            Wachtwoord
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-smaragd hover:underline"
          >
            Wachtwoord vergeten?
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
            Inloggen…
          </span>
        ) : (
          "Inloggen"
        )}
      </button>

      <p className="text-center text-sm text-muted">
        Nog geen account?{" "}
        <Link href="/auth/register" className="text-smaragd hover:underline">
          Registreer hier
        </Link>
      </p>
    </form>
  );
}
