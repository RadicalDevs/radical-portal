import { getRapportageData } from "@/app/admin/actions/rapportages";
import RapportagesClient from "./RapportagesClient";

export default async function RapportagesPage() {
  const data = await getRapportageData();
  return <RapportagesClient data={data} />;
}
