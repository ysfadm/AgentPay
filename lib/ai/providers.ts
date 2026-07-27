import OpenAI from "openai";

/** OpenAI-compatible client. Point OPENAI_BASE_URL at any compatible provider. */
let _client: OpenAI | null = null;

export function getAiClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "sk-demo",
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }
  return _client;
}

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
