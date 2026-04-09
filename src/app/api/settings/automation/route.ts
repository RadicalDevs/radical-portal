import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const { data, error } = await db
    .from("automation_settings")
    .select("*")
    .order("key");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PUT(request: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const { data: profile, error: profileErr } = await db
    .from("portal_users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (profileErr || !profile || (profile as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  let body: { key: string; enabled: boolean; config?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { key, enabled, config } = body;

  const updateData: Record<string, unknown> = {
    enabled,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };
  if (config !== undefined) updateData.config = config;

  const { error } = await db
    .from("automation_settings")
    .update(updateData)
    .eq("key", key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
