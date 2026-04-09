import { redirect } from "next/navigation";
import { getDashboardData } from "@/app/dashboard/actions";
import SupportClient from "./SupportClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Coaching — Radical Network",
};

export default async function SupportPage() {
  const data = await getDashboardData();
  if (!data) redirect("/auth/login");

  return <SupportClient hasScores={!!data.scores} />;
}
