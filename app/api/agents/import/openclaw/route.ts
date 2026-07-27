import { NextResponse } from "next/server";
import { z } from "zod";
import { Keypair } from "@stellar/stellar-sdk";
import { store, addEvent } from "@/lib/demo-store";
import { getOpenClawAgent, OPENCLAW_CATALOG } from "@/lib/openclaw-import";
import type { Agent } from "@/lib/types";

/** Simulated latency so the import feels like a real sync. */
const IMPORT_DELAY_MS = 1200;

export async function GET() {
  const importedIds = new Set(
    store.agents.filter((a) => a.openclawId).map((a) => a.openclawId!),
  );
  const agents = OPENCLAW_CATALOG.map((a) => ({
    ...a,
    imported: importedIds.has(a.id),
  }));
  return NextResponse.json({ workspace: "my-openclaw-workspace", agents });
}

const importSchema = z.object({
  openclawId: z.string().min(1),
  ownerAddress: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import payload" }, { status: 400 });
  }

  const external = getOpenClawAgent(parsed.data.openclawId);
  if (!external) {
    return NextResponse.json({ error: "OpenClaw agent not found in workspace" }, { status: 404 });
  }

  const already = store.agents.find((a) => a.openclawId === external.id);
  if (already) {
    return NextResponse.json(
      { error: "Already imported", agent: already },
      { status: 409 },
    );
  }

  await new Promise((r) => setTimeout(r, IMPORT_DELAY_MS));

  const kp = Keypair.random();
  const agent: Agent = {
    id: `agent-${Date.now()}`,
    name: external.name,
    role: `${external.role} (imported via OpenClaw)`,
    avatarSeed: external.id,
    walletAddress: kp.publicKey(),
    reputationScore: 0,
    jobsCompleted: 0,
    successfulPayments: 0,
    isProvider: false,
    source: "openclaw",
    openclawId: external.id,
  };

  store.agents.unshift(agent);
  store.agentSecrets[agent.id] = kp.secret();
  if (parsed.data.ownerAddress) store.agentOwners[agent.id] = parsed.data.ownerAddress;

  addEvent({
    agentId: agent.id,
    type: "discovered",
    message: `Imported "${external.name}" from OpenClaw workspace · skills: ${external.skills.join(", ")}`,
  });
  addEvent({
    agentId: agent.id,
    type: "rep_updated",
    message: `OpenClaw agent linked to Stellar wallet ${kp.publicKey().slice(0, 6)}…`,
  });

  return NextResponse.json({ agent, openclaw: external }, { status: 201 });
}
