import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata = {
  title: "Wachtwoord vergeten — Radical Network",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <ForgotPasswordClient />
      </div>
    </main>
  );
}
