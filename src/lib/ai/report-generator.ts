/**
 * Kandidaat Rapport Generator — Karpathy-inspired LLM Knowledge Compilation
 *
 * Flow:
 * 1. collectBrondata() → verzamel alle data bronnen
 * 2. buildPrompt() → assembleer system + user prompt
 * 3. LLM call → gestructureerd rapport (JSON)
 * 4. Opslaan in kandidaat_rapporten
 * 5. Re-embed kandidaat met verrijkte tekst
 */
import { createServiceClient } from "@/lib/supabase/server";
import { reportCompletion } from "./report-provider";
import { upsertEmbedding, buildKandidaatText } from "./embeddings";
import crypto from "crypto";
import type {
  KandidaatBrondataBundle,
  KandidaatRapport,
  KandidaatBrondataRow,
  KandidaatTranscriptieRow,
} from "@/lib/types/report";

// ── Data Collectie ──

export async function collectBrondata(
  kandidaatId: string
): Promise<KandidaatBrondataBundle> {
  const supabase = createServiceClient();

  // Parallel queries
  const [profielRes, apacRes, brondataRes, transcriptiesRes, activiteitenRes] =
    await Promise.all([
      supabase
        .from("kandidaten")
        .select(
          "voornaam, achternaam, email, telefoon, linkedin_url, vaardigheden, tags, beschikbaarheid, opzegtermijn, salarisindicatie, uurtarief"
        )
        .eq("id", kandidaatId)
        .single(),
      supabase
        .from("apac_resultaten")
        .select("adaptability, personality, awareness, connection, veto_getriggerd, veto_details")
        .eq("kandidaat_id", kandidaatId)
        .eq("is_seed", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("kandidaat_brondata")
        .select("*")
        .eq("kandidaat_id", kandidaatId),
      supabase
        .from("kandidaat_transcripties")
        .select("*")
        .eq("kandidaat_id", kandidaatId)
        .order("created_at", { ascending: false }),
      supabase
        .from("activiteiten")
        .select("type, beschrijving, created_at")
        .eq("kandidaat_id", kandidaatId)
        .in("type", ["notitie", "gespreksverslag", "screening"])
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const profiel = profielRes.data as KandidaatBrondataBundle["profiel"] | null;
  if (!profiel) throw new Error("Kandidaat niet gevonden");

  const apacRaw = apacRes.data as {
    adaptability: number;
    personality: number;
    awareness: number;
    connection: number;
    veto_getriggerd: boolean;
    veto_details: Array<{ question_text: string; answer_label: string }>;
  } | null;

  return {
    profiel,
    apac: apacRaw
      ? {
          adaptability: apacRaw.adaptability,
          personality: apacRaw.personality,
          awareness: apacRaw.awareness,
          connection: apacRaw.connection,
          veto_getriggerd: apacRaw.veto_getriggerd ?? false,
          veto_details: apacRaw.veto_details ?? [],
        }
      : null,
    brondata: ((brondataRes.data ?? []) as KandidaatBrondataRow[]),
    transcripties: ((transcriptiesRes.data ?? []) as KandidaatTranscriptieRow[]),
    notities: ((activiteitenRes.data ?? []) as { beschrijving: string }[]).map(
      (a) => a.beschrijving
    ),
  };
}

// ── Prompt Assembly ──

const SYSTEM_PROMPT = `Je bent een recruitment analist. Schrijf een UITGEBREID rapport in het Nederlands over een kandidaat.

REGELS:
- VERZIN NIETS. Baseer alles op aangeleverde data. Citeer feiten: "Uit het CV: hij werkte bij X als Y".
- Schrijf LANG en GEDETAILLEERD: executive_summary 150+ woorden, elke sectie 150+ woorden.
- Genereer 6-10 secties. Cross-refereer bronnen.
- Gebruik NOOIT de term "rode vlaggen". Gebruik "aandachtspunten" of "aanbevelingen voor verdieping".
- Wees constructief en genuanceerd, niet alarmerend. Een aandachtspunt is iets om te verkennen, niet een reden tot afwijzing.

APAC SCORES INTERPRETATIE (0-50 schaal per dimensie):
- 90-100% = Uitstekend
- 75-89% = Goed/Sterk
- 60-74% = Voldoende/Gemiddeld
- Onder 60% = Aandachtspunt
Een score van 74% (bijv. 37/50) is GOED, NIET laag. Noem het NOOIT laag of een rode vlag.
Interpreteer scores altijd relatief aan het percentage, niet het absolute getal.

Antwoord in JSON:
{"executive_summary":"uitgebreide alinea 150+ woorden","secties":[{"titel":"string","type":"analyse|observatie|risico|kans|aanbeveling","inhoud":"150+ woorden met concrete feiten","confidence":"hoog|gemiddeld","bronnen":["cv","linkedin","apac","profiel"]}],"cross_source_inzichten":[{"inzicht":"string","type":"tegenstrijdigheid|bevestiging|patroon|gap","bronnen":["string"]}],"scorecard":{"overall_assessment":"string","inzetbaarheid":1,"data_volledigheid":50,"confidence_level":"gemiddeld","kernwoorden":["woord1","woord2"],"one_liner":"string"},"meta":{"bronnen_gebruikt":["string"],"model":"string","gegenereerd_op":"ISO date","versie":1}}`;

export function buildUserPrompt(data: KandidaatBrondataBundle): string {
  const parts: string[] = [];

  // Profiel
  parts.push("# Kandidaat Profiel");
  parts.push(`Naam: ${data.profiel.voornaam} ${data.profiel.achternaam}`);
  if (data.profiel.email) parts.push(`Email: ${data.profiel.email}`);
  if (data.profiel.telefoon) parts.push(`Telefoon: ${data.profiel.telefoon}`);
  if (data.profiel.linkedin_url) parts.push(`LinkedIn: ${data.profiel.linkedin_url}`);
  if (data.profiel.vaardigheden?.length) {
    parts.push(`Vaardigheden: ${data.profiel.vaardigheden.join(", ")}`);
  }
  if (data.profiel.tags?.length) {
    parts.push(`Tags: ${data.profiel.tags.join(", ")}`);
  }
  if (data.profiel.beschikbaarheid != null) {
    parts.push(`Beschikbaarheid: ${data.profiel.beschikbaarheid ? "Ja" : "Nee"}`);
  }
  if (data.profiel.opzegtermijn) parts.push(`Opzegtermijn: ${data.profiel.opzegtermijn}`);
  if (data.profiel.salarisindicatie) {
    parts.push(`Salarisindicatie: €${data.profiel.salarisindicatie.toLocaleString("nl-NL")}`);
  }
  if (data.profiel.uurtarief) {
    parts.push(`Uurtarief: €${data.profiel.uurtarief}/uur`);
  }

  // APAC — include max scores and percentages so the LLM interprets correctly
  if (data.apac) {
    const max = 50; // APAC max per dimensie is 50
    const pct = (v: number) => Math.round((v / max) * 100);
    parts.push("\n# APAC Assessment (schaal 0-50 per dimensie, hoger=beter)");
    parts.push(`Adaptability: ${data.apac.adaptability}/${max} (${pct(data.apac.adaptability)}%)`);
    parts.push(`Personality: ${data.apac.personality}/${max} (${pct(data.apac.personality)}%)`);
    parts.push(`Awareness: ${data.apac.awareness}/${max} (${pct(data.apac.awareness)}%)`);
    parts.push(`Connection: ${data.apac.connection}/${max} (${pct(data.apac.connection)}%)`);
    const totaal = data.apac.adaptability + data.apac.personality + data.apac.awareness + data.apac.connection;
    parts.push(`Totaal: ${totaal}/${max * 4} (${Math.round((totaal / (max * 4)) * 100)}%)`);
    if (data.apac.veto_getriggerd) {
      parts.push("VETO GETRIGGERD:");
      for (const v of data.apac.veto_details) {
        parts.push(`  - ${v.question_text}: ${v.answer_label}`);
      }
    }
  }

  // Brondata per type — trim to stay within token limits
  const MAX_SOURCE = 3000;

  const cvData = data.brondata.find((b) => b.bron_type === "cv_tekst");
  if (cvData) {
    parts.push("\n# CV Tekst");
    parts.push(cvData.inhoud.slice(0, MAX_SOURCE));
  }

  const linkedinData = data.brondata.find((b) => b.bron_type === "linkedin_profiel");
  if (linkedinData) {
    parts.push("\n# LinkedIn Profiel");
    parts.push(linkedinData.inhoud.slice(0, MAX_SOURCE));
  }

  // Transcripties — max 2000 per stuk
  if (data.transcripties.length > 0) {
    parts.push("\n# Transcripties");
    for (const t of data.transcripties.slice(0, 3)) {
      parts.push(`\n## ${t.titel}`);
      parts.push(t.transcript.slice(0, 2000));
    }
  }

  // Admin notities — max 5
  if (data.notities.length > 0) {
    parts.push("\n# Notities");
    for (const n of data.notities.slice(0, 5)) {
      parts.push(`- ${n.slice(0, 300)}`);
    }
  }

  parts.push("\nGenereer het rapport in JSON.");

  return parts.join("\n");
}

// ── Report Generation ──

export async function generateKandidaatRapport(
  kandidaatId: string
): Promise<KandidaatRapport> {
  const supabase = createServiceClient();

  // Mark as generating
  await supabase.from("kandidaat_rapporten").upsert(
    {
      kandidaat_id: kandidaatId,
      status: "generating",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "kandidaat_id" }
  );

  try {
    // 1. Collect all data
    const bundle = await collectBrondata(kandidaatId);

    // 2. Build prompt
    const userPrompt = buildUserPrompt(bundle);

    // 3. LLM call
    const { content, model, tokens, durationMs } = await reportCompletion(
      SYSTEM_PROMPT,
      userPrompt
    );

    // 4. Parse JSON response
    let rapport: KandidaatRapport;
    try {
      rapport = JSON.parse(content) as KandidaatRapport;
    } catch {
      // Try to extract JSON from response if wrapped in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rapport = JSON.parse(jsonMatch[0]) as KandidaatRapport;
      } else {
        throw new Error("LLM antwoord is geen geldig JSON");
      }
    }

    // Ensure meta is set
    rapport.meta = {
      ...rapport.meta,
      model,
      gegenereerd_op: new Date().toISOString(),
      versie: 1,
    };

    // 5. Collect current brondata hashes
    const currentHashes = bundle.brondata.map((b) => b.content_hash);

    // Also hash profile + apac data for staleness tracking
    const profielHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(bundle.profiel) + JSON.stringify(bundle.apac))
      .digest("hex")
      .slice(0, 16);
    currentHashes.push(profielHash);

    // 6. Get current version
    const { data: existing } = await supabase
      .from("kandidaat_rapporten")
      .select("rapport_versie")
      .eq("kandidaat_id", kandidaatId)
      .maybeSingle();

    const currentVersion =
      ((existing as { rapport_versie: number } | null)?.rapport_versie ?? 0) + 1;

    // 7. Store report
    await supabase.from("kandidaat_rapporten").upsert(
      {
        kandidaat_id: kandidaatId,
        rapport_versie: currentVersion,
        status: "ready",
        secties: rapport as unknown as Record<string, unknown>,
        brondata_hashes: currentHashes,
        model_gebruikt: model,
        tokens_gebruikt: tokens,
        generatie_duur_ms: durationMs,
        error_bericht: null,
        gegenereerd_op: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "kandidaat_id" }
    );

    // 8. Log AI usage
    await supabase.from("ai_logs").insert({
      action: "generate_report",
      input: {
        kandidaat_id: kandidaatId,
        brondata_count: bundle.brondata.length,
        transcripties_count: bundle.transcripties.length,
      },
      output: {
        secties_count: rapport.secties.length,
        cross_source_count: rapport.cross_source_inzichten.length,
      },
      model,
      tokens_used: tokens,
      duration_ms: durationMs,
      success: true,
    });

    // 9. Re-embed with enriched text
    await reEmbedKandidaat(kandidaatId, bundle, rapport);

    return rapport;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Onbekende fout";

    // Mark as error
    await supabase.from("kandidaat_rapporten").upsert(
      {
        kandidaat_id: kandidaatId,
        status: "error",
        error_bericht: errorMsg,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "kandidaat_id" }
    );

    throw err;
  }
}

// ── Enriched Embedding ──

async function reEmbedKandidaat(
  kandidaatId: string,
  bundle: KandidaatBrondataBundle,
  rapport: KandidaatRapport
): Promise<void> {
  // Build basic kandidaat text
  const basicText = buildKandidaatText({
    voornaam: bundle.profiel.voornaam,
    achternaam: bundle.profiel.achternaam,
    vaardigheden: bundle.profiel.vaardigheden,
    tags: bundle.profiel.tags,
    beschikbaarheid: bundle.profiel.beschikbaarheid,
    opzegtermijn: bundle.profiel.opzegtermijn ?? undefined,
    salarisindicatie: bundle.profiel.salarisindicatie ?? undefined,
    uurtarief: bundle.profiel.uurtarief ?? undefined,
    apac: bundle.apac
      ? {
          adaptability: bundle.apac.adaptability,
          personality: bundle.apac.personality,
          awareness: bundle.apac.awareness,
          connection: bundle.apac.connection,
        }
      : undefined,
  });

  // Enrich with rapport data
  const enrichmentParts: string[] = [basicText];

  // Executive summary
  if (rapport.executive_summary) {
    enrichmentParts.push(`Profiel: ${rapport.executive_summary}`);
  }

  // Scorecard kernwoorden + one-liner
  if (rapport.scorecard) {
    if (rapport.scorecard.kernwoorden?.length) {
      enrichmentParts.push(`Kernwoorden: ${rapport.scorecard.kernwoorden.join(", ")}`);
    }
    if (rapport.scorecard.one_liner) {
      enrichmentParts.push(`Typering: ${rapport.scorecard.one_liner}`);
    }
    if (rapport.scorecard.overall_assessment) {
      enrichmentParts.push(`Assessment: ${rapport.scorecard.overall_assessment}`);
    }
  }

  // Ideale rol + technisch profiel secties
  for (const sectie of rapport.secties) {
    const lowerTitle = sectie.titel.toLowerCase();
    if (
      lowerTitle.includes("ideale rol") ||
      lowerTitle.includes("rolprofiel") ||
      lowerTitle.includes("technisch") ||
      lowerTitle.includes("motivatie") ||
      lowerTitle.includes("drijfveren")
    ) {
      enrichmentParts.push(`${sectie.titel}: ${sectie.inhoud.slice(0, 500)}`);
    }
  }

  const enrichedText = enrichmentParts.join("\n");

  // Upsert embedding with enriched text
  try {
    await upsertEmbedding({
      entityType: "kandidaat",
      entityId: kandidaatId,
      content: enrichedText,
      metadata: { enriched_by_report: true, report_version: rapport.meta.versie },
    });
  } catch (err) {
    // Non-blocking: log but don't fail the report
    console.error("Re-embed na rapport mislukt:", err);
  }
}
