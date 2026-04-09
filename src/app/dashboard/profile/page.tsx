import { redirect } from "next/navigation";
import { getDashboardData } from "../actions";
import ProfilePageClient from "./ProfilePageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profiel — Radical Network",
};

export default async function ProfilePage() {
  const data = await getDashboardData();
  if (!data) redirect("/auth/login");

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-radial-smaragd opacity-50" />
      <div className="pointer-events-none absolute right-1/4 top-[10%] h-[400px] w-[400px] rounded-full bg-coral/5 blur-[100px] animate-float-slow" />

      <div className="relative px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <ProfilePageClient
            profile={data.kandidaat.profile}
            profileComplete={data.kandidaat.profileComplete}
          />
        </div>
      </div>
    </main>
  );
}
