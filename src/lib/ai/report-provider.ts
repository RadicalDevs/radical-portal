/**
 * Multi-Provider LLM voor rapport generatie.
 *
 * Prioriteit:
 * 1. Gemini Flash (gratis, via GEMINI_API_KEY)
 * 2. GPT-4o-mini (goedkoop, via OPENAI_API_KEY)
 * 3. Grok xAI (gratis tier, via XAI_API_KEY)
 *
 * Alle providers gebruiken de OpenAI SDK (compatible API's).
 */
import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/server";

export interface ReportModelConfig {
  provider: string;
  model: string;
  client: OpenAI;
}

/** Beschikbare provider configuraties */
const PROVIDERS: Record<string, () => ReportModelConfig | null> = {
  "gemini-2.0-flash": () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    return {
      provider: "gemini",
      model: "gemini-2.0-flash",
      client: new OpenAI({
        apiKey: key,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      }),
    };
  },
  "gpt-4o-mini": () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    return {
      provider: "openai",
      model: "gpt-4o-mini",
      client: new OpenAI({ apiKey: key }),
    };
  },
  "gpt-4o": () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    return {
      provider: "openai",
      model: "gpt-4o",
      client: new OpenAI({ apiKey: key }),
    };
  },
  "grok-3-mini": () => {
    const key = process.env.XAI_API_KEY;
    if (!key) return null;
    return {
      provider: "xai",
      model: "grok-3-mini",
      client: new OpenAI({
        apiKey: key,
        baseURL: "https://api.x.ai/v1",
      }),
    };
  },
  "groq-llama": () => {
    const key = process.env.GROQ_API_KEY;
    if (!key) return null;
    return {
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      client: new OpenAI({
        apiKey: key,
        baseURL: "https://api.groq.com/openai/v1",
      }),
    };
  },
};

/**
 * Haal de rapport LLM client op volgens de geconfigureerde voorkeur.
 * Probeert eerst het voorkeurs-model, dan de fallbacks.
 */
export async function getReportModel(): Promise<ReportModelConfig> {
  // Haal settings op uit database
  const supabase = createServiceClient();
  const { data: settings } = await supabase
    .from("rapport_settings")
    .select("model_voorkeur, fallback_models")
    .limit(1)
    .single();

  const voorkeur = (settings as { model_voorkeur: string } | null)?.model_voorkeur ?? "gemini-2.0-flash";
  const fallbacks: string[] = (settings as { fallback_models: string[] } | null)?.fallback_models ?? ["gpt-4o-mini", "grok-3-mini"];

  // Probeer voorkeur eerst, dan fallbacks
  const modelsToTry = [voorkeur, ...fallbacks];

  for (const modelKey of modelsToTry) {
    const factory = PROVIDERS[modelKey];
    if (!factory) continue;
    const config = factory();
    if (config) return config;
  }

  throw new Error(
    "Geen AI provider beschikbaar. Configureer GEMINI_API_KEY, OPENAI_API_KEY, of XAI_API_KEY."
  );
}

/**
 * Genereer een chat completion met het rapport model.
 * Bij 429 rate limit: wacht en retry, of probeer fallback provider.
 */
export async function reportCompletion(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ content: string; model: string; tokens: number; durationMs: number }> {
  // Haal alle beschikbare providers op in volgorde
  const supabase = createServiceClient();
  const { data: settings } = await supabase
    .from("rapport_settings")
    .select("model_voorkeur, fallback_models")
    .limit(1)
    .single();

  const voorkeur = (settings as { model_voorkeur: string } | null)?.model_voorkeur ?? "gemini-2.0-flash";
  const fallbacks: string[] = (settings as { fallback_models: string[] } | null)?.fallback_models ?? ["gpt-4o-mini", "grok-3-mini"];
  const modelsToTry = [voorkeur, ...fallbacks];

  const errors: string[] = [];

  for (const modelKey of modelsToTry) {
    const factory = PROVIDERS[modelKey];
    if (!factory) continue;
    const config = factory();
    if (!config) continue;

    // Try this provider, with one retry after 429
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const startTime = Date.now();

        const response = await config.client.chat.completions.create({
          model: config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 8000,
          ...(config.provider !== "xai" ? { response_format: { type: "json_object" } } : {}),
        });

        const durationMs = Date.now() - startTime;
        const content = response.choices[0]?.message?.content ?? "";
        const tokens =
          (response.usage?.prompt_tokens ?? 0) +
          (response.usage?.completion_tokens ?? 0);

        return { content, model: config.model, tokens, durationMs };
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        const msg = err instanceof Error ? err.message : String(err);

        if (status === 429 && attempt === 0) {
          // Rate limited — wait 3s and retry once
          console.warn(`429 rate limit van ${config.provider}/${config.model}, wacht 3s...`);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        // Log and try next provider
        errors.push(`${config.provider}/${config.model}: ${msg}`);
        break;
      }
    }
  }

  throw new Error(
    `Alle AI providers gefaald:\n${errors.join("\n")}`
  );
}
