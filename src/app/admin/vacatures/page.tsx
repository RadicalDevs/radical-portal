import { getVacatures } from "@/app/admin/actions/vacatures";
import VacaturesClient from "./VacaturesClient";

export default async function VacaturesPage() {
  const vacatures = await getVacatures();
  return <VacaturesClient initialVacatures={vacatures} />;
}
