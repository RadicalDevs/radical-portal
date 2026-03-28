import LoginClient from "./LoginClient";

export const metadata = {
  title: "Inloggen — Radical Portal",
};

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-radial-smaragd" />
      <div className="dark:bg-dot-pattern pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-smaragd/8 blur-[80px]" />

      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="glass rounded-2xl p-8 shadow-xl">
          <div className="text-center">
            <p className="font-heading text-2xl font-bold">
              Radical<span className="gradient-text">Portal</span>
            </p>
            <h1 className="mt-3 font-heading text-xl font-bold text-heading">
              Welkom terug
            </h1>
            <p className="mt-1 text-sm text-muted">Log in op je account</p>
          </div>

          <LoginClient />
        </div>
      </div>
    </main>
  );
}
