import { createServiceClient } from "@/lib/supabase/server";
import type { NotificatieKey } from "@/config/notificatieTypes";
export { NOTIFICATIE_TYPES } from "@/config/notificatieTypes";
export type { NotificatieKey } from "@/config/notificatieTypes";

/**
 * Geeft alle admin users terug die een notificatie-type aan hebben staan.
 * Default: enabled (geen rij = enabled).
 */
export async function getNotifiableUsers(key: NotificatieKey): Promise<{ id: string; email: string }[]> {
  const supabase = createServiceClient();

  const { data: admins } = await supabase
    .from("portal_users")
    .select("auth_user_id, email")
    .eq("role", "admin");

  if (!admins || admins.length === 0) return [];

  const adminIds = admins.map((a) => a.auth_user_id as string);
  const { data: voorkeuren } = await supabase
    .from("email_voorkeuren")
    .select("user_id, enabled")
    .eq("voorkeur_key", key)
    .in("user_id", adminIds);

  const disabledUserIds = new Set(
    (voorkeuren || [])
      .filter((v) => v.enabled === false)
      .map((v) => v.user_id)
  );

  return admins
    .filter((a) => !disabledUserIds.has(a.auth_user_id) && a.email)
    .map((a) => ({ id: a.auth_user_id as string, email: a.email as string }));
}
