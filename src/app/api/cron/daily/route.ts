import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

// Vercel Cron: elke dag om 07:00 CET
// Stuurt dagelijkse samenvatting naar admins die dit hebben ingesteld

export async function GET(request: Request) {
  // Vercel cron secret verificatie
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  // Haal alle admins op met hun email voorkeur voor dagelijkse samenvatting
  const { data: admins } = await db
    .from("portal_users")
    .select("auth_user_id, first_name, email")
    .eq("role", "admin");

  if (!admins || admins.length === 0) {
    return NextResponse.json({ message: "Geen admins gevonden" });
  }

  // Check welke admins dagelijkse_samenvatting willen (default = aan)
  const { data: uitgeschakeld } = await db
    .from("email_voorkeuren")
    .select("user_id")
    .eq("voorkeur_key", "dagelijkse_samenvatting")
    .eq("enabled", false);

  const uitgeschakeldIds = new Set((uitgeschakeld || []).map((v) => v.user_id));
  const ontvangers = admins.filter(
    (a) => a.email && !uitgeschakeldIds.has(a.auth_user_id)
  );

  if (ontvangers.length === 0) {
    return NextResponse.json({ message: "Geen ontvangers voor dagelijkse samenvatting" });
  }

  // Haal dagdata op
  const [
    { count: nieuweKandidaten },
    { data: activiteiten },
    { count: nieuweApac },
    { data: statusWijzigingen },
  ] = await Promise.all([
    db
      .from("kandidaten")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay),
    db
      .from("activiteiten")
      .select("id, type, beschrijving, kandidaat_id, created_at")
      .gte("created_at", startOfDay)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("apac_resultaten")
      .select("*", { count: "exact", head: true })
      .eq("is_seed", false)
      .gte("created_at", startOfDay),
    db
      .from("activiteiten")
      .select("id, beschrijving, kandidaat_id, created_at")
      .eq("type", "status_wijziging")
      .gte("created_at", startOfDay)
      .limit(10),
  ]);

  // Enrich activiteiten met kandidaatnamen
  const kandidaatIds = [
    ...new Set([
      ...(activiteiten || []).map((a) => a.kandidaat_id),
      ...(statusWijzigingen || []).map((a) => a.kandidaat_id),
    ].filter(Boolean)),
  ];

  const { data: kandidaten } = kandidaatIds.length
    ? await db.from("kandidaten").select("id, voornaam, achternaam").in("id", kandidaatIds)
    : { data: [] };

  const nameMap = Object.fromEntries(
    (kandidaten ?? []).map((k) => [k.id, `${k.voornaam} ${k.achternaam}`.trim()])
  );

  const datumStr = today.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const heeftActiviteit: boolean =
    (nieuweKandidaten ?? 0) > 0 ||
    (nieuweApac ?? 0) > 0 ||
    (activiteiten != null && activiteiten.length > 0);

  const html = buildDailyEmail({
    datum: datumStr,
    nieuweKandidaten: nieuweKandidaten ?? 0,
    nieuweApac: nieuweApac ?? 0,
    activiteiten: (activiteiten || []).slice(0, 10).map((a) => ({
      type: a.type,
      beschrijving: a.beschrijving?.length > 120 ? a.beschrijving.slice(0, 120).trimEnd() + "…" : a.beschrijving,
      naam: a.kandidaat_id ? (nameMap[a.kandidaat_id] ?? null) : null,
      tijd: new Date(a.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" }),
    })),
    heeftActiviteit,
  });

  // Stuur naar alle ontvangers
  const emails = ontvangers.map((a) => a.email as string);
  const verstuurd = await sendEmail({
    to: emails,
    subject: `Dagelijkse samenvatting — ${datumStr}`,
    html,
  });

  return NextResponse.json({
    success: verstuurd,
    ontvangers: emails.length,
    nieuweKandidaten,
    nieuweApac,
    activiteiten: activiteiten?.length ?? 0,
  });
}

function buildDailyEmail(data: {
  datum: string;
  nieuweKandidaten: number;
  nieuweApac: number;
  activiteiten: { type: string; beschrijving: string; naam: string | null; tijd: string }[];
  heeftActiviteit: boolean;
}) {
  const actRows = data.activiteiten
    .map(
      (a) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2a1e;font-size:13px;color:#a0b4a0;">${a.tijd}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2a1e;font-size:13px;color:#e8f0e8;">
          ${a.naam ? `<span style="color:#2ed573;font-weight:600;">${a.naam}</span> — ` : ""}${a.beschrijving}
        </td>
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

    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#ffffff;">Dagelijkse samenvatting</h1>
    <p style="margin:0 0 32px;font-size:14px;color:#6b8c6b;">${data.datum}</p>

    <!-- Stats -->
    <div style="display:flex;gap:16px;margin-bottom:32px;">
      <div style="flex:1;background:#111a11;border:1px solid #1e2a1e;border-radius:12px;padding:20px;">
        <div style="font-size:28px;font-weight:700;color:#2ed573;">${data.nieuweKandidaten}</div>
        <div style="font-size:12px;color:#6b8c6b;margin-top:4px;">Nieuwe kandidaten</div>
      </div>
      <div style="flex:1;background:#111a11;border:1px solid #1e2a1e;border-radius:12px;padding:20px;">
        <div style="font-size:28px;font-weight:700;color:#2ed573;">${data.nieuweApac}</div>
        <div style="font-size:12px;color:#6b8c6b;margin-top:4px;">APAC ingevuld</div>
      </div>
      <div style="flex:1;background:#111a11;border:1px solid #1e2a1e;border-radius:12px;padding:20px;">
        <div style="font-size:28px;font-weight:700;color:#2ed573;">${data.activiteiten.length}</div>
        <div style="font-size:12px;color:#6b8c6b;margin-top:4px;">Activiteiten</div>
      </div>
    </div>

    ${
      data.heeftActiviteit && data.activiteiten.length > 0
        ? `<!-- Activiteiten -->
    <div style="background:#111a11;border:1px solid #1e2a1e;border-radius:12px;overflow:hidden;margin-bottom:32px;">
      <div style="padding:16px 20px;border-bottom:1px solid #1e2a1e;">
        <h2 style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">Activiteiten vandaag</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${actRows}
      </table>
    </div>`
        : `<div style="background:#111a11;border:1px solid #1e2a1e;border-radius:12px;padding:32px;text-align:center;margin-bottom:32px;">
      <p style="margin:0;font-size:14px;color:#6b8c6b;">Geen activiteiten vandaag</p>
    </div>`
    }

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://radicalnetwork.nl/admin" style="display:inline-block;background:#2ed573;color:#0a0f0a;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
        Open Radical Network
      </a>
    </div>

    <!-- Footer -->
    <p style="margin:0;font-size:12px;color:#3d4f3d;text-align:center;">
      © ${new Date().getFullYear()} Radical Recruitment · Je ontvangt dit omdat je dagelijkse samenvattingen hebt ingeschakeld.
    </p>
  </div>
</body>
</html>`;
}
