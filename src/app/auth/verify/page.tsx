import { Suspense } from "react";
import VerifyClient from "./VerifyClient";

export const metadata = {
  title: "E-mail verificatie — Radical Portal",
};

export default function VerifyPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-full max-w-sm">
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
          Controleer je e-mail
        </h1>
        <p className="mt-2 text-muted">
          We hebben een verificatielink naar je e-mailadres gestuurd. Klik op de
          link in de e-mail om je account te activeren.
        </p>

        <Suspense fallback={null}>
          <VerifyClient />
        </Suspense>

        <p className="mt-8 text-xs text-muted">
          Geen e-mail ontvangen? Check ook je spam-folder.
        </p>
      </div>
    </main>
  );
}
