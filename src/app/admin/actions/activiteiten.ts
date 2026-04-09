"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { Activiteit, ActiviteitType } from "@/lib/types/crm";

export interface ActiviteitWithUser extends Activiteit {
  user?: { full_name: string } | null;
}

export async function getActiviteiten(
  options: {
    klant_id?: string;
    kandidaat_id?: string;
    vacature_id?: string;
    limit?: number;
    offset?: number;
    type?: ActiviteitType;
  }
): Promise<ActiviteitWithUser[]> {
  const db = createServiceClient();
  let query = db
    .from("activiteiten")
    .select("*")
    .order("created_at", { ascending: false })
    .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1);

  if (options.klant_id) query = query.eq("klant_id", options.klant_id);
  if (options.kandidaat_id) query = query.eq("kandidaat_id", options.kandidaat_id);
  if (options.vacature_id) query = query.eq("vacature_id", options.vacature_id);
  if (options.type) query = query.eq("type", options.type);

  const { data, error } = await query;
  if (error) console.error("[getActiviteiten]", error.message);

  const activiteiten = (data || []) as unknown as Activiteit[];

  // Secondary lookup: haal gebruikersnamen op uit portal_users
  const userIds = [...new Set(activiteiten.map((a) => a.user_id).filter(Boolean))] as string[];
  let userMap = new Map<string, { first_name: string; last_name: string }>();
  if (userIds.length > 0) {
    const { data: users } = await db
      .from("portal_users")
      .select("auth_user_id, first_name, last_name")
      .in("auth_user_id", userIds);
    userMap = new Map(
      (users || []).map((u) => [u.auth_user_id as string, u as { first_name: string; last_name: string }])
    );
  }

  return activiteiten.map((a) => {
    const u = a.user_id ? userMap.get(a.user_id) : null;
    return {
      ...a,
      user: u ? { full_name: [u.first_name, u.last_name].filter(Boolean).join(" ") } : null,
    };
  });
}

export async function createActiviteit(data: {
  type: ActiviteitType;
  beschrijving: string;
  klant_id?: string;
  kandidaat_id?: string;
  vacature_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { data: { user } } = await db.auth.getUser();

  const { error } = await db.from("activiteiten").insert({
    ...data,
    user_id: user?.id ?? null,
  });

  if (error) return { error: error.message };
  return {};
}

export async function updateActiviteit(
  id: string,
  beschrijving: string
): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { error } = await db
    .from("activiteiten")
    .update({ beschrijving })
    .eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteActiviteit(id: string): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { error } = await db.from("activiteiten").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

/**
 * Fire-and-forget activiteit logging — voor gebruik binnen andere server actions.
 * Logt naar console bij fout, gooit niet.
 */
export async function logActiviteit(data: {
  type: ActiviteitType;
  beschrijving: string;
  klant_id?: string;
  kandidaat_id?: string;
  vacature_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from("activiteiten").insert({
    ...data,
    user_id: null,
  });
  if (error) console.error("[logActiviteit]", error.message);
}
