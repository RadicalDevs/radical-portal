import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { matchKandidatenForVacature } from "@/lib/ai/matching";

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
    const { vacature_id, max_results } = body as {
      vacature_id: string;
      max_results?: number;
    };

    if (!vacature_id) {
      return NextResponse.json({ error: "vacature_id is verplicht" }, { status: 400 });
    }

    const results = await matchKandidatenForVacature(vacature_id, {
      maxResults: max_results,
    });

    return NextResponse.json({ success: true, matches: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    console.error("Matching fout:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
