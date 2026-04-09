import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { syncMailbox, decryptPassword } from "@/lib/email/imap-sync";

export async function POST(request: Request) {
  // Vereis admin auth
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: portalUser } = await db
    .from("portal_users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (portalUser?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Optionele ?since= param, standaard 3 jaar terug
  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since") || "2022-01-01";
  const sinceOverride = new Date(sinceParam);

  // Haal alle actieve IMAP configs op
  const { data: configs, error: configError } = await db
    .from("admin_imap_config")
    .select("id, portal_user_id, username, password_encrypted, host, port, last_synced_at")
    .eq("enabled", true);

  if (configError) {
    return NextResponse.json({ error: configError.message }, { status: 500 });
  }

  if (!configs || configs.length === 0) {
    return NextResponse.json({ synced: 0, message: "Geen actieve mailboxen geconfigureerd" });
  }

  const portalUserIds = configs.map((c) => c.portal_user_id);
  const { data: portalUsers } = await db
    .from("portal_users")
    .select("id, auth_user_id")
    .in("id", portalUserIds);

  const userAuthMap = new Map(
    (portalUsers || []).map((u) => [u.id as string, u.auth_user_id as string])
  );

  let totalSynced = 0;
  const errors: string[] = [];

  for (const config of configs) {
    try {
      const synced = await syncMailbox({
        db,
        portalUserId: config.portal_user_id as string,
        authUserId: userAuthMap.get(config.portal_user_id as string) ?? null,
        username: config.username as string,
        password: decryptPassword(config.password_encrypted as string),
        host: (config.host as string) || "mail.infomaniak.com",
        port: (config.port as number) || 993,
        lastSyncedAt: config.last_synced_at as string | null,
        sinceOverride,
      });

      await db
        .from("admin_imap_config")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", config.id);

      totalSynced += synced;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[email-backfill] Fout voor ${config.username}:`, msg);
      errors.push(`${config.username}: ${msg}`);
    }
  }

  return NextResponse.json({
    synced: totalSynced,
    since: sinceParam,
    errors: errors.length > 0 ? errors : undefined,
  });
}
