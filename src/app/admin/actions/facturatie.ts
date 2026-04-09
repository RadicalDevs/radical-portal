"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Factuur, FactuurRegel, FactuurStatus, DevSubscription } from "@/lib/types/crm";
import { logActiviteit } from "./activiteiten";
import { notifyAdmins } from "@/lib/automation/notifyAdmins";
import { emailWrap, datumNL, ROW, BADGE, buildCtaButton } from "@/lib/email/templates";

export type FactuurWithKlant = Omit<Factuur, "klant"> & {
  klant: { id: string; bedrijfsnaam: string; kvk_nummer?: string; btw_nummer?: string } | null;
};

export type DevSubscriptionWithRelations = Omit<DevSubscription, "kandidaat" | "klant"> & {
  kandidaat: { voornaam: string; achternaam: string } | null;
  klant: { bedrijfsnaam: string } | null;
};

function generateFactuurnummer(): string {
  const year = new Date().getFullYear();
  const nr = String(Date.now() % 100000).padStart(5, "0");
  return `RAD-${year}-${nr}`;
}

export async function getFacturen(): Promise<FactuurWithKlant[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("facturen")
    .select("id, factuurnummer, klant_id, bedrag, btw_bedrag, totaal_bedrag, status, factuurdatum, vervaldatum, betaaldatum, regels, created_at, klant:klanten(id, bedrijfsnaam, kvk_nummer, btw_nummer)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) console.error("getFacturen:", error.message);
  return (data || []) as unknown as FactuurWithKlant[];
}

export async function getFactuur(id: string): Promise<FactuurWithKlant | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("facturen")
    .select("*, klant:klanten(id, bedrijfsnaam, kvk_nummer, btw_nummer)")
    .eq("id", id)
    .single();
  return data as unknown as FactuurWithKlant | null;
}

