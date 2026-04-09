import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;

  const db = createServiceClient();
  const { data: profile } = await db
    .from("portal_users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if ((profile as { role: string } | null)?.role !== "admin") return null;
  return user.id;
}

export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const [configRes, roltypesRes, sectorsRes, cultuurPijlersRes] = await Promise.all([
    db.from("matching_config").select("*").order("scope_type"),
    db.from("matching_roltypes").select("*").order("order"),
    db.from("matching_sectors").select("*").order("order"),
    db.from("matching_cultuur_pijlers").select("*").order("order"),
  ]);

  if (configRes.error) return NextResponse.json({ error: configRes.error.message }, { status: 500 });
  if (roltypesRes.error) return NextResponse.json({ error: roltypesRes.error.message }, { status: 500 });
  if (sectorsRes.error) return NextResponse.json({ error: sectorsRes.error.message }, { status: 500 });
  if (cultuurPijlersRes.error) return NextResponse.json({ error: cultuurPijlersRes.error.message }, { status: 500 });

  return NextResponse.json({
    config: configRes.data || [],
    roltypes: roltypesRes.data || [],
    sectors: sectorsRes.data || [],
    cultuurPijlers: cultuurPijlersRes.data || [],
  });
}

export async function PUT(request: NextRequest) {
  const userId = await requireAdmin();
  if (!userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createServiceClient();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { entity } = body as { entity: string };

  if (entity === "config") {
    const { scope_type, scope_key, weights, hard_filters, apac_gewichten, cultuur_gewichten, cultuur_defaults, scoring, defaults, disabled_components } = body;
    const { error } = await db
      .from("matching_config")
      .upsert(
        {
          scope_type,
          scope_key: (scope_key as string) || "__global__",
          weights: weights || null,
          hard_filters: hard_filters || null,
          apac_gewichten: apac_gewichten || null,
          defaults: defaults || null,
          cultuur_gewichten: cultuur_gewichten || null,
          cultuur_defaults: cultuur_defaults || null,
          scoring: scoring || null,
          disabled_components: disabled_components || [],
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "scope_type,scope_key" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (entity === "roltype") {
    const { key, label, order, zoektermen } = body;
    const { error } = await db
      .from("matching_roltypes")
      .upsert({ key, label, order: order ?? 0, zoektermen: zoektermen || [] }, { onConflict: "key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (entity === "sector") {
    const { key, label, order } = body;
    const { error } = await db
      .from("matching_sectors")
      .upsert({ key, label, order: order ?? 0 }, { onConflict: "key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (entity === "cultuur_pijler") {
    const { key, label, beschrijving, apac_mapping, kleur, order } = body;
    const { error } = await db
      .from("matching_cultuur_pijlers")
      .upsert({ key, label, beschrijving: beschrijving || null, apac_mapping: apac_mapping || null, kleur: kleur || "#3B82F6", order: order ?? 0 }, { onConflict: "key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const userId = await requireAdmin();
  if (!userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createServiceClient();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { entity } = body as { entity: string };

  if (entity === "config") {
    const { scope_type, scope_key } = body;
    const resolvedKey = (scope_key as string) || "__global__";
    const { error } = await db.from("matching_config").delete().eq("scope_type", scope_type).eq("scope_key", resolvedKey);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (entity === "roltype") {
    const { key } = body;
    const { error: cascadeErr } = await db.from("matching_config").delete().eq("scope_type", "roltype").eq("scope_key", key);
    if (cascadeErr) console.error("[matching] cascade delete roltype config error:", cascadeErr.message);
    const { error } = await db.from("matching_roltypes").delete().eq("key", key);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (entity === "sector") {
    const { key } = body;
    const { error: cascadeErr } = await db.from("matching_config").delete().eq("scope_type", "sector").eq("scope_key", key);
    if (cascadeErr) console.error("[matching] cascade delete sector config error:", cascadeErr.message);
    const { error } = await db.from("matching_sectors").delete().eq("key", key);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (entity === "cultuur_pijler") {
    const { key } = body;
    const { error } = await db.from("matching_cultuur_pijlers").delete().eq("key", key);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
}
