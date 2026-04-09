import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiviteiten } from "@/app/admin/actions/activiteiten";

export async function GET(request: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const klant_id = searchParams.get("klant_id") ?? undefined;
  const kandidaat_id = searchParams.get("kandidaat_id") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const activiteiten = await getActiviteiten({
    klant_id,
    kandidaat_id,
    type: type as Parameters<typeof getActiviteiten>[0]["type"],
    limit,
    offset,
  });

  return NextResponse.json({ activiteiten });
}
