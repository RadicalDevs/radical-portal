"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Vacature, Kandidaat, KandidaatPlaatsingStatus } from "@/lib/types/crm";
import { logActiviteit } from "./activiteiten";
import { notifyAdmins } from "@/lib/automation/notifyAdmins";
import { emailWrap, datumNL, ROW, BADGE, buildCtaButton } from "@/lib/email/templates";

export type VacatureWithKlant = Omit<Vacature, "klant"> & {
  klant: { id: string; bedrijfsnaam: string } | null;
};

export interface VoorgesteldeKandidaat {
  id: string;
  stage: string;
  status: KandidaatPlaatsingStatus;
  kandidaat: Pick<Kandidaat, "id" | "voornaam" | "achternaam" | "email" | "vaardigheden">;
}

const NUMERIC_FIELDS = new Set(["salaris_min", "salaris_max", "budget"]);

export async function getVacatures(): Promise<VacatureWithKlant[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("vacatures")
    .select("id, functietitel, status, klant_id, salaris_min, salaris_max, sector, created_at, klant:klanten(id, bedrijfsnaam)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) console.error("getVacatures:", error.message);
  return (data || []) as unknown as VacatureWithKlant[];
}

export async function getVacature(id: string): Promise<VacatureWithKlant | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("vacatures")
    .select("*, klant:klanten(id, bedrijfsnaam)")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as unknown as VacatureWithKlant;
}

export async function createVacature(
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  const supabase = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const functietitel = (formData.get("functietitel") as string)?.trim();
  const klant_id = formData.get("klant_id") as string;
  if (!functietitel || !klant_id) {
    return { error: "Functietitel en klant zijn verplicht" };
  }

  const { data, error } = await supabase
    .from("vacatures")
    .insert({
      functietitel,
      klant_id,
      beschrijving: (formData.get("beschrijving") as string) || null,
      salaris_min: Number(formData.get("salaris_min")) || null,
      salaris_max: Number(formData.get("salaris_max")) || null,
      budget: Number(formData.get("budget")) || null,
      status: (formData.get("status") as string) || "open",
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const vacatureId = (data as { id: string }).id;

  // Log activiteit + notificatie (fire-and-forget)
  logActiviteit({
    type: "systeem",
    beschrijving: `Vacature "${functietitel}" aangemaakt`,
    vacature_id: vacatureId,
    klant_id: klant_id,
  }).catch(() => {});

  // Haal klantnaam op voor notificatie
  const { data: klant } = await supabase.from("klanten").select("bedrijfsnaam").eq("id", klant_id).single();
  const klantNaam = (klant as { bedrijfsnaam: string } | null)?.bedrijfsnaam || "";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";
  const salMin = formData.get("salaris_min") as string;
  const salMax = formData.get("salaris_max") as string;
  const salaris = salMin && salMax
    ? `€${Number(salMin).toLocaleString("nl-NL")} – €${Number(salMax).toLocaleString("nl-NL")}`
    : "—";
  notifyAdmins({
    key: "nieuwe_vacature",
    subject: `Nieuwe vacature: ${functietitel}${klantNaam ? ` — ${klantNaam}` : ""}`,
    html: emailWrap("Nieuwe vacature aangemaakt", datumNL(),
      `<table style="width:100%;border-collapse:collapse">
        ${ROW("Functie", functietitel)}
        ${ROW("Klant", klantNaam || "—", true)}
        ${ROW("Salaris", salaris)}
        ${ROW("Status", BADGE("OPEN", "#2ed573"), true)}
      </table>
      ${buildCtaButton(`${siteUrl}/admin/vacatures`, "Bekijk vacature")}`),
    bericht: `${functietitel}${klantNaam ? ` voor ${klantNaam}` : ""} aangemaakt`,
    link: `/admin/vacatures/${vacatureId}`,
  }).catch(() => {});

  revalidatePath("/admin/vacatures");
  return { id: vacatureId };
}

export async function updateVacature(
  id: string,
  field: string,
  value: string
): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const updateValue: unknown = NUMERIC_FIELDS.has(field)
    ? Number(value) || null
    : value || null;

  const { error } = await supabase
    .from("vacatures")
    .update({ [field]: updateValue })
    .eq("id", id);

  if (error) return { error: error.message };

  // Notificatie: vacature gesloten
  if (field === "status" && value === "gesloten") {
    const { data: v } = await supabase
      .from("vacatures")
      .select("functietitel, klant_id")
      .eq("id", id)
      .single();
    if (v) {
      const { data: klant } = await supabase.from("klanten").select("bedrijfsnaam").eq("id", v.klant_id).single();
      const klantNaam = (klant as { bedrijfsnaam: string } | null)?.bedrijfsnaam || "";
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";
      notifyAdmins({
        key: "vacature_gesloten",
        subject: `Vacature gesloten: ${v.functietitel}`,
        html: emailWrap("Vacature gesloten", datumNL(),
          `<table style="width:100%;border-collapse:collapse">
            ${ROW("Functie", v.functietitel)}
            ${ROW("Klant", klantNaam || "—", true)}
            ${ROW("Status", BADGE("GESLOTEN", "#95a5a6"))}
          </table>
          ${buildCtaButton(`${siteUrl}/admin/vacatures/${id}`, "Bekijk vacature")}`),
        bericht: `${v.functietitel}${klantNaam ? ` (${klantNaam})` : ""} is gesloten`,
        link: `/admin/vacatures/${id}`,
      }).catch(() => {});
    }
  }

  revalidatePath(`/admin/vacatures/${id}`);
  revalidatePath("/admin/vacatures");
  return {};
}

export async function deleteVacature(id: string): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("vacatures").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/vacatures");
  return {};
}

