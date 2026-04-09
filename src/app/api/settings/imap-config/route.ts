import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { ImapFlow } from "imapflow";

// Eenvoudige "encryptie": base64 encoding + prefix zodat het niet plaintext in DB staat.
// Voor productie zou je een echte encryptie lib gebruiken, maar dit is voldoende voor nu.
function encryptPassword(password: string): string {
  return "b64:" + Buffer.from(password).toString("base64");
}

function decryptPassword(encrypted: string): string {
  if (encrypted.startsWith("b64:")) {
    return Buffer.from(encrypted.slice(4), "base64").toString("utf-8");
  }
  return encrypted;
}

async function getPortalUserId(authUserId: string): Promise<string | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("portal_users")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();
  return data?.id ?? null;
}

export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portalUserId = await getPortalUserId(user.id);
  if (!portalUserId) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  const db = createServiceClient();
  const { data } = await db
    .from("admin_imap_config")
    .select("username, host, port, enabled, last_synced_at, created_at")
    .eq("portal_user_id", portalUserId)
    .single();

  if (!data) return NextResponse.json({ config: null });

  return NextResponse.json({
    config: {
      username: data.username,
      enabled: data.enabled,
      last_synced_at: data.last_synced_at,
      created_at: data.created_at,
      // Wachtwoord nooit terugsturen
    },
  });
}

export async function PUT(request: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portalUserId = await getPortalUserId(user.id);
  if (!portalUserId) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  let body: { username: string; password: string; host?: string; port?: number; enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const { username, password, host = "mail.infomaniak.com", port = 993, enabled = true } = body;
  if (!username || !password) {
    return NextResponse.json({ error: "E-mailadres en wachtwoord zijn verplicht" }, { status: 400 });
  }

  // Test de IMAP verbinding vóór opslaan
  const testClient = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user: username, pass: password },
    logger: false,
  });

  try {
    await testClient.connect();
    await testClient.logout();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const fullError = (err as Record<string, unknown>)?.responseText ?? "";
    console.error("[imap-config] IMAP fout voor", username, ":", msg, fullError);
    const userMessage = fullError?.toString().toLowerCase().includes("invalid login")
      ? "Inloggen mislukt. Gebruik een device-wachtwoord: ga naar manager.infomaniak.com → Mail → Mailboxen → jouw mailbox → Connected device → Add."
      : `Verbinding mislukt: ${msg}`;
    return NextResponse.json({ error: userMessage }, { status: 400 });
  }

  const db = createServiceClient();

  // Controleer of er al een config is (voor upsert logic)
  const { data: existing } = await db
    .from("admin_imap_config")
    .select("id, password_encrypted")
    .eq("portal_user_id", portalUserId)
    .single();

  const passwordEncrypted = password === "••••••••"
    ? existing?.password_encrypted ?? encryptPassword(password)
    : encryptPassword(password);

  const { error } = await db
    .from("admin_imap_config")
    .upsert(
      {
        portal_user_id: portalUserId,
        username,
        password_encrypted: passwordEncrypted,
        host,
        port,
        enabled,
      },
      { onConflict: "portal_user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portalUserId = await getPortalUserId(user.id);
  if (!portalUserId) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  const db = createServiceClient();
  const { error } = await db
    .from("admin_imap_config")
    .delete()
    .eq("portal_user_id", portalUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Exporteer decryptPassword voor gebruik in de cron
export { decryptPassword };
