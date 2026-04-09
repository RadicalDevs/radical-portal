import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { getNotifiableUsers, type NotificatieKey } from "@/lib/automation/emailVoorkeuren";
import {
  BADGE, ROW, STATUS_KLEUR, emailWrap, datumNL,
  buildCtaButton, buildRedenAfwijzingHtml, buildApacScoreTable,
  buildBronBadge,
} from "@/lib/email/templates";
import { buildVetoEmailHtml } from "@/lib/apac/scoring";
import type { VetoDetail } from "@/lib/apac/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";

async function sendNotificatie(
  key: NotificatieKey,
  subject: string,
  html: string,
  bericht: string,
  link?: string
) {
  const supabase = createServiceClient();
  const recipients = await getNotifiableUsers(key);

  await Promise.all(
    recipients.map(async (r) => {
      await sendEmail({ to: r.email, subject, html }).catch((err) => console.error("[notificatie] Email failed:", err));
      await supabase.from("notificaties").insert({
        user_id: r.id,
        type: "info",
        titel: subject,
        bericht,
        link,
      }).then(undefined, (err) => console.error("[notificatie] DB insert failed:", err));
    })
  );

  return recipients.map((r) => r.email);
}

export async function POST(req: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { type } = body as { type: string };
  const supabase = createServiceClient();

  try {

  switch (type) {
    // ---- KANDIDAAT STATUS ----
    case "kandidaat_status": {
      const { kandidaat_id, pool_status, reden_afwijzing } = body;
      const { data: k, error: kError } = await supabase
        .from("kandidaten")
        .select("voornaam, achternaam, pool_status, vaardigheden, email, telefoon, apac_source, beschikbaarheid")
        .eq("id", kandidaat_id)
        .single();
      if (kError) return NextResponse.json({ error: kError.message }, { status: 500 });
      if (!k) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
      const rec = k as Record<string, unknown>;
      const oudeStatus = (rec.pool_status as string) || "prospect";
      const naam = `${rec.voornaam} ${rec.achternaam}`;
      const skills = ((rec.vaardigheden as string[]) || []).slice(0, 5).join(", ") || "—";
      const email = (rec.email as string) || "";
      const telefoon = (rec.telefoon as string) || "";
      const bron = rec.apac_source as string | null;
      const beschikbaar = rec.beschikbaarheid as string | null;

      // Update status + reden_afwijzing
      const updateData: Record<string, unknown> = { pool_status };
      if (pool_status === "afgewezen" && reden_afwijzing) {
        updateData.reden_afwijzing = reden_afwijzing;
      } else if (pool_status !== "afgewezen") {
        updateData.reden_afwijzing = null;
      }
      const { error: updateError } = await supabase.from("kandidaten").update(updateData).eq("id", kandidaat_id);
      if (updateError) console.error("[notificatie] kandidaat update failed:", updateError.message);

      // Haal APAC data op bij afwijzing of radical
      let apacHtml = "";
      let vetoHtml = "";
      if (pool_status === "afgewezen" || pool_status === "radical") {
        const { data: apac } = await supabase
          .from("apac_resultaten")
          .select("adaptability, personality, awareness, connection, veto_getriggerd, veto_details")
          .eq("kandidaat_id", kandidaat_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (apac) {
          const a = apac as Record<string, unknown>;
          apacHtml = buildApacScoreTable(
            { adaptability: a.adaptability as number, personality: a.personality as number, awareness: a.awareness as number, connection: a.connection as number }
          );
          if (a.veto_getriggerd && a.veto_details) {
            vetoHtml = buildVetoEmailHtml(a.veto_details as VetoDetail[]);
          }
        }
      }

      let notifKey: NotificatieKey = "kandidaat_status_wijziging";
      if (pool_status === "radical") notifKey = "kandidaat_radical";
      else if (pool_status === "afgewezen") notifKey = "kandidaat_afgewezen";

      const subject = pool_status === "radical" ? `Nieuwe Radical: ${naam}`
        : pool_status === "afgewezen" ? `Kandidaat afgewezen: ${naam}`
        : `Statuswijziging: ${naam} → ${pool_status}`;

      const sent = await sendNotificatie(notifKey, subject,
        emailWrap(subject, datumNL(),
          `<table style="width:100%;border-collapse:collapse">
            ${ROW("Naam", naam)}
            ${email ? ROW("E-mail", `<a href="mailto:${email}" style="color:#3498db">${email}</a>`, true) : ""}
            ${telefoon ? ROW("Telefoon", telefoon) : ""}
            ${ROW("Vorige status", BADGE(oudeStatus.toUpperCase(), STATUS_KLEUR[oudeStatus] || "#888"), true)}
            ${ROW("Nieuwe status", BADGE(pool_status.toUpperCase(), STATUS_KLEUR[pool_status] || "#888"))}
            ${ROW("Vaardigheden", skills, true)}
            ${bron ? ROW("Bron", buildBronBadge(bron)) : ""}
            ${beschikbaar ? ROW("Beschikbaarheid", beschikbaar, true) : ""}
          </table>
          ${pool_status === "afgewezen" ? buildRedenAfwijzingHtml(reden_afwijzing) : ""}
          ${vetoHtml}
          ${apacHtml}
          ${buildCtaButton(`${SITE_URL}/kandidaten/${kandidaat_id}`, "Bekijk kandidaat")}`),
        `${naam}: ${oudeStatus} → ${pool_status}. Vaardigheden: ${skills}`,
        `/kandidaten/${kandidaat_id}`
      );
      return NextResponse.json({ success: true, sent });
    }

    // ---- NIEUWE KANDIDAAT ----
    case "nieuwe_kandidaat": {
      const { naam, vaardigheden, kandidaat_id } = body;
      const skillsTxt = (vaardigheden || []).slice(0, 5).join(", ") || "—";

      // Optioneel extra data ophalen
      let email = "";
      let telefoon = "";
      let bron = "";
      if (kandidaat_id) {
        const { data: k } = await supabase
          .from("kandidaten")
          .select("email, telefoon, apac_source")
          .eq("id", kandidaat_id)
          .single();
        if (k) {
          const rec = k as Record<string, unknown>;
          email = (rec.email as string) || "";
          telefoon = (rec.telefoon as string) || "";
          bron = (rec.apac_source as string) || "";
        }
      }

      const sent = await sendNotificatie("nieuwe_kandidaat",
        `Nieuwe kandidaat: ${naam}`,
        emailWrap("Nieuwe kandidaat aangemeld", datumNL(),
          `<table style="width:100%;border-collapse:collapse">
            ${ROW("Naam", naam)}
            ${email ? ROW("E-mail", `<a href="mailto:${email}" style="color:#3498db">${email}</a>`, true) : ""}
            ${telefoon ? ROW("Telefoon", telefoon) : ""}
            ${ROW("Vaardigheden", skillsTxt, true)}
            ${bron ? ROW("Bron", buildBronBadge(bron)) : ""}
            ${ROW("Status", BADGE("PROSPECT", "#3498db"), true)}
          </table>
          ${kandidaat_id ? buildCtaButton(`${SITE_URL}/kandidaten/${kandidaat_id}`, "Bekijk kandidaat") : ""}`),
        `${naam} aangemeld${bron ? ` via ${bron}` : ""}. Vaardigheden: ${skillsTxt}`,
        kandidaat_id ? `/kandidaten/${kandidaat_id}` : "/kandidaten"
      );
      return NextResponse.json({ success: true, sent });
    }

    // ---- NIEUWE KLANT ----
    case "nieuwe_klant": {
      const { bedrijfsnaam, sector, klant_id } = body;

      // Optioneel contactpersoon ophalen
      let contactNaam = "";
      let contactFunctie = "";
      let contactEmail = "";
      if (klant_id) {
        const { data: cp } = await supabase
          .from("contactpersonen")
          .select("naam, functie, email")
          .eq("klant_id", klant_id)
          .eq("is_primair", true)
          .limit(1)
          .single();
        if (cp) {
          const rec = cp as Record<string, unknown>;
          contactNaam = (rec.naam as string) || "";
          contactFunctie = (rec.functie as string) || "";
          contactEmail = (rec.email as string) || "";
        }
      }

      const sent = await sendNotificatie("nieuwe_klant",
        `Nieuwe klant: ${bedrijfsnaam}`,
        emailWrap("Nieuwe klant toegevoegd", datumNL(),
          `<table style="width:100%;border-collapse:collapse">
            ${ROW("Bedrijf", bedrijfsnaam)}
            ${ROW("Sector", sector || "—", true)}
            ${contactNaam ? ROW("Contactpersoon", `${contactNaam}${contactFunctie ? ` (${contactFunctie})` : ""}`) : ""}
            ${contactEmail ? ROW("Contact e-mail", `<a href="mailto:${contactEmail}" style="color:#3498db">${contactEmail}</a>`, true) : ""}
          </table>
          ${klant_id ? buildCtaButton(`${SITE_URL}/admin/klanten`, "Bekijk klant") : ""}`),
        `${bedrijfsnaam} toegevoegd${sector ? ` (${sector})` : ""}${contactNaam ? `. Contact: ${contactNaam}` : ""}`,
        "/admin/klanten"
      );
      return NextResponse.json({ success: true, sent });
    }

    // ---- NIEUWE VACATURE ----
    case "nieuwe_vacature": {
      const { functietitel, klant_naam, salaris_min, salaris_max, vacature_id } = body;
      const salaris = salaris_min && salaris_max
        ? `€${Number(salaris_min).toLocaleString("nl-NL")} – €${Number(salaris_max).toLocaleString("nl-NL")}`
        : "—";

      // Optioneel extra data ophalen
      let sector = "";
      let beschrijving = "";
      if (vacature_id) {
        const { data: v } = await supabase
          .from("vacatures")
          .select("sector, beschrijving")
          .eq("id", vacature_id)
          .single();
        if (v) {
          const rec = v as Record<string, unknown>;
          sector = (rec.sector as string) || "";
          const desc = (rec.beschrijving as string) || "";
          beschrijving = desc.length > 150 ? desc.substring(0, 150) + "…" : desc;
        }
      }

      const sent = await sendNotificatie("nieuwe_vacature",
        `Nieuwe vacature: ${functietitel}${klant_naam ? ` — ${klant_naam}` : ""}`,
        emailWrap("Nieuwe vacature aangemaakt", datumNL(),
          `<table style="width:100%;border-collapse:collapse">
            ${ROW("Functie", functietitel)}
            ${ROW("Klant", klant_naam || "—", true)}
            ${sector ? ROW("Sector", BADGE(sector.toUpperCase(), "#3498db")) : ""}
            ${ROW("Salaris", salaris, true)}
            ${ROW("Status", BADGE("OPEN", "#2ed573"))}
          </table>
          ${beschrijving ? `<p style="color:#555;font-size:13px;margin:12px 0;line-height:1.5">${beschrijving}</p>` : ""}
          ${vacature_id ? buildCtaButton(`${SITE_URL}/admin/vacatures`, "Bekijk vacature") : ""}`),
        `${functietitel}${klant_naam ? ` voor ${klant_naam}` : ""}. Salaris: ${salaris}`,
        "/admin/vacatures"
      );
      return NextResponse.json({ success: true, sent });
    }

    // ---- VACATURE GESLOTEN ----
    case "vacature_gesloten": {
      const { functietitel: titel, klant_naam: klant, vacature_id } = body;

      // Optioneel: tel geplaatste kandidaten
      let geplaatst = 0;
      if (vacature_id) {
        const { count, error: countError } = await supabase
          .from("kandidaat_plaatsingen")
          .select("id", { count: "exact", head: true })
          .eq("vacature_id", vacature_id)
          .eq("status", "geplaatst");
        if (countError) console.error("[notificatie] plaatsingen count failed:", countError.message);
        geplaatst = count || 0;
      }

      const sent = await sendNotificatie("vacature_gesloten",
        `Vacature gesloten: ${titel}`,
        emailWrap("Vacature gesloten", datumNL(),
          `<table style="width:100%;border-collapse:collapse">
            ${ROW("Functie", titel)}
            ${ROW("Klant", klant || "—", true)}
            ${geplaatst > 0 ? ROW("Geplaatst", `${geplaatst} kandidaat${geplaatst > 1 ? "en" : ""}`) : ""}
            ${ROW("Status", BADGE("GESLOTEN", "#95a5a6"), true)}
          </table>
          ${vacature_id ? buildCtaButton(`${SITE_URL}/admin/vacatures`, "Bekijk vacature") : ""}`),
        `${titel}${klant ? ` (${klant})` : ""} is gesloten${geplaatst > 0 ? `. ${geplaatst} kandidaat${geplaatst > 1 ? "en" : ""} geplaatst` : ""}`,
        "/admin/vacatures"
      );
      return NextResponse.json({ success: true, sent });
    }

    // ---- DEAL STAGE WIJZIGING ----
    case "deal_stage": {
      const { oude_stage, nieuwe_stage, klant_naam: dealKlant, waarde, deal_id } = body;

      // Optioneel: deal details ophalen
      let pipelineType = "";
      let feePercentage = "";
      let sluitingsdatum = "";
      if (deal_id) {
        const { data: d } = await supabase
          .from("deals")
          .select("pipeline_type, fee_percentage, sluitingsdatum")
          .eq("id", deal_id)
          .single();
        if (d) {
          const rec = d as Record<string, unknown>;
          pipelineType = (rec.pipeline_type as string) || "";
          const fee = rec.fee_percentage as number | null;
          feePercentage = fee ? `${fee}%` : "";
          const sd = rec.sluitingsdatum as string | null;
          sluitingsdatum = sd ? new Date(sd).toLocaleDateString("nl-NL") : "";
        }
      }

      const pipelineColors: Record<string, string> = { permanent: "#3498db", interim: "#9b59b6", project: "#f39c12" };

      const sent = await sendNotificatie("deal_stage_wijziging",
        `Deal verplaatst: ${dealKlant || "Onbekend"} → ${nieuwe_stage}`,
        emailWrap("Deal stage gewijzigd", datumNL(),
          `<table style="width:100%;border-collapse:collapse">
            ${ROW("Klant", dealKlant || "—")}
            ${pipelineType ? ROW("Pipeline", BADGE(pipelineType.toUpperCase(), pipelineColors[pipelineType] || "#888"), true) : ""}
            ${ROW("Vorige stage", BADGE(oude_stage.toUpperCase(), "#f39c12"), !pipelineType)}
            ${ROW("Nieuwe stage", BADGE(nieuwe_stage.toUpperCase(), "#3498db"), true)}
            ${waarde ? ROW("Waarde", `€${Number(waarde).toLocaleString("nl-NL")}`) : ""}
            ${feePercentage ? ROW("Fee", feePercentage, true) : ""}
            ${sluitingsdatum ? ROW("Verwachte sluiting", sluitingsdatum) : ""}
          </table>
          ${buildCtaButton(`${SITE_URL}/admin/pipeline/${pipelineType || "permanent"}`, "Bekijk pipeline")}`),
        `${dealKlant || "Deal"}: ${oude_stage} → ${nieuwe_stage}${waarde ? ` (€${Number(waarde).toLocaleString("nl-NL")})` : ""}`,
        `/admin/pipeline/${pipelineType || "permanent"}`
      );
      return NextResponse.json({ success: true, sent });
    }

    // ---- NIEUWE PLAATSING ----
    case "nieuwe_plaatsing": {
      const { kandidaat_naam, vacature_titel, klant_naam: plaatsKlant, plaatsing_id } = body;

      // Optioneel: plaatsing details ophalen
      let tarief = "";
      let startdatum = "";
      if (plaatsing_id) {
        const { data: p } = await supabase
          .from("kandidaat_plaatsingen")
          .select("tarief, startdatum")
          .eq("id", plaatsing_id)
          .single();
        if (p) {
          const rec = p as Record<string, unknown>;
          const t = rec.tarief as number | null;
          tarief = t ? `€${t.toLocaleString("nl-NL")}` : "";
          const sd = rec.startdatum as string | null;
          startdatum = sd ? new Date(sd).toLocaleDateString("nl-NL") : "";
        }
      }

      const sent = await sendNotificatie("nieuwe_plaatsing",
        `Nieuwe plaatsing: ${kandidaat_naam} bij ${plaatsKlant || "—"}`,
        emailWrap("Kandidaat succesvol geplaatst", datumNL(),
          `<table style="width:100%;border-collapse:collapse">
            ${ROW("Kandidaat", kandidaat_naam)}
            ${ROW("Vacature", vacature_titel || "—", true)}
            ${ROW("Klant", plaatsKlant || "—")}
            ${tarief ? ROW("Tarief", tarief, true) : ""}
            ${startdatum ? ROW("Startdatum", startdatum) : ""}
            ${ROW("Status", BADGE("GEPLAATST", "#2ed573"), true)}
          </table>
          ${buildCtaButton(`${SITE_URL}/admin/vacatures`, "Bekijk details")}`),
        `${kandidaat_naam} geplaatst${vacature_titel ? ` als ${vacature_titel}` : ""}${plaatsKlant ? ` bij ${plaatsKlant}` : ""}`,
        "/admin/vacatures"
      );
      return NextResponse.json({ success: true, sent });
    }

    // ---- FACTUUR BETAALD ----
    case "factuur_betaald": {
      const { factuur_nummer, klant_naam: fKlant, bedrag, factuur_id } = body;

      // Optioneel: factuur details ophalen
      let factuurdatum = "";
      let betaaldatum = "";
      let btwBedrag = "";
      let totaalBedrag = "";
      if (factuur_id) {
        const { data: f } = await supabase
          .from("facturen")
          .select("factuurdatum, betaaldatum, btw_bedrag, totaal_bedrag")
          .eq("id", factuur_id)
          .single();
        if (f) {
          const rec = f as Record<string, unknown>;
          const fd = rec.factuurdatum as string | null;
          factuurdatum = fd ? new Date(fd).toLocaleDateString("nl-NL") : "";
          const bd = rec.betaaldatum as string | null;
          betaaldatum = bd ? new Date(bd).toLocaleDateString("nl-NL") : "";
          const btw = rec.btw_bedrag as number | null;
          btwBedrag = btw ? `€${btw.toLocaleString("nl-NL")}` : "";
          const tot = rec.totaal_bedrag as number | null;
          totaalBedrag = tot ? `€${tot.toLocaleString("nl-NL")}` : "";
        }
      }

      const sent = await sendNotificatie("factuur_betaald",
        `Factuur betaald: ${factuur_nummer} — €${Number(bedrag).toLocaleString("nl-NL")}`,
        emailWrap("Factuur betaald", datumNL(),
          `<table style="width:100%;border-collapse:collapse">
            ${ROW("Factuur", factuur_nummer)}
            ${ROW("Klant", fKlant || "—", true)}
            ${ROW("Bedrag excl. BTW", `€${Number(bedrag).toLocaleString("nl-NL")}`)}
            ${btwBedrag ? ROW("BTW", btwBedrag, true) : ""}
            ${totaalBedrag ? ROW("Totaal incl. BTW", `<strong>${totaalBedrag}</strong>`) : ""}
            ${factuurdatum ? ROW("Factuurdatum", factuurdatum, true) : ""}
            ${betaaldatum ? ROW("Betaaldatum", betaaldatum) : ""}
            ${ROW("Status", BADGE("BETAALD", "#2ed573"), true)}
          </table>
          ${factuur_id ? buildCtaButton(`${SITE_URL}/admin/facturatie/${factuur_id}`, "Bekijk factuur") : ""}`),
        `${factuur_nummer} van ${fKlant || "—"}: €${Number(bedrag).toLocaleString("nl-NL")} betaald`,
        "/admin/facturatie"
      );
      return NextResponse.json({ success: true, sent });
    }

    default:
      return NextResponse.json({ error: `Onbekend type: ${type}` }, { status: 400 });
  }
  } catch (error) {
    console.error("[notificatie] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notificatie verzenden mislukt" },
      { status: 500 }
    );
  }
}
