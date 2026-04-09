import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { notifyAdmins } from "@/lib/automation/notifyAdmins";
import { emailWrap, datumNL, buildCtaButton } from "@/lib/email/templates";

// Vercel Cron: dagelijks om 09:00 CET
// Stuurt herinnering voor openstaande (verzonden maar onbetaalde) facturen

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return authHeader === `Bearer ${secret}`;
}

function fmt(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();

  // Haal openstaande facturen op: status = 'verzonden' (verstuurd maar niet betaald)
  const { data: facturen, error } = await db
    .from("facturen")
    .select("id, factuurnummer, klant_id, totaal_bedrag, factuurdatum, vervaldatum")
    .eq("status", "verzonden")
    .order("factuurdatum", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[factuur-herinnering] DB fout:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!facturen || facturen.length === 0) {
    return NextResponse.json({ synced: 0, message: "Geen openstaande facturen" });
  }

  // Enrich met klantnamen
  const klantIds = [...new Set(facturen.map((f) => f.klant_id).filter(Boolean))] as string[];
  const { data: klanten } = klantIds.length
    ? await db.from("klanten").select("id, bedrijfsnaam").in("id", klantIds)
    : { data: [] };
  const klantMap = Object.fromEntries((klanten ?? []).map((k) => [k.id, k.bedrijfsnaam]));

  const now = Date.now();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";

  // Bereken totaal openstaand bedrag
  const totaalOpenstaand = facturen.reduce((s, f) => s + (f.totaal_bedrag ?? 0), 0);

  const factuurRows = facturen
    .map((f) => {
      const klantNaam = klantMap[f.klant_id] ?? "—";
      const factuurdatum = f.factuurdatum
        ? new Date(f.factuurdatum).toLocaleDateString("nl-NL")
        : "—";
      const vervaldatum = f.vervaldatum
        ? new Date(f.vervaldatum).toLocaleDateString("nl-NL")
        : "—";
      const isVerlopen = f.vervaldatum && new Date(f.vervaldatum).getTime() < now;
      const dagenOverschreven = f.vervaldatum
        ? Math.floor((now - new Date(f.vervaldatum).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${f.factuurnummer || "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${klantNaam}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${factuurdatum}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;${isVerlopen ? "color:#e74c3c;font-weight:600;" : ""}">${vervaldatum}${dagenOverschreven !== null && dagenOverschreven > 0 ? ` <span style="color:#e74c3c">(+${dagenOverschreven}d)</span>` : ""}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;text-align:right;font-weight:600;">${f.totaal_bedrag ? fmt(f.totaal_bedrag) : "—"}</td>
      </tr>`;
    })
    .join("");

  const verlopen = facturen.filter((f) => f.vervaldatum && new Date(f.vervaldatum).getTime() < now).length;

  const html = emailWrap(
    `${facturen.length} openstaande factuur${facturen.length > 1 ? "en" : ""}`,
    datumNL(),
    `<p style="color:#555;margin-bottom:8px">
      Er ${facturen.length === 1 ? "staat" : "staan"} <strong>${facturen.length}</strong> factuur${facturen.length > 1 ? "en" : ""} open
      met een totaalbedrag van <strong>${fmt(totaalOpenstaand)}</strong>.
      ${verlopen > 0 ? `<br><span style="color:#e74c3c"><strong>${verlopen} factuur${verlopen > 1 ? "en zijn" : " is"} al verlopen.</strong></span>` : ""}
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead>
        <tr style="background:#f8f9fa">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500;">Factuur</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500;">Klant</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500;">Datum</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:500;">Vervaldatum</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#888;font-weight:500;">Bedrag</th>
        </tr>
      </thead>
      <tbody>${factuurRows}</tbody>
      <tfoot>
        <tr style="background:#f8f9fa">
          <td colspan="4" style="padding:10px 12px;font-size:13px;font-weight:700;">Totaal openstaand</td>
          <td style="padding:10px 12px;font-size:13px;font-weight:700;text-align:right;">${fmt(totaalOpenstaand)}</td>
        </tr>
      </tfoot>
    </table>
    ${buildCtaButton(`${siteUrl}/admin/facturatie`, "Beheer facturen")}`
  );

  await notifyAdmins({
    key: "factuur_herinnering",
    subject: `${facturen.length} openstaande factuur${facturen.length > 1 ? "en" : ""} — ${fmt(totaalOpenstaand)}`,
    html,
    bericht: `${facturen.length} factuur${facturen.length > 1 ? "en" : ""} openstaand (${fmt(totaalOpenstaand)})${verlopen > 0 ? ` — ${verlopen} verlopen` : ""}`,
    link: "/admin/facturatie",
  });

  return NextResponse.json({ synced: facturen.length, totaalOpenstaand, verlopen });
}
