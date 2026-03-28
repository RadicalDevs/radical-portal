import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata = {
  title: "Wachtwoord vergeten — Radical Portal",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-heading">
            Wachtwoord vergeten
          </h1>
          <p className="mt-2 text-sm text-muted">
            Vul je e-mailadres in en we sturen je een link om je wachtwoord te
            resetten.
          </p>
        </div>

        <ForgotPasswordClient />
      </div>
    </main>
  );
}
