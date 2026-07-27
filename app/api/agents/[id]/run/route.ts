import { NextResponse } from "next/server";
import { z } from "zod";
import { store, addEvent } from "@/lib/demo-store";
import { chooseService } from "@/lib/ai/orchestrator";
import { executePurchase, SpendingLimitError } from "@/lib/server/payments";
import { provisionProviders } from "@/lib/server/provision-demo";

export const maxDuration = 120;

const LIVE = process.env.NEXT_PUBLIC_DEMO_MODE === "false";
const schema = z.object({ goal: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = store.agents.find((a) => a.id === id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const goal = parsed.success ? parsed.data.goal : "find useful market data";

  // In live mode, make sure providers + listings exist on-chain (one-time).
  if (LIVE && store.services.some((s) => s.onchainListingId === undefined)) {
    await provisionProviders();
  }

  // 1. Discover + decide (the only AI step).
  const available = store.services.filter((s) => s.providerAgentId !== id);
  const { service, reason } = await chooseService(goal, available);
  addEvent({ agentId: id, type: "discovered", message: `Discovered "${service.title}" — ${reason}` });

  // 2. Purchase autonomously (delegation-enforced).
  try {
    const job = await executePurchase(id, service.id);
    return NextResponse.json({ job, service, reason });
  } catch (err) {
    if (err instanceof SpendingLimitError) {
      return NextResponse.json({ error: err.message, blocked: true }, { status: 402 });
    }
    throw err;
  }
}
