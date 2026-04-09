import { getVacature, getVacatureKandidaten } from "@/app/admin/actions/vacatures";
import { notFound } from "next/navigation";
import VacatureDetailClient from "./VacatureDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VacatureDetailPage({ params }: Props) {
  const { id } = await params;
  const [vacature, kandidaten] = await Promise.all([
    getVacature(id),
    getVacatureKandidaten(id),
  ]);

  if (!vacature) notFound();

  return <VacatureDetailClient vacature={vacature} kandidaten={kandidaten} />;
}
