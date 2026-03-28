"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { register } from "../actions";

function getPasswordStrength(pw: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: "Zwak", color: "#EF4444" };
  if (score <= 2) return { score, label: "Matig", color: "#F59E0B" };
  if (score <= 3) return { score, label: "Goed", color: "#3B82F6" };
  return { score, label: "Sterk", color: "#2ed573" };
}

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const strength = useMemo(
    () => getPasswordStrength(form.password),
    [form.password]
  );

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

      // Redirect to verify page with email for resend
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
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {sessionId && (
        <div className="rounded-[8px] border border-smaragd/30 bg-smaragd/10 px-4 py-3 text-sm text-smaragd">
          Je APAC-resultaten worden automatisch aan je account gekoppeld.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-label"
          >
            Voornaam
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
            Achternaam
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
          E-mailadres
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="jouw@email.nl"
          className="mt-1 block w-full rounded-xl border border-surface-border bg-surface-light/60 px-3 py-2.5 text-heading placeholder:text-muted focus:border-smaragd focus:outline-none focus:ring-1 focus:ring-smaragd/50 transition-colors"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-label"
        >
          Wachtwoord
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          placeholder="Minimaal 8 tekens"
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
            {form.password.length >= 8 ? "✓" : "○"} Minimaal 8 tekens
          </li>
          <li className={/[A-Z]/.test(form.password) ? "text-smaragd" : ""}>
            {/[A-Z]/.test(form.password) ? "✓" : "○"} Een hoofdletter
          </li>
          <li className={/[0-9]/.test(form.password) ? "text-smaragd" : ""}>
            {/[0-9]/.test(form.password) ? "✓" : "○"} Een cijfer
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
            Account aanmaken…
          </span>
        ) : (
          "Registreer"
        )}
      </button>

      <p className="text-center text-sm text-muted">
        Al een account?{" "}
        <Link href="/auth/login" className="text-smaragd hover:underline">
          Log hier in
        </Link>
      </p>
    </form>
  );
}
