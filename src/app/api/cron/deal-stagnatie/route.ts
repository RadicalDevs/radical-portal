import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/automation/notifyAdmins";
import { emailWrap, datumNL, ROW, BADGE, buildCtaButton } from "@/lib/email/templates";

// Vercel Cron: dagelijks om 08:00 CET
// Stuurt notificatie voor deals die langer dan 14 dagen stilstaan

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return authHeader === `Bearer ${secret}`;
}

const STAGNATIE_DAGEN = 14;

const PIPELINE_KLEUREN: Record<string, string> = {
  permanent: "#3498db",
  interim: "#9b59b6",
  project: "#f39c12",
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const grens = new Date(Date.now() - STAGNATIE_DAGEN * 24 * 60 * 60 * 1000).toISOString();

  // Haal actieve deals op die langer dan 14 dagen niet zijn bijgewerkt
  const { data: stagnanteDeals, error } = await db
    .from("deals")
    .select("id, pipeline_type, stage, potentiele_omzet, klant_id, updated_at")
    .eq("is_lost", false)
    .lt("updated_at", grens)
    .order("updated_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[deal-stagnatie] DB fout:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!stagnanteDeals || stagnanteDeals.length === 0) {
    return NextResponse.json({ synced: 0, message: "Geen stagnerende deals gevonden" });
  }

  // Enrich met klantnamen
  const klantIds = [...new Set(stagnanteDeals.map((d) => d.klant_id).filter(Boolean))] as string[];
  const { data: klanten } = klantIds.length
    ? await db.from("klanten").select("id, bedrijfsnaam").in("id", klantIds)
    : { data: [] };
  const klantMap = Object.fromEntries((klanten ?? []).map((k) => [k.id, k.bedrijfsnaam]));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";

  const dealRows = stagnanteDeals
    .map((d) => {
      const dagenStil = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      const klantNaam = klantMap[d.klant_id] ?? "—";
      return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${klantNaam}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-transform:capitalize;">${d.pipeline_type}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-transform:capitalize;">${(d.stage as string).replace(/_/g, " ")}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#e74c3c;font-weight:600;">${dagenStil}d stil</td>
        ${d.potentiele_omzet ? `<td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;">€${Number(d.potentiele_omzet).toLocaleString("nl-NL")}</td>` : `<td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">—</td>`}
      </tr>`;
    })
    .join("");

  const html = emailWrap(
    `${stagnanteDeals.length} deal${stagnanteDeals.length > 1 ? "s" : ""} stagneren`,
    datumNL(),
    `<p style="color:#555;margin-bottom:16px">
      De volgende deals staan al meer dan ${STAGNATIE_DAGEN} dagen stil. Actie nodig!
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500;">Klant</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500;">Type</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500;">Stage</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500;">Inactief</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#888;font-weight:500;">Waarde</th>
        </tr>
      </thead>
      <tbody>${dealRows}</tbody>
    </table>
    ${buildCtaButton(`${siteUrl}/admin/pipeline/permanent`, "Bekijk pipeline")}`
  );

  const eersteType = stagnanteDeals[0]?.pipeline_type || "permanent";
  await notifyAdmins({
    key: "deal_stagnatie",
    subject: `${stagnanteDeals.length} deal${stagnanteDeals.length > 1 ? "s" : ""} stagneren (>${STAGNATIE_DAGEN} dagen)`,
    html,
    bericht: `${stagnanteDeals.length} deal${stagnanteDeals.length > 1 ? "s staan" : " staat"} al meer dan ${STAGNATIE_DAGEN} dagen stil`,
    link: `/admin/pipeline/${eersteType}`,
  });

  return NextResponse.json({ synced: stagnanteDeals.length });
}
