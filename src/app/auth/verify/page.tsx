import { Suspense } from "react";
import VerifyClient from "./VerifyClient";

export const metadata = {
  title: "E-mail verificatie — Radical Network",
};

export default function VerifyPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <VerifyClient />
        </Suspense>
      </div>
    </main>
  );
}
