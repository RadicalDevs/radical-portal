import { getFactuur } from "@/app/admin/actions/facturatie";
import { notFound } from "next/navigation";
import FactuurDetailClient from "./FactuurDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FactuurDetailPage({ params }: Props) {
  const { id } = await params;
  const factuur = await getFactuur(id);
  if (!factuur) notFound();
  return <FactuurDetailClient factuur={factuur} />;
}
