import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIE_TYPES } from "@/config/notificatieTypes";

export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const { data: voorkeuren, error: vkError } = await db
    .from("email_voorkeuren")
    .select("voorkeur_key, enabled")
    .eq("user_id", user.id);
  if (vkError) return NextResponse.json({ error: vkError.message }, { status: 500 });

  // Merge met defaults: geen rij = enabled
  const enabledMap: Record<string, boolean> = {};
  for (const t of NOTIFICATIE_TYPES) {
    enabledMap[t.key] = true;
  }
  for (const v of voorkeuren || []) {
    enabledMap[v.voorkeur_key as string] = v.enabled as boolean;
  }

  return NextResponse.json({ voorkeuren: enabledMap, email: user.email });
}

export async function PUT(request: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { key: string; enabled: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key, enabled } = body;
  if (!key || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "key en enabled zijn verplicht" }, { status: 400 });
  }

  const valid = NOTIFICATIE_TYPES.some((t) => t.key === key);
  if (!valid) {
    return NextResponse.json({ error: "Onbekende notificatie key" }, { status: 400 });
  }

  const db = createServiceClient();
  const { error } = await db
    .from("email_voorkeuren")
    .upsert(
      { user_id: user.id, voorkeur_key: key, enabled, updated_at: new Date().toISOString() },
      { onConflict: "user_id,voorkeur_key" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
