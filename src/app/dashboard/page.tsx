import { redirect } from "next/navigation";
import { getDashboardData } from "./actions";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard — Radical Portal",
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    redirect("/auth/login");
  }

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden px-4 py-8 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-radial-smaragd opacity-60" />
      <div className="relative mx-auto w-full max-w-5xl">
        <DashboardClient data={data} />
      </div>
    </main>
  );
}
