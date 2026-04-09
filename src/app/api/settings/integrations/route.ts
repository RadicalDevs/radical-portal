import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401, user: null };

  const db = createServiceClient();
  const { data: profile } = await db
    .from("portal_users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || (profile as { role: string }).role !== "admin") {
    return { error: "Geen toegang", status: 403, user: null };
  }

  return { error: null, status: 200, user };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = createServiceClient();
  const { data, error } = await db
    .from("integration_settings")
    .select("*")
    .order("key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mask secrets — alleen tonen of een veld ingevuld is
  const masked = (data || []).map((row: Record<string, unknown>) => {
    const secrets = (row.secrets || {}) as Record<string, string>;
    const maskedSecrets: Record<string, string> = {};
    for (const [k, v] of Object.entries(secrets)) {
      maskedSecrets[k] = v ? "••••••••" : "";
    }
    return { ...row, secrets: maskedSecrets };
  });

  return NextResponse.json({ integrations: masked });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { key: string; secrets?: Record<string, string>; enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { key, secrets, enabled } = body;

  if (!key) return NextResponse.json({ error: "Key is verplicht" }, { status: 400 });

  const db = createServiceClient();

  const { data: current } = await db
    .from("integration_settings")
    .select("secrets")
    .eq("key", key)
    .single();

  const currentSecrets = ((current as Record<string, unknown>)?.secrets || {}) as Record<string, string>;

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: auth.user!.id,
  };

  if (enabled !== undefined) {
    updateData.enabled = enabled;
  }

  if (secrets) {
    const merged: Record<string, string> = { ...currentSecrets };
    for (const [field, value] of Object.entries(secrets)) {
      if (value && value !== "••••••••") {
        merged[field] = value;
      }
    }
    updateData.secrets = merged;

    const hasAnySecret = Object.values(merged).some((v) => v.length > 0);
    if (enabled === undefined) {
      updateData.enabled = hasAnySecret;
    }
  }

  const { error } = await db
    .from("integration_settings")
    .update(updateData)
    .eq("key", key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
