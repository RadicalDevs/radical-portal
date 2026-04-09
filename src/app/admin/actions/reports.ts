"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { extractCvText } from "@/lib/ai/cv-extraction";
import crypto from "crypto";
import type {
  KandidaatBrondataRow,
  KandidaatRapportRow,
  KandidaatTranscriptieRow,
  RapportStaleness,
  RapportSettingsRow,
} from "@/lib/types/report";

// ── Helpers ──

function contentHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

async function requireAdmin() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = createServiceClient();
  const { data: portalUser } = await supabase
    .from("portal_users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!portalUser || (portalUser as { role: string }).role !== "admin") {
    throw new Error("Geen admin toegang");
  }
  return { userId: user.id, supabase };
}

// ── Transcripties ──

export async function getTranscripties(
  kandidaatId: string
): Promise<KandidaatTranscriptieRow[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("kandidaat_transcripties")
    .select("*")
    .eq("kandidaat_id", kandidaatId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as KandidaatTranscriptieRow[];
}

export async function addTranscriptie(
  kandidaatId: string,
  titel: string,
  transcript: string
): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();

  if (!titel.trim() || !transcript.trim()) {
    return { error: "Titel en transcriptie tekst zijn verplicht" };
  }

  // Insert transcriptie
  const { error: tErr } = await supabase
    .from("kandidaat_transcripties")
    .insert({
      kandidaat_id: kandidaatId,
      titel: titel.trim(),
      transcript: transcript.trim(),
      bron: "handmatig",
    });

  if (tErr) return { error: tErr.message };

  // Upsert in brondata
  const hash = contentHash(transcript.trim());
  await supabase.from("kandidaat_brondata").upsert(
    {
      kandidaat_id: kandidaatId,
      bron_type: "transcriptie",
      bron_label: titel.trim(),
      inhoud: transcript.trim(),
      content_hash: hash,
      metadata: { bron: "handmatig" },
    },
    { onConflict: "kandidaat_id,bron_type,content_hash" }
  );

  revalidatePath("/admin");
  return {};
}

export async function deleteTranscriptie(
  transcriptieId: string
): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();

  // Get the transcriptie first to find matching brondata
  const { data: trans } = await supabase
    .from("kandidaat_transcripties")
    .select("kandidaat_id, transcript")
    .eq("id", transcriptieId)
    .single();

  if (!trans) return { error: "Transcriptie niet gevonden" };

  const { kandidaat_id, transcript } = trans as {
    kandidaat_id: string;
    transcript: string;
  };

  // Delete transcriptie
  const { error } = await supabase
    .from("kandidaat_transcripties")
    .delete()
    .eq("id", transcriptieId);

  if (error) return { error: error.message };

  // Delete matching brondata
  const hash = contentHash(transcript);
  await supabase
    .from("kandidaat_brondata")
    .delete()
    .eq("kandidaat_id", kandidaat_id)
    .eq("bron_type", "transcriptie")
    .eq("content_hash", hash);

  revalidatePath("/admin");
  return {};
}

// ── LinkedIn Data ──

export async function saveLinkedInData(
  kandidaatId: string,
  text: string
): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();

  if (!text.trim()) {
    return { error: "LinkedIn profiel tekst is verplicht" };
  }

  const trimmed = text.trim();
  const hash = contentHash(trimmed);

  // Single upsert: delete old + insert new in one go
  // First delete any existing linkedin data, then insert
  const { error: delError } = await supabase
    .from("kandidaat_brondata")
    .delete()
    .eq("kandidaat_id", kandidaatId)
    .eq("bron_type", "linkedin_profiel");

  if (delError) {
    console.warn("LinkedIn delete warning:", delError.message);
  }

  const { error } = await supabase.from("kandidaat_brondata").insert({
    kandidaat_id: kandidaatId,
    bron_type: "linkedin_profiel",
    bron_label: "LinkedIn Profiel",
    inhoud: trimmed,
    content_hash: hash,
    metadata: { bron: "handmatig_geplakt" },
  });

  if (error) {
    // If unique constraint violation, try update instead
    if (error.code === "23505") {
      const { error: updateError } = await supabase
        .from("kandidaat_brondata")
        .update({ inhoud: trimmed, content_hash: hash, updated_at: new Date().toISOString() })
        .eq("kandidaat_id", kandidaatId)
        .eq("bron_type", "linkedin_profiel");
      if (updateError) return { error: updateError.message };
    } else {
      return { error: error.message };
    }
  }

  revalidatePath("/admin");
  return {};
}

export async function getLinkedInData(
  kandidaatId: string
): Promise<KandidaatBrondataRow | null> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("kandidaat_brondata")
    .select("*")
    .eq("kandidaat_id", kandidaatId)
    .eq("bron_type", "linkedin_profiel")
    .limit(1)
    .maybeSingle();

  return (data as KandidaatBrondataRow) ?? null;
}

// ── CV Text Extractie ──

export async function extractAndStoreCvText(
  kandidaatId: string,
  cvUrl: string
): Promise<{ error?: string; text?: string }> {
  const { supabase } = await requireAdmin();

  const text = await extractCvText(cvUrl);
  if (!text) {
    return { error: "Kon geen tekst extraheren uit het CV bestand" };
  }

  const hash = contentHash(text);

  // Delete old CV text
  await supabase
    .from("kandidaat_brondata")
    .delete()
    .eq("kandidaat_id", kandidaatId)
    .eq("bron_type", "cv_tekst");

  // Insert new
  const { error } = await supabase.from("kandidaat_brondata").insert({
    kandidaat_id: kandidaatId,
    bron_type: "cv_tekst",
    bron_label: "CV",
    inhoud: text,
    content_hash: hash,
    metadata: { cv_url: cvUrl },
  });

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { text };
}