export async function createFactuur(
  formData: FormData,
  regels: FactuurRegel[]
): Promise<{ error?: string; id?: string }> {
  const supabase = createServiceClient();

  const klant_id = formData.get("klant_id") as string;
  const factuurdatum = formData.get("factuurdatum") as string;
  const vervaldatum = formData.get("vervaldatum") as string;

  if (!klant_id || !factuurdatum || !vervaldatum) {
    return { error: "Klant, factuurdatum en vervaldatum zijn verplicht." };
  }

  const filledRegels = regels.filter((r) => r.omschrijving.trim());
  if (!filledRegels.length) {
    return { error: "Voeg minimaal één factuuregel met omschrijving toe." };
  }

  const subtotaal = filledRegels.reduce((s, r) => s + r.aantal * r.eenheidsprijs, 0);
  const btwBedrag = filledRegels.reduce(
    (s, r) => s + r.aantal * r.eenheidsprijs * (r.btw_percentage / 100),
    0
  );
  const totaalBedrag = subtotaal + btwBedrag;

  const { data, error } = await supabase
    .from("facturen")
    .insert({
      factuurnummer: (formData.get("factuurnummer") as string) || generateFactuurnummer(),
      klant_id,
      bedrag: subtotaal,
      btw_bedrag: btwBedrag,
      totaal_bedrag: totaalBedrag,
      regels: filledRegels,
      status: (formData.get("status") as string) || "concept",
      factuurdatum,
      vervaldatum,
      notities: (formData.get("notities") as string) || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const factuurId = (data as { id: string }).id;
  logActiviteit({
    type: "systeem",
    beschrijving: `Factuur aangemaakt (${(formData.get("factuurnummer") as string) || "auto"}) — €${totaalBedrag.toFixed(2)}`,
    klant_id: klant_id,
  }).catch(() => {});

  revalidatePath("/admin/facturatie");
  return { id: factuurId };
}

export async function updateFactuur(
  id: string,
  formData: FormData,
  regels: FactuurRegel[]
): Promise<{ error?: string }> {
  const supabase = createServiceClient();

  const filledRegels = regels.filter((r) => r.omschrijving.trim());
  if (!filledRegels.length) {
    return { error: "Voeg minimaal één factuuregel met omschrijving toe." };
  }

  const subtotaal = filledRegels.reduce((s, r) => s + r.aantal * r.eenheidsprijs, 0);
  const btwBedrag = filledRegels.reduce(
    (s, r) => s + r.aantal * r.eenheidsprijs * (r.btw_percentage / 100),
    0
  );

  const { error } = await supabase
    .from("facturen")
    .update({
      factuurnummer: formData.get("factuurnummer") as string,
      klant_id: formData.get("klant_id") as string,
      bedrag: subtotaal,
      btw_bedrag: btwBedrag,
      totaal_bedrag: subtotaal + btwBedrag,
      regels: filledRegels,
      status: formData.get("status") as string,
      factuurdatum: formData.get("factuurdatum") as string,
      vervaldatum: formData.get("vervaldatum") as string,
      notities: (formData.get("notities") as string) || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/admin/facturatie/${id}`);
  revalidatePath("/admin/facturatie");
  return {};
}

export async function updateFactuurStatus(
  id: string,
  status: FactuurStatus
): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const updates: Record<string, string> = { status };
  if (status === "betaald") {
    updates.betaaldatum = new Date().toISOString().split("T")[0];
  }
  const { error } = await supabase.from("facturen").update(updates).eq("id", id);
  if (error) return { error: error.message };

  // Log activiteit bij statuswijziging
  if (status === "betaald") {
    const { data: factuur } = await supabase
      .from("facturen")
      .select("factuurnummer, totaal_bedrag, klant_id, klant:klanten(bedrijfsnaam)")
      .eq("id", id)
      .single();

    if (factuur) {
      const raw = factuur as unknown as { factuurnummer: string; totaal_bedrag: number; klant_id: string; klant: { bedrijfsnaam: string } | { bedrijfsnaam: string }[] | null };
      const klantObj = Array.isArray(raw.klant) ? raw.klant[0] : raw.klant;
      const f = { ...raw, klant: klantObj || null };
      logActiviteit({
        type: "systeem",
        beschrijving: `Factuur ${f.factuurnummer} betaald — €${(f.totaal_bedrag ?? 0).toFixed(2)}`,
        klant_id: f.klant_id,
      }).catch(() => {});

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";
      notifyAdmins({
        key: "factuur_betaald",
        subject: `Factuur betaald: ${f.factuurnummer} — €${(f.totaal_bedrag ?? 0).toLocaleString("nl-NL")}`,
        html: emailWrap("Factuur betaald", datumNL(),
          `<table style="width:100%;border-collapse:collapse">
            ${ROW("Factuur", f.factuurnummer)}
            ${ROW("Klant", f.klant?.bedrijfsnaam || "—", true)}
            ${ROW("Bedrag", `€${(f.totaal_bedrag ?? 0).toLocaleString("nl-NL")}`)}
            ${ROW("Status", BADGE("BETAALD", "#2ed573"), true)}
          </table>
          ${buildCtaButton(`${siteUrl}/admin/facturatie/${id}`, "Bekijk factuur")}`),
        bericht: `${f.factuurnummer} betaald: €${(f.totaal_bedrag ?? 0).toLocaleString("nl-NL")}`,
        link: `/admin/facturatie/${id}`,
      }).catch(() => {});
    }
  }

  revalidatePath(`/admin/facturatie/${id}`);
  revalidatePath("/admin/facturatie");
  return {};
}

export async function updateFactuurStatusField(
  id: string,
  field: string,
  value: string
): Promise<{ error?: string }> {
  if (field !== "status") return {};
  return updateFactuurStatus(id, value as FactuurStatus);
}

export async function deleteFactuur(id: string): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("facturen").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/facturatie");
  return {};
}

export async function getDevSubscriptions(): Promise<DevSubscriptionWithRelations[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("dev_subscriptions")
    .select("id, kandidaat_id, klant_id, deal_id, bedrag_per_maand, startdatum, einddatum, status, created_at, kandidaat:kandidaten(voornaam, achternaam), klant:klanten(bedrijfsnaam)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) console.error("getDevSubscriptions:", error.message);
  return (data || []) as unknown as DevSubscriptionWithRelations[];
}

export async function getKlantenVoorFactuur(): Promise<{ id: string; bedrijfsnaam: string }[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("klanten")
    .select("id, bedrijfsnaam")
    .order("bedrijfsnaam");
  return (data || []) as { id: string; bedrijfsnaam: string }[];
}
