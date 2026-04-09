import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateKandidaatRapport } from "@/lib/ai/report-generator";

export async function POST(request: NextRequest) {
  // Auth check — alleen ingelogde admins
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Admin rolcheck
  const { data: portalUser } = await supabase
    .from("portal_users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!portalUser || (portalUser as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { kandidaat_id } = body as { kandidaat_id: string };

    if (!kandidaat_id) {
      return NextResponse.json(
        { error: "kandidaat_id is verplicht" },
        { status: 400 }
      );
    }

    const rapport = await generateKandidaatRapport(kandidaat_id);

    return NextResponse.json({ success: true, rapport });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    console.error("Rapport generatie fout:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