// ── Brondata Overzicht ──

export async function getBrondata(
  kandidaatId: string
): Promise<KandidaatBrondataRow[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("kandidaat_brondata")
    .select("*")
    .eq("kandidaat_id", kandidaatId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as KandidaatBrondataRow[];
}

// ── Rapport Ophalen ──

export async function getKandidaatRapport(
  kandidaatId: string
): Promise<KandidaatRapportRow | null> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("kandidaat_rapporten")
    .select("*")
    .eq("kandidaat_id", kandidaatId)
    .maybeSingle();

  return (data as KandidaatRapportRow) ?? null;
}

// ── Rapport Staleness Check ──

export async function checkRapportStaleness(
  kandidaatId: string
): Promise<RapportStaleness> {
  const { supabase } = await requireAdmin();

  // Get current brondata hashes
  const { data: brondata } = await supabase
    .from("kandidaat_brondata")
    .select("content_hash, bron_type")
    .eq("kandidaat_id", kandidaatId);

  const currentHashes = ((brondata ?? []) as { content_hash: string }[]).map(
    (b) => b.content_hash
  );

  // Get existing report
  const { data: rapport } = await supabase
    .from("kandidaat_rapporten")
    .select("brondata_hashes, gegenereerd_op, status")
    .eq("kandidaat_id", kandidaatId)
    .maybeSingle();

  const hasReport = !!rapport;
  const storedHashes: string[] =
    (rapport as { brondata_hashes: string[] } | null)?.brondata_hashes ?? [];

  // Check which types are present
  const presentTypes = new Set(
    ((brondata ?? []) as { bron_type: string }[]).map((b) => b.bron_type)
  );
  const allTypes = ["cv_tekst", "linkedin_profiel", "transcriptie"];
  const missingBronnen = allTypes.filter((t) => !presentTypes.has(t));

  // Stale if hashes differ
  const stale =
    !hasReport ||
    currentHashes.length !== storedHashes.length ||
    currentHashes.some((h) => !storedHashes.includes(h)) ||
    storedHashes.some((h) => !currentHashes.includes(h));

  return {
    hasReport,
    stale,
    lastGenerated:
      (rapport as { gegenereerd_op: string } | null)?.gegenereerd_op ?? null,
    brondataCount: currentHashes.length,
    missingBronnen,
    currentHashes,
  };
}

// ── Combined Data Loader (single auth call) ──

export async function loadReportTabData(kandidaatId: string): Promise<{
  rapport: KandidaatRapportRow | null;
  brondata: KandidaatBrondataRow[];
  transcripties: KandidaatTranscriptieRow[];
  staleness: RapportStaleness;
}> {
  const { supabase } = await requireAdmin();

  // All queries in one Promise.all — single auth call
  const [rapportRes, brondataRes, transcriptiesRes] = await Promise.all([
    supabase
      .from("kandidaat_rapporten")
      .select("*")
      .eq("kandidaat_id", kandidaatId)
      .maybeSingle(),
    supabase
      .from("kandidaat_brondata")
      .select("*")
      .eq("kandidaat_id", kandidaatId)
      .order("created_at", { ascending: false }),
    supabase
      .from("kandidaat_transcripties")
      .select("*")
      .eq("kandidaat_id", kandidaatId)
      .order("created_at", { ascending: false }),
  ]);

  const rapport = (rapportRes.data as KandidaatRapportRow) ?? null;
  const brondata = ((brondataRes.data ?? []) as KandidaatBrondataRow[]);
  const transcripties = ((transcriptiesRes.data ?? []) as KandidaatTranscriptieRow[]);

  // Compute staleness from already-fetched data
  const currentHashes = brondata.map((b) => b.content_hash);
  const storedHashes: string[] = rapport?.brondata_hashes ?? [];
  const presentTypes = new Set(brondata.map((b) => b.bron_type as string));
  const allTypes = ["cv_tekst", "linkedin_profiel", "transcriptie"];
  const missingBronnen = allTypes.filter((t) => !presentTypes.has(t));

  const stale =
    !rapport ||
    currentHashes.length !== storedHashes.length ||
    currentHashes.some((h) => !storedHashes.includes(h)) ||
    storedHashes.some((h) => !currentHashes.includes(h));

  const staleness: RapportStaleness = {
    hasReport: !!rapport,
    stale,
    lastGenerated: rapport?.gegenereerd_op ?? null,
    brondataCount: currentHashes.length,
    missingBronnen,
    currentHashes,
  };

  return { rapport, brondata, transcripties, staleness };
}

// ── Rapport Settings ──

export async function getRapportSettings(): Promise<RapportSettingsRow | null> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("rapport_settings")
    .select("*")
    .limit(1)
    .single();

  return (data as RapportSettingsRow) ?? null;
}

export async function updateRapportSettings(
  updates: Partial<Pick<RapportSettingsRow, "auto_generatie" | "model_voorkeur" | "fallback_models">>
): Promise<{ error?: string }> {
  const { supabase, userId } = await requireAdmin();

  const { error } = await supabase
    .from("rapport_settings")
    .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
    .not("id", "is", null); // Update all rows (there's only one)

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return {};
}
