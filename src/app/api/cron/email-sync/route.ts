import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncMailbox, decryptPassword } from "@/lib/email/imap-sync";

// Vercel injecteert CRON_SECRET automatisch bij scheduled invocations
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Dev zonder secret: altijd toestaan
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();

  // Optionele ?since= param voor backfill (bijv. since=2020-01-01)
  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  const sinceOverride = sinceParam ? new Date(sinceParam) : undefined;

  // Haal alle actieve IMAP configs op
  const { data: configs, error: configError } = await db
    .from("admin_imap_config")
    .select("id, portal_user_id, username, password_encrypted, host, port, last_synced_at")
    .eq("enabled", true);

  if (configError) {
    console.error("[email-sync] Fout bij ophalen configs:", configError.message);
    return NextResponse.json({ error: configError.message }, { status: 500 });
  }

  if (!configs || configs.length === 0) {
    return NextResponse.json({ synced: 0, message: "Geen actieve mailboxen geconfigureerd" });
  }

  // Haal auth_user_id op voor elke portal_user (nodig voor activiteiten.user_id)
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

      // Update last_synced_at (ook na backfill, zodat cron verder gaat vanaf nu)
      await db
        .from("admin_imap_config")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", config.id);

      totalSynced += synced;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[email-sync] Fout voor ${config.username}:`, msg);
      errors.push(`${config.username}: ${msg}`);
    }
  }

  return NextResponse.json({
    synced: totalSynced,
    errors: errors.length > 0 ? errors : undefined,
  });
}
