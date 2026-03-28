"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { resendVerification } from "../actions";

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  if (!email) return null;

  return (
    <div className="mt-6">
      {sent && (
        <p className="mb-3 text-sm text-smaragd">
          Verificatie-email opnieuw verstuurd.
        </p>
      )}
      {error && (
        <p className="mb-3 text-sm text-red-400">{error}</p>
      )}
      <button
        onClick={handleResend}
        disabled={isPending || sent}
        className="text-sm font-medium text-smaragd hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? "Versturen…"
          : sent
            ? "Verstuurd"
            : "Verificatie-email opnieuw versturen"}
      </button>
    </div>
  );
}
