import { NextRequest, NextResponse } from "next/server";
import { upsertEmbedding, buildKandidaatText } from "@/lib/ai/embeddings";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

type AIAction =
  | "embed_kandidaat"
  | "embed_all_kandidaten";

export async function POST(request: NextRequest) {
  // Auth check — alleen ingelogde admins
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
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
    const { action, data } = body as {
      action: AIAction;
      data: Record<string, unknown>;
    };

    switch (action) {
      // ── Embed single kandidaat ──
      case "embed_kandidaat": {
        const { data: kandidaat, error: kErr } = await supabase
          .from("kandidaten")
          .select("*")
          .eq("id", data.kandidaat_id)
          .single();

        if (kErr) return NextResponse.json({ error: kErr.message }, { status: 500 });
        if (!kandidaat) {
          return NextResponse.json({ error: "Kandidaat niet gevonden" }, { status: 404 });
        }

        const k = kandidaat as Record<string, unknown>;

        const { data: apacData, error: apacErr } = await supabase
          .from("apac_resultaten")
          .select("adaptability, personality, awareness, connection")
          .eq("kandidaat_id", data.kandidaat_id as string)
          .maybeSingle();
        if (apacErr) console.error("[ai] apac_resultaten fetch error:", apacErr.message);

        const text = buildKandidaatText({
          voornaam: k.voornaam as string,
          achternaam: k.achternaam as string,
          vaardigheden: k.vaardigheden as string[],
          tags: k.tags as string[],
          beschikbaarheid: k.beschikbaarheid as boolean | string | null,
          opzegtermijn: k.opzegtermijn as string,
          salarisindicatie: k.salarisindicatie as number,
          uurtarief: k.uurtarief as number,
          notities: k.notities as string,
          apac: apacData ?? undefined,
        });

        const result = await upsertEmbedding({
          entityType: "kandidaat",
          entityId: data.kandidaat_id as string,
          content: text,
          metadata: {
            vaardigheden: k.vaardigheden,
            naam: `${k.voornaam} ${k.achternaam}`,
          },
        });

        return NextResponse.json(result);
      }

      // ── Batch embed alle kandidaten ──
      case "embed_all_kandidaten": {
        const [kandidatenRes, apacRes] = await Promise.all([
          supabase.from("kandidaten").select("*"),
          supabase.from("apac_resultaten").select("kandidaat_id, adaptability, personality, awareness, connection"),
        ]);

        if (kandidatenRes.error) return NextResponse.json({ error: kandidatenRes.error.message }, { status: 500 });
        if (apacRes.error) return NextResponse.json({ error: apacRes.error.message }, { status: 500 });

        const kandidaten = kandidatenRes.data;
        const allApac = apacRes.data;

        const apacMap = new Map<string, { adaptability: number; personality: number; awareness: number; connection: number }>();
        for (const a of (allApac || []) as { kandidaat_id: string; adaptability: number; personality: number; awareness: number; connection: number }[]) {
          apacMap.set(a.kandidaat_id, a);
        }

        const results = [];
        for (const k of (kandidaten || []) as Record<string, unknown>[]) {
          try {
            const text = buildKandidaatText({
              voornaam: k.voornaam as string,
              achternaam: k.achternaam as string,
              vaardigheden: k.vaardigheden as string[],
              tags: k.tags as string[],
              beschikbaarheid: k.beschikbaarheid as boolean | string | null,
              opzegtermijn: k.opzegtermijn as string,
              salarisindicatie: k.salarisindicatie as number,
              uurtarief: k.uurtarief as number,
              notities: k.notities as string,
              apac: apacMap.get(k.id as string),
            });

            const result = await upsertEmbedding({
              entityType: "kandidaat",
              entityId: k.id as string,
              content: text,
              metadata: {
                naam: `${k.voornaam} ${k.achternaam}`,
                vaardigheden: k.vaardigheden,
              },
            });

            results.push({ id: k.id, ...result });
          } catch (error) {
            results.push({ id: k.id, error: (error as Error).message });
          }
        }

        return NextResponse.json({ processed: results.length, results });
      }

      default:
        return NextResponse.json({ error: `Onbekende actie: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error("[AI Endpoint Error]", error);
    return NextResponse.json(
      { error: `Internal error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
