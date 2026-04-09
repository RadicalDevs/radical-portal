import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata = {
  title: "Nieuw wachtwoord — Radical Network",
};

export default function ResetPasswordPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-radial-smaragd" />
      <div className="dark:bg-dot-pattern pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-sm">
        <div className="glass rounded-2xl p-8 shadow-xl">
          <Suspense fallback={null}>
            <ResetPasswordClient />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
