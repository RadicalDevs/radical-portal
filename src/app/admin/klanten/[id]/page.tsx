import { getKlant, getContactpersonen } from "@/app/admin/actions/klanten";
import { notFound } from "next/navigation";
import KlantDetailClient from "./KlantDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function KlantDetailPage({ params }: Props) {
  const { id } = await params;
  const [klant, contactpersonen] = await Promise.all([
    getKlant(id),
    getContactpersonen(id),
  ]);

  if (!klant) notFound();

  return <KlantDetailClient klant={klant} contactpersonen={contactpersonen} />;
}
