import { getFacturen, getDevSubscriptions } from "@/app/admin/actions/facturatie";
import FacturatieClient from "./FacturatieClient";

export default async function FacturatiePage() {
  const [facturen, subscriptions] = await Promise.all([
    getFacturen(),
    getDevSubscriptions(),
  ]);
  return <FacturatieClient initialFacturen={facturen} initialSubscriptions={subscriptions} />;
}
