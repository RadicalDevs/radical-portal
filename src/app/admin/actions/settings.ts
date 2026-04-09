"use server";

import { createServiceClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { extractUsedVariables } from "@/config/templateVariables";
import type { CommunicatieTemplate, TemplateType, TemplateCategorie, UserRole } from "@/lib/types/crm";

export async function getTemplates(): Promise<CommunicatieTemplate[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("communicatie_templates")
    .select("id, naam, type, categorie, onderwerp, inhoud, variabelen, created_at")
    .order("categorie")
    .order("naam")
    .limit(50);
  return (data || []) as unknown as CommunicatieTemplate[];
}

export async function createTemplate(formData: FormData): Promise<{ error?: string }> {
  const db = createServiceClient();
  const inhoud = formData.get("inhoud") as string;
  const variabelen = extractUsedVariables(inhoud);

  const { error } = await db.from("communicatie_templates").insert({
    naam: formData.get("naam") as string,
    type: formData.get("type") as TemplateType,
    categorie: formData.get("categorie") as TemplateCategorie,
    onderwerp: (formData.get("onderwerp") as string) || null,
    inhoud,
    variabelen,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return {};
}

export async function updateTemplate(id: string, formData: FormData): Promise<{ error?: string }> {
  const db = createServiceClient();
  const inhoud = formData.get("inhoud") as string;
  const variabelen = extractUsedVariables(inhoud);

  const { error } = await db
    .from("communicatie_templates")
    .update({
      naam: formData.get("naam") as string,
      type: formData.get("type") as TemplateType,
      categorie: formData.get("categorie") as TemplateCategorie,
      onderwerp: (formData.get("onderwerp") as string) || null,
      inhoud,
      variabelen,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return {};
}

export async function deleteTemplate(id: string): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { error } = await db.from("communicatie_templates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return {};
}

export async function getUsers(): Promise<{ id: string; auth_user_id: string; email: string; first_name: string; last_name: string; role: UserRole }[]> {
  const db = createServiceClient();
  const { data } = await db
    .from("portal_users")
    .select("id, auth_user_id, email, first_name, last_name, role")
    .order("created_at");
  return (data || []) as unknown as { id: string; auth_user_id: string; email: string; first_name: string; last_name: string; role: UserRole }[];
}

export async function updateUserRole(userId: string, role: UserRole): Promise<{ error?: string }> {
  const db = createServiceClient();
  const { error } = await db.from("portal_users").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/settings");
  return {};
}

export async function inviteUser(email: string): Promise<{ error?: string }> {
  const db = createServiceClient();

  // Check if user already exists
  const { data: existing } = await db
    .from("portal_users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (existing) return { error: "Dit e-mailadres is al geregistreerd." };

  // Use @supabase/supabase-js directly for admin auth operations
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email.toLowerCase().trim(), {
    redirectTo: `${siteUrl}/auth/callback`,
  });

  if (error) return { error: error.message };
  return {};
}

export async function removeUser(userId: string): Promise<{ error?: string }> {
  const db = createServiceClient();

  // Get auth_user_id first
  const { data: user } = await db
    .from("portal_users")
    .select("auth_user_id")
    .eq("id", userId)
    .single();

  if (!user) return { error: "Gebruiker niet gevonden." };

  // Use @supabase/supabase-js directly for admin auth operations
  // (@supabase/ssr's createServerClient doesn't reliably handle auth.admin)
  const { createClient: createAdminClient } = await import("@supabase/supabase-js");
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: authError } = await adminClient.auth.admin.deleteUser(user.auth_user_id);
  if (authError) return { error: authError.message };

  // Fallback: delete portal_users row manually if CASCADE didn't fire
  await db.from("portal_users").delete().eq("id", userId);

  revalidatePath("/admin/settings");
  return {};
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const info = await getCurrentUserInfo();
  return info?.role ?? null;
}

export async function getCurrentUserInfo(): Promise<{ role: UserRole; email: string } | null> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const db = createServiceClient();
  const { data } = await db.from("portal_users").select("role, email").eq("auth_user_id", user.id).single();
  if (!data) return null;
  return { role: data.role as UserRole, email: data.email as string };
}
