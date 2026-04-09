/**
 * AI provider configuration — identical to CRM (radicalcrm.nl)
 * Supports OpenAI and Gemini via auto-detection.
 */
import OpenAI from "openai";

export type AIProvider = "openai" | "gemini";

let _client: OpenAI | null = null;
let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_provider) return _provider;
  if (process.env.OPENAI_API_KEY) _provider = "openai";
  else if (process.env.GEMINI_API_KEY) _provider = "gemini";
  else throw new Error("Geen AI API key geconfigureerd. Stel OPENAI_API_KEY of GEMINI_API_KEY in.");
  return _provider;
}

export function getAIClient(): OpenAI {
  if (_client) return _client;
  const provider = getAIProvider();

  if (provider === "openai") {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } else {
    _client = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }

  return _client;
}

export function getEmbeddingModel(): string {
  return getAIProvider() === "openai" ? "text-embedding-3-small" : "gemini-embedding-001";
}

export const EMBEDDING_DIMENSIONS = 768;
