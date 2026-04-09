"use server";

import { createServiceClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Taak, TaakStatus, TaakPrioriteit } from "@/lib/types/crm";
import { logActiviteit } from "./activiteiten";

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, hoog: 1, normaal: 2, laag: 3 };

export async function getTaken(filter?: "open" | "in_progress" | "alle"): Promise<Taak[]> {
  const db = createServiceClient();
  let query = db
    .from("taken")
    .select("id, titel, beschrijving, status, prioriteit, deadline, klant_id, kandidaat_id, toegewezen_aan, created_at")
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(100);

  if (!filter || filter === "open") {
    query = query.eq("status", "open");
  } else if (filter === "in_progress") {
    query = query.eq("status", "in_progress");
  } else {
    query = query.neq("status", "afgerond");
  }

  const { data, error } = await query;
  if (error) console.error("[getTaken]", error.message);

  const rows = (data || []) as unknown as Taak[];
  return [...rows].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.prioriteit] ?? 2;
    const pb = PRIORITY_ORDER[b.prioriteit] ?? 2;
    return pa - pb;
  });
}

export async function createTaak(formData: FormData): Promise<{ error?: string }> {
  const db = createServiceClient();
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  const titel = (formData.get("titel") as string)?.trim();
  if (!titel) return { error: "Titel is verplicht" };

  const values = {
    titel,
    beschrijving: (formData.get("beschrijving") as string) || null,
    prioriteit: (formData.get("prioriteit") as TaakPrioriteit) || "normaal",
    deadline: (formData.get("deadline") as string) || null,
    klant_id: (formData.get("klant_id") as string) || null,
    kandidaat_id: (formData.get("kandidaat_id") as string) || null,
    status: "open" as TaakStatus,
    toegewezen_aan: user?.id || null,
    aangemaakt_door: user?.id || null,
  };

  const { error } = await db.from("taken").insert(values);
  if (error) return { error: error.message };

  logActiviteit({
    type: "systeem",
    beschrijving: `Taak "${titel}" aangemaakt (prioriteit: ${values.prioriteit})`,
    klant_id: values.klant_id || undefined,
    kandidaat_id: values.kandidaat_id || undefined,
  }).catch(() => {});

  revalidatePath("/admin/taken");
  return {};
}

export async function updateTaak(id: string, formData: FormData): Promise<{ error?: string }> {
  const db = createServiceClient();

  const values = {
    titel: (formData.get("titel") as string)?.trim(),
    beschrijving: (formData.get("beschrijving") as string) || null,
    prioriteit: (formData.get("prioriteit") as TaakPrioriteit) || "normaal",
    deadline: (formData.get("deadline") as string) || null,
  };

  if (!values.titel) return { error: "Titel is verplicht" };

  const { error } = await db.from("taken").update(values).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/taken");
  return {};
}

export async function updateTaakStatus(id: string, status: TaakStatus): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { error } = await db.from("taken").update({ status }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/taken");
  return {};
}

export async function deleteTaak(id: string): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { error } = await db.from("taken").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/taken");
  return {};
}
