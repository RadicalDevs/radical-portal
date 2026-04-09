"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Klant, Contactpersoon } from "@/lib/types/crm";
import { logActiviteit } from "./activiteiten";
import { notifyAdmins } from "@/lib/automation/notifyAdmins";
import { emailWrap, datumNL, ROW, buildCtaButton } from "@/lib/email/templates";

// ─── Klanten ───────────────────────────────────────────────────────────────

export async function getKlanten(): Promise<Klant[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("klanten")
    .select("id, bedrijfsnaam, sector, kvk_nummer, btw_nummer, betaalvoorwaarden, notities, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) console.error("[getKlanten]", error.message);
  return (data || []) as unknown as Klant[];
}

export async function getKlant(id: string): Promise<Klant | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("klanten")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as unknown as Klant;
}

export async function createKlant(formData: FormData): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { data: { user } } = await db.auth.getUser();

  const values = {
    bedrijfsnaam: formData.get("bedrijfsnaam") as string,
    kvk_nummer: (formData.get("kvk_nummer") as string) || null,
    btw_nummer: (formData.get("btw_nummer") as string) || null,
    betaalvoorwaarden: (formData.get("betaalvoorwaarden") as string) || null,
    notities: (formData.get("notities") as string) || null,
    created_by: user?.id,
  };

  if (!values.bedrijfsnaam?.trim()) return { error: "Bedrijfsnaam is verplicht" };

  const { data: inserted, error } = await db.from("klanten").insert(values).select("id").single();
  if (error) return { error: error.message };

  // Log activiteit + notificatie (fire-and-forget)
  const klantId = (inserted as { id: string }).id;
  logActiviteit({
    type: "systeem",
    beschrijving: `Klant "${values.bedrijfsnaam}" aangemaakt`,
    klant_id: klantId,
  }).catch(() => {});

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";
  notifyAdmins({
    key: "nieuwe_klant",
    subject: `Nieuwe klant: ${values.bedrijfsnaam}`,
    html: emailWrap("Nieuwe klant toegevoegd", datumNL(),
      `<table style="width:100%;border-collapse:collapse">
        ${ROW("Bedrijf", values.bedrijfsnaam!)}
      </table>
      ${buildCtaButton(`${siteUrl}/admin/klanten`, "Bekijk klant")}`),
    bericht: `${values.bedrijfsnaam} toegevoegd`,
    link: `/admin/klanten/${klantId}`,
  }).catch(() => {});

  revalidatePath("/admin/klanten");
  return {};
}

export async function updateKlant(
  id: string,
  field: string,
  value: string
): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { error } = await db
    .from("klanten")
    .update({ [field]: value || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/klanten/${id}`);
  return {};
}

export async function deleteKlant(id: string): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { error } = await db.from("klanten").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/klanten");
  return {};
}

// ─── Contactpersonen ──────────────────────────────────────────────────────

export async function getContactpersonen(klantId: string): Promise<Contactpersoon[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("contactpersonen")
    .select("id, klant_id, naam, email, telefoon, functie, is_primair, created_at")
    .eq("klant_id", klantId)
    .order("is_primair", { ascending: false })
    .limit(50);
  if (error) console.error("[getContactpersonen]", error.message);
  return (data || []) as unknown as Contactpersoon[];
}

export async function createContactpersoon(
  klantId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { error } = await db.from("contactpersonen").insert({
    klant_id: klantId,
    naam: formData.get("naam") as string,
    email: (formData.get("email") as string) || null,
    telefoon: (formData.get("telefoon") as string) || null,
    functie: (formData.get("functie") as string) || null,
    is_primair: false,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/klanten/${klantId}`);
  return {};
}

export async function updateContactpersoon(
  contactId: string,
  klantId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const db = createServiceClient();
  const isPrimair = formData.get("is_primair") === "on";

  if (isPrimair) {
    await db
      .from("contactpersonen")
      .update({ is_primair: false })
      .eq("klant_id", klantId);
  }

  const { error } = await db
    .from("contactpersonen")
    .update({
      naam: formData.get("naam") as string,
      email: (formData.get("email") as string) || null,
      telefoon: (formData.get("telefoon") as string) || null,
      functie: (formData.get("functie") as string) || null,
      is_primair: isPrimair,
    })
    .eq("id", contactId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/klanten/${klantId}`);
  return {};
}

export async function deleteContactpersoon(
  contactId: string,
  klantId: string
): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { error } = await db.from("contactpersonen").delete().eq("id", contactId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/klanten/${klantId}`);
  return {};
}
