/**
 * processApacScores — Portal implementatie (volledig)
 *
 * Scoring model: TOTAAL PUNTEN per dimensie
 *   score = SUM(antwoord_waarde × vraag_gewicht)
 *
 * 8 stappen — identiek aan CRM (radicalcrm.nl):
 *   1. Poort config ophalen
 *   2. Echte kandidaten tellen
 *   3. UPSERT apac_resultaten
 *   4. Log activiteit
 *   5. De Poort beslissing
 *   6. Update kandidaten.pool_status
 *   7. Notificeer admins (CRM in-app + email)
 *   8. Re-embed kandidaat
 */

import { createServiceClient } from "@/lib/supabase/server";
import { buildKandidaatText, upsertEmbedding } from "@/lib/ai/embeddings";
import { sendEmail } from "@/lib/email";
import { emailWrap, datumNL, buildApacScoreTable, buildDePoortBadge, buildCtaButton, BADGE, STATUS_KLEUR } from "@/lib/email/templates";
import type {
  ApacScores,
  ApacMaxScores,
  PoortConfig,
  PoortDecision,
  ProcessApacScoresInput,
  ProcessApacScoresResult,
  ValidateApacScoresResult,
  VetoDetail,
} from "./types";
import { buildVetoEmailHtml } from "./scoring";
import { getNotifiableUsers } from "@/lib/automation/emailVoorkeuren";

/**
 * Valideert een set APAC-scores.
 * Scores zijn totaal punten — moeten >= 0 zijn.
 * maxScores is optioneel; als meegegeven wordt ook de bovengrens gecheckt.
 */
