import type { Service } from "../types";
import { getAiClient, AI_MODEL, isAiConfigured } from "./providers";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

/**
 * The agent's single decision: given a goal and the available services, pick one.
 * Kept intentionally minimal — one LLM call, then deterministic on-chain logic.
 *
 * In DEMO_MODE (or when no API key) it falls back to a deterministic pick so the
 * stage demo is 100% reproducible.
 */
export async function chooseService(
  goal: string,
  services: Service[]
): Promise<{ service: Service; reason: string }> {
  if (services.length === 0) throw new Error("No services available");

  if (DEMO_MODE || !isAiConfigured()) {
    const best = pickDeterministic(goal, services);
    return {
      service: best,
      reason: `Best match for "${goal}" by relevance and reputation.`,
    };
  }

  const client = getAiClient();
  const catalog = services
    .map((s) => `${s.id} | ${s.title} | ${s.price} USDC | rep ${s.providerReputation} | ${s.description}`)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are an autonomous purchasing agent. Choose exactly one service that best achieves the goal, balancing relevance, price, and provider reputation. Respond as JSON: {\"service_id\":\"...\",\"reason\":\"...\"}.",
      },
      { role: "user", content: `Goal: ${goal}\n\nServices:\n${catalog}` },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { service_id?: string; reason?: string };
  const service = services.find((s) => s.id === parsed.service_id) ?? pickDeterministic(goal, services);
  return { service, reason: parsed.reason ?? "Selected by agent." };
}

function pickDeterministic(goal: string, services: Service[]): Service {
  const g = goal.toLowerCase();
  const scored = services
    .map((s) => {
      const text = `${s.title} ${s.description} ${s.category}`.toLowerCase();
      const hits = g.split(/\s+/).filter((w) => w.length > 2 && text.includes(w)).length;
      return { s, score: hits * 100 + s.providerReputation };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0].s;
}
