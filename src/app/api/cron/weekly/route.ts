import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

// Vercel Cron: elke maandag om 07:00 CET
// Stuurt wekelijks CRM overzicht naar admins die dit hebben ingesteld

export async function GET(request: Request) {
  // Vercel cron secret verificatie
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Haal alle admins op
  const { data: admins } = await db
    .from("portal_users")
    .select("auth_user_id, first_name, email")
    .eq("role", "admin");

  if (!admins || admins.length === 0) {
    return NextResponse.json({ message: "Geen admins gevonden" });
  }

  // Check welke admins wekelijks_overzicht willen (default = aan)
  const { data: uitgeschakeld } = await db
    .from("email_voorkeuren")
    .select("user_id")
    .eq("voorkeur_key", "wekelijks_overzicht")
    .eq("enabled", false);

  const uitgeschakeldIds = new Set((uitgeschakeld || []).map((v) => v.user_id));
  const ontvangers = admins.filter(
    (a) => a.email && !uitgeschakeldIds.has(a.auth_user_id)
  );

  if (ontvangers.length === 0) {
    return NextResponse.json({ message: "Geen ontvangers voor wekelijks overzicht" });
  }

  // Haal alle KPI data op
  const [
    { count: totalKandidaten },
    { count: apacDezeWeek },
    { count: openVacatures },
    { count: openTaken },
    { data: facturenMaand },
    { data: activeDeals },
    { data: recenteDealsRaw },
    { data: nieuweKandidatenWeek },
  ] = await Promise.all([
    db.from("kandidaten").select("*", { count: "exact", head: true }),
    db
      .from("apac_resultaten")
      .select("*", { count: "exact", head: true })
      .eq("is_seed", false)
      .gte("created_at", weekAgo),
    db
      .from("vacatures")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    db
      .from("taken")
      .select("*", { count: "exact", head: true })
      .neq("status", "afgerond"),
    db
      .from("facturen")
      .select("totaal_bedrag")
      .eq("status", "betaald")
      .gte("betaaldatum", startOfMonth),
    db
      .from("deals")
      .select("potentiele_omzet")
      .eq("is_lost", false),
    db
      .from("deals")
      .select("id, pipeline_type, stage, potentiele_omzet, klant_id, created_at")
      .eq("is_lost", false)
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("kandidaten")
      .select("id, voornaam, achternaam, pool_status, created_at")
      .gte("created_at", weekAgo)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const omzetMaand = (facturenMaand ?? []).reduce((s, f) => s + (f.totaal_bedrag ?? 0), 0);
  const pipelineWaarde = (activeDeals ?? []).reduce((s, d) => s + (d.potentiele_omzet ?? 0), 0);

  // Enrich deals met klant namen
  const recenteDeals: { klantNaam: string; stage: string; pipelineType: string; omzet: number | null }[] = [];
  if (recenteDealsRaw && recenteDealsRaw.length > 0) {
    const klantIds = [...new Set(recenteDealsRaw.map((d) => d.klant_id).filter(Boolean))];
    const { data: klanten } = klantIds.length
      ? await db.from("klanten").select("id, bedrijfsnaam").in("id", klantIds)
      : { data: [] };
    const klantMap = Object.fromEntries((klanten ?? []).map((k) => [k.id, k.bedrijfsnaam]));
    for (const d of recenteDealsRaw) {
      recenteDeals.push({
        klantNaam: klantMap[d.klant_id] ?? "—",
        stage: d.stage,
        pipelineType: d.pipeline_type,
        omzet: d.potentiele_omzet ?? null,
      });
    }
  }

  const periodeStr = `${new Date(weekAgo).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} – ${now.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`;

  const html = buildWeeklyEmail({
    periode: periodeStr,
    totalKandidaten: totalKandidaten ?? 0,
    apacDezeWeek: apacDezeWeek ?? 0,
    openVacatures: openVacatures ?? 0,
    openTaken: openTaken ?? 0,
    omzetMaand,
    pipelineWaarde,
    recenteDeals,
    nieuweKandidaten: (nieuweKandidatenWeek ?? []).map((k) => ({
      naam: `${k.voornaam} ${k.achternaam}`.trim(),
      status: k.pool_status,
    })),
  });

  const emails = ontvangers.map((a) => a.email as string);
  const verstuurd = await sendEmail({
    to: emails,
    subject: `Wekelijks overzicht — ${periodeStr}`,
    html,
  });

  return NextResponse.json({
    success: verstuurd,
    ontvangers: emails.length,
    totalKandidaten,
    apacDezeWeek,
    omzetMaand,
    pipelineWaarde,
  });
}

function fmt(bedrag: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(bedrag);
}

function buildWeeklyEmail(data: {
  periode: string;
  totalKandidaten: number;
  apacDezeWeek: number;
  openVacatures: number;
  openTaken: number;
  omzetMaand: number;
  pipelineWaarde: number;
  recenteDeals: { klantNaam: string; stage: string; pipelineType: string; omzet: number | null }[];
  nieuweKandidaten: { naam: string; status: string }[];
}) {
  const dealRows = data.recenteDeals
    .map(
      (d) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2a1e;font-size:13px;color:#e8f0e8;">${d.klantNaam}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2a1e;font-size:13px;color:#a0b4a0;text-transform:capitalize;">${d.pipelineType}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2a1e;font-size:13px;color:#a0b4a0;text-transform:capitalize;">${d.stage.replace(/_/g, " ")}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2a1e;font-size:13px;color:#2ed573;text-align:right;">${d.omzet ? fmt(d.omzet) : "—"}</td>
      </tr>`
    )
    .join("");

  const kandidaatRows = data.nieuweKandidaten
    .map(
      (k) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2a1e;font-size:13px;color:#e8f0e8;">${k.naam}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2a1e;font-size:13px;color:#2ed573;text-transform:capitalize;">${k.status.replace(/_/g, " ")}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="margin-bottom:32px;">
      <span style="font-size:18px;font-weight:700;letter-spacing:-0.5px;">
        <span style="color:#ffffff;">Radical</span><span style="color:#2ed573;">Portal</span>
      </span>
    </div>

    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#ffffff;">Wekelijks overzicht</h1>
    <p style="margin:0 0 32px;font-size:14px;color:#6b8c6b;">${data.periode}</p>

    <!-- KPI grid -->
    <div style="margin-bottom:32px;">
      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <div style="flex:1;background:#111a11;border:1px solid #1e2a1e;border-radius:12px;padding:20px;">
          <div style="font-size:28px;font-weight:700;color:#2ed573;">${data.totalKandidaten}</div>
          <div style="font-size:12px;color:#6b8c6b;margin-top:4px;">Totaal kandidaten</div>
        </div>
        <div style="flex:1;background:#111a11;border:1px solid #1e2a1e;border-radius:12px;padding:20px;">
          <div style="font-size:28px;font-weight:700;color:#2ed573;">${data.apacDezeWeek}</div>
          <div style="font-size:12px;color:#6b8c6b;margin-top:4px;">APAC deze week</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <div style="flex:1;background:#111a11;border:1px solid #1e2a1e;border-radius:12px;padding:20px;">
          <div style="font-size:28px;font-weight:700;color:#2ed573;">${data.openVacatures}</div>
          <div style="font-size:12px;color:#6b8c6b;margin-top:4px;">Open vacatures</div>
        </div>
        <div style="flex:1;background:#111a11;border:1px solid #1e2a1e;border-radius:12px;padding:20px;">
          <div style="font-size:28px;font-weight:700;color:#ff6b4a;">${data.openTaken}</div>
          <div style="font-size:12px;color:#6b8c6b;margin-top:4px;">Open taken</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;">
        <div style="flex:1;background:#111a11;border:1px solid #1e2a1e;border-radius:12px;padding:20px;">
          <div style="font-size:22px;font-weight:700;color:#2ed573;">${fmt(data.omzetMaand)}</div>
          <div style="font-size:12px;color:#6b8c6b;margin-top:4px;">Omzet deze maand</div>
        </div>
        <div style="flex:1;background:#111a11;border:1px solid #1e2a1e;border-radius:12px;padding:20px;">
          <div style="font-size:22px;font-weight:700;color:#2ed573;">${fmt(data.pipelineWaarde)}</div>
          <div style="font-size:12px;color:#6b8c6b;margin-top:4px;">Pipeline waarde</div>
        </div>
      </div>
    </div>

    ${
      data.recenteDeals.length > 0
        ? `<!-- Deals -->
    <div style="background:#111a11;border:1px solid #1e2a1e;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <div style="padding:16px 20px;border-bottom:1px solid #1e2a1e;">
        <h2 style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Actieve deals</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#0d150d;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b8c6b;font-weight:500;">Klant</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b8c6b;font-weight:500;">Type</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b8c6b;font-weight:500;">Stage</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b8c6b;font-weight:500;">Omzet</th>
          </tr>
        </thead>
        <tbody>${dealRows}</tbody>
      </table>
    </div>`
        : ""
    }

    ${
      data.nieuweKandidaten.length > 0
        ? `<!-- Nieuwe kandidaten -->
    <div style="background:#111a11;border:1px solid #1e2a1e;border-radius:12px;overflow:hidden;margin-bottom:24px;">
      <div style="padding:16px 20px;border-bottom:1px solid #1e2a1e;">
        <h2 style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Nieuwe kandidaten deze week</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${kandidaatRows}</tbody>
      </table>
    </div>`
        : ""
    }

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://radicalnetwork.nl/admin" style="display:inline-block;background:#2ed573;color:#0a0f0a;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
        Open Radical Network
      </a>
    </div>

    <!-- Footer -->
    <p style="margin:0;font-size:12px;color:#3d4f3d;text-align:center;">
      © ${new Date().getFullYear()} Radical Recruitment · Je ontvangt dit elke maandag omdat je het wekelijks overzicht hebt ingeschakeld.
    </p>
  </div>
</body>
</html>`;
}
