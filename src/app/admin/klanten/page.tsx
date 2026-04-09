import { getKlanten } from "@/app/admin/actions/klanten";
import KlantenClient from "./KlantenClient";

export default async function KlantenPage() {
  const klanten = await getKlanten();
  return <KlantenClient initialKlanten={klanten} />;
}