export async function getVacatureKandidaten(
  vacatureId: string
): Promise<VoorgesteldeKandidaat[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("kandidaat_plaatsingen")
    .select(
      "id, stage, status, kandidaat:kandidaten(id, voornaam, achternaam, email, vaardigheden)"
    )
    .eq("vacature_id", vacatureId)
    .order("created_at", { ascending: false });
  if (error) console.error("getVacatureKandidaten:", error.message);
  return (data || []) as unknown as VoorgesteldeKandidaat[];
}

export async function linkKandidaatToVacature(
  vacatureId: string,
  kandidaatId: string
): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("kandidaat_plaatsingen").insert({
    kandidaat_id: kandidaatId,
    vacature_id: vacatureId,
    status: "voorgesteld",
    stage: "voorgesteld",
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/vacatures/${vacatureId}`);
  return {};
}

export async function getKandidatenForLinking(
  vacatureId: string
): Promise<{ id: string; voornaam: string; achternaam: string }[]> {
  const supabase = createServiceClient();

  const { data: linked } = await supabase
    .from("kandidaat_plaatsingen")
    .select("kandidaat_id")
    .eq("vacature_id", vacatureId);

  const linkedIds = new Set((linked || []).map((r: { kandidaat_id: string }) => r.kandidaat_id));

  const { data, error } = await supabase
    .from("kandidaten")
    .select("id, voornaam, achternaam")
    .order("achternaam");

  if (error) return [];
  return ((data || []) as { id: string; voornaam: string; achternaam: string }[]).filter(
    (k) => !linkedIds.has(k.id)
  );
}

export async function getKlantenVoorSelect(): Promise<
  { id: string; bedrijfsnaam: string }[]
> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("klanten")
    .select("id, bedrijfsnaam")
    .order("bedrijfsnaam");
  return (data || []) as { id: string; bedrijfsnaam: string }[];
}

export async function getSectorOpties(): Promise<
  { value: string; label: string }[]
> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("matching_sectors")
    .select("key, label")
    .order("order");
  return (data || []).map((s: { key: string; label: string }) => ({
    value: s.key,
    label: s.label,
  }));
}
