/**
 * Embedding pipeline — Portal implementatie
 * Identiek aan CRM (radicalcrm.nl) src/lib/ai/embeddings.ts
 *
 * Functies:
 * - generateEmbedding(): 768-dim vector via OpenAI/Gemini
 * - upsertEmbedding(): idempotent insert met content-hash deduplicatie
 * - buildKandidaatText(): tekst-representatie voor embedding
 */
import { createServiceClient } from "@/lib/supabase/server";
import { getAIClient, getEmbeddingModel, getAIProvider, EMBEDDING_DIMENSIONS } from "./provider";
import crypto from "crypto";

function getSupabase() {
  return createServiceClient();
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.slice(0, 8000);

  if (getAIProvider() === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text: input }] },
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini embedding error: ${err}`);
    }
    const data = await res.json();
    return data.embedding.values as number[];
  }

  const response = await getAIClient().embeddings.create({
    model: getEmbeddingModel(),
    input,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0].embedding;
}

function contentHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export async function upsertEmbedding({
  entityType,
  entityId,
  content,
  metadata = {},
}: {
  entityType: string;
  entityId: string;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const hash = contentHash(content);
  const supabase = getSupabase();

  // Check if embedding already exists with same content
  const { data: existing } = await supabase
    .from("embeddings")
    .select("id, content_hash")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();

  if (existing && (existing as { content_hash: string }).content_hash === hash) {
    return { skipped: true, reason: "content_unchanged" };
  }

  const startTime = Date.now();
  const embedding = await generateEmbedding(content);
  const duration = Date.now() - startTime;

  const { error } = await supabase.from("embeddings").upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      content_hash: hash,
      content_preview: content.slice(0, 200),
      embedding: JSON.stringify(embedding),
      metadata,
    },
    { onConflict: "entity_type,entity_id,content_hash" }
  );

  if (error) throw error;

  // Log AI usage
  await supabase.from("ai_logs").insert({
    action: "generate_embedding",
    input: { entity_type: entityType, entity_id: entityId, content_length: content.length },
    output: { dimensions: embedding.length },
    model: getEmbeddingModel(),
    tokens_used: Math.ceil(content.length / 4),
    duration_ms: duration,
    success: true,
  });

  return { skipped: false, dimensions: embedding.length };
}

/**
 * Build text representation of a kandidaat for embedding.
 * Scores are now total points (not 0-10).
 */
export function buildKandidaatText(kandidaat: {
  voornaam: string;
  achternaam: string;
  vaardigheden?: string[];
  tags?: string[];
  beschikbaarheid?: boolean | string | null;
  opzegtermijn?: string;
  salarisindicatie?: number;
  uurtarief?: number;
  notities?: string;
  apac?: { adaptability: number; personality: number; awareness: number; connection: number };
}): string {
  const parts = [
    `Kandidaat: ${kandidaat.voornaam} ${kandidaat.achternaam}`,
  ];

  if (kandidaat.vaardigheden?.length) {
    parts.push(`Vaardigheden: ${kandidaat.vaardigheden.join(", ")}`);
  }
  if (kandidaat.tags?.length) {
    parts.push(`Tags: ${kandidaat.tags.join(", ")}`);
  }
  if (kandidaat.beschikbaarheid != null) {
    const label =
      kandidaat.beschikbaarheid === true ? "Beschikbaar" :
      kandidaat.beschikbaarheid === false ? "Niet beschikbaar" :
      String(kandidaat.beschikbaarheid);
    parts.push(`Beschikbaarheid: ${label}`);
  }
  if (kandidaat.opzegtermijn) {
    parts.push(`Opzegtermijn: ${kandidaat.opzegtermijn}`);
  }
  if (kandidaat.salarisindicatie) {
    parts.push(`Salarisindicatie: €${kandidaat.salarisindicatie}`);
  }
  if (kandidaat.uurtarief) {
    parts.push(`Uurtarief: €${kandidaat.uurtarief}`);
  }
  if (kandidaat.notities) {
    parts.push(`Notities: ${kandidaat.notities}`);
  }
  if (kandidaat.apac) {
    parts.push(
      `APAC profiel: Adaptability ${kandidaat.apac.adaptability}, Personality ${kandidaat.apac.personality}, Awareness ${kandidaat.apac.awareness}, Connection ${kandidaat.apac.connection}`
    );
  }

  return parts.join("\n");
}
