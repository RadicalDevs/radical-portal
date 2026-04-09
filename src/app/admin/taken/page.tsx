import { getTaken } from "@/app/admin/actions/taken";
import TakenClient from "./TakenClient";

export default async function TakenPage() {
  const taken = await getTaken("alle");
  return <TakenClient initialTaken={taken} />;
}