export function validateApacScores(
  scores: unknown,
  maxScores?: ApacMaxScores
): ValidateApacScoresResult {
  const errors: string[] = [];
  const dimensions = ["adaptability", "personality", "awareness", "connection"];

  if (!scores || typeof scores !== "object") {
    return { valid: false, errors: ["Scores object is verplicht"] };
  }

  const s = scores as Record<string, unknown>;

  for (const dim of dimensions) {
    const val = s[dim];
    if (val === undefined || val === null) {
      errors.push(`${dim} is verplicht`);
    } else if (typeof val !== "number" || val < 0) {
      errors.push(`${dim} moet >= 0 zijn (was: ${val})`);
    } else if (maxScores && val > maxScores[dim as keyof ApacMaxScores]) {
      errors.push(`${dim} overschrijdt maximum ${maxScores[dim as keyof ApacMaxScores]} (was: ${val})`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Berekent de De Poort-beslissing op basis van scores, config en teller.
 * Pure functie — geen side effects, geen database.
 */
export function computeDePoortDecision(params: {
  totalKandidaten: number;
  config: PoortConfig;
  scores: ApacScores;
}): PoortDecision {
  const { totalKandidaten, config, scores } = params;

  if (config.fase === "learning" || totalKandidaten < config.kandidaat_drempel) {
    return { leerfase: true, newPoolStatus: "pool" };
  }

  const dimensions: { score: number; drempel: number | null | undefined }[] = [
    { score: scores.adaptability, drempel: config.drempel_adaptability },
    { score: scores.personality, drempel: config.drempel_personality },
    { score: scores.awareness, drempel: config.drempel_awareness },
    { score: scores.connection, drempel: config.drempel_connection },
  ];

  for (const { score, drempel } of dimensions) {
    if (drempel != null && score < drempel) {
      return { leerfase: false, newPoolStatus: "pending_review" };
    }
  }

  const totaal = scores.adaptability + scores.personality + scores.awareness + scores.connection;

  if (config.drempel_gecombineerd != null && totaal < config.drempel_gecombineerd) {
    return { leerfase: false, newPoolStatus: "pending_review" };
  }

  return { leerfase: false, newPoolStatus: "pool" };
}

/**
 * Verwerkt APAC-scores end-to-end (8 stappen).
 */
export async function processApacScores(
  input: ProcessApacScoresInput
): Promise<ProcessApacScoresResult> {
  const { kandidaatId, kandidaat, scores, bron, metadata = {}, vetoDetails = [] } = input;
  const vetoGetriggerd = vetoDetails.length > 0;
  const supabase = createServiceClient();

  // Stap 1: Poort configuratie
  const { data: poortRow } = await supabase
    .from("poort_config")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const config: PoortConfig = (poortRow as PoortConfig | null) ?? {
    fase: "learning",
    kandidaat_drempel: 150,
  };

  // Stap 2: Tel echte kandidaten (is_seed = false)
  const { count } = await supabase
    .from("apac_resultaten")
    .select("kandidaat_id", { count: "exact", head: true })
    .eq("is_seed", false);

  const totalKandidaten = count ?? 0;

  // Stap 3: UPSERT apac_resultaten (totaal punten + veto)
  const { error: apacError } = await supabase
    .from("apac_resultaten")
    .upsert(
      {
        kandidaat_id: kandidaatId,
        adaptability: scores.adaptability,
        personality: scores.personality,
        awareness: scores.awareness,
        connection: scores.connection,
        bron,
        is_seed: false,
        notities: `Via ${bron} op ${new Date().toLocaleDateString("nl-NL")}`,
        veto_getriggerd: vetoGetriggerd,
        veto_details: vetoDetails,
      },
      { onConflict: "kandidaat_id" }
    );

  if (apacError) {
    throw new Error(`apac_resultaten upsert mislukt: ${apacError.message}`);
  }

  // Stap 4: Log activiteit
  const totaal = scores.adaptability + scores.personality + scores.awareness + scores.connection;

  await supabase.from("activiteiten").insert({
    type: "notitie",
    beschrijving: `APAC Assessment ontvangen via ${bron}: A:${scores.adaptability} P:${scores.personality} Aw:${scores.awareness} C:${scores.connection} (totaal: ${totaal})`,
    kandidaat_id: kandidaatId,
    user_id: null,
    metadata: {
      source: bron,
      apac: scores,
      ...metadata,
    },
  });

  // Stap 5: De Poort beslissing
  const { leerfase, newPoolStatus } = computeDePoortDecision({
    totalKandidaten,
    config,
    scores,
  });

  // Stap 6: Update pool_status
  await supabase
    .from("kandidaten")
    .update({ pool_status: newPoolStatus })
    .eq("id", kandidaatId);

  // Stap 7a: CRM in-app notificaties
  const { data: admins } = await supabase
    .from("portal_users")
    .select("auth_user_id")
    .eq("role", "admin");

  const vetoSuffix = vetoGetriggerd ? ` ⚠ Veto: ${vetoDetails.length} getriggerd!` : "";

  const notificatieTitel = vetoGetriggerd
    ? "APAC ingevuld ⚠ Veto getriggerd"
    : leerfase
    ? "APAC ingevuld — leerfase review vereist"
    : newPoolStatus === "pool"
    ? "Nieuwe kandidaat door APAC poort"
    : "APAC ingevuld — onder drempel";

  const notificatieBericht = leerfase
    ? `${kandidaat.voornaam} ${kandidaat.achternaam} heeft de APAC assessment ingevuld via ${bron} (totaal: ${totaal} punten). Leerfase — handmatige review vereist.${vetoSuffix}`
    : newPoolStatus === "pool"
    ? `${kandidaat.voornaam} ${kandidaat.achternaam} is door De Poort (totaal: ${totaal} punten) en staat nu in de Radical Pool.${vetoSuffix}`
    : `${kandidaat.voornaam} ${kandidaat.achternaam} haalt de APAC drempelscores niet (totaal: ${totaal} punten). Review vereist.${vetoSuffix}`;

  for (const admin of (admins ?? []) as { auth_user_id: string }[]) {
    await supabase.from("notificaties").insert({
      user_id: admin.auth_user_id,
      titel: notificatieTitel,
      bericht: notificatieBericht,
      type: vetoGetriggerd ? "warning" : "info",
      link: `/kandidaten/${kandidaatId}`,
    });
  }

  // Stap 7b: Email notificatie naar admins met apac_voltooid voorkeur aan
  const notifiableUsers = await getNotifiableUsers("apac_voltooid");
  if (notifiableUsers.length > 0) {
    const notifEmails = notifiableUsers.map((u) => u.email);
    const vetoEmailHtml = buildVetoEmailHtml(vetoDetails);
    const naam = `${kandidaat.voornaam} ${kandidaat.achternaam}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://radicalnetwork.nl";
    const poortBadge = buildDePoortBadge(newPoolStatus, leerfase);
    const statusBadge = BADGE(newPoolStatus.toUpperCase(), STATUS_KLEUR[newPoolStatus] || "#888");

    await sendEmail({
      to: notifEmails,
      subject: vetoGetriggerd
        ? `Nieuwe aanmelding — ${naam} ⚠ Veto getriggerd`
        : `Nieuwe aanmelding — ${naam}`,
      html: emailWrap(
        vetoGetriggerd ? `Nieuwe aanmelding — ${naam} ⚠ Veto` : `Nieuwe aanmelding — ${naam}`,
        datumNL(),
        `<p style="color:#555;margin-bottom:16px">${notificatieBericht}</p>
          ${vetoEmailHtml}
          <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
            <tr><td style="padding:10px 12px;border-bottom:1px solid #eee"><strong>De Poort</strong></td><td style="padding:10px 12px;border-bottom:1px solid #eee">${poortBadge}</td></tr>
            <tr style="background:#f8f9fa"><td style="padding:10px 12px;border-bottom:1px solid #eee"><strong>Pool status</strong></td><td style="padding:10px 12px;border-bottom:1px solid #eee">${statusBadge}</td></tr>
          </table>
          ${buildApacScoreTable(scores)}
          ${buildCtaButton(`${siteUrl}/kandidaten/${kandidaatId}`, "Bekijk kandidaat")}`
      ),
    }).catch((err) => {
      console.error("[processApacScores] Email error:", err);
    });
  }

  // Stap 8: Re-embed kandidaat met APAC data
  try {
    const enrichedText = buildKandidaatText({
      voornaam: kandidaat.voornaam,
      achternaam: kandidaat.achternaam,
      vaardigheden: kandidaat.vaardigheden,
      tags: kandidaat.tags,
      beschikbaarheid: kandidaat.beschikbaarheid,
      opzegtermijn: kandidaat.opzegtermijn,
      salarisindicatie: kandidaat.salarisindicatie,
      uurtarief: kandidaat.uurtarief,
      notities: kandidaat.notities,
      apac: scores,
    });

    await upsertEmbedding({
      entityType: "kandidaat",
      entityId: kandidaatId,
      content: enrichedText,
    });
  } catch (err) {
    // Embedding is non-blocking — log but don't fail
    console.error("[processApacScores] Embedding error:", err);
  }

  return {
    kandidaat_id: kandidaatId,
    scores,
    gecombineerd: totaal,
    leerfase,
    pool_status: newPoolStatus,
    veto_getriggerd: vetoGetriggerd,
    veto_details: vetoDetails,
  };
}
