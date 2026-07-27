import { NextResponse } from "next/server";
import { z } from "zod";
import { Keypair } from "@stellar/stellar-sdk";
import { store, addEvent } from "@/lib/demo-store";
import { getAgentTemplate } from "@/lib/agent-templates";
import type { Agent } from "@/lib/types";
import { listBuyerAgents, listPurchasedProviders } from "@/lib/server/agents-query";
import { getAgentListings } from "@/lib/server/list-for-sale";

export async function GET(req: Request) {
  const owner = new URL(req.url).searchParams.get("owner") ?? undefined;
  const agents = listBuyerAgents(owner);
  const purchasedProviders = listPurchasedProviders(owner);
  const listingCounts = Object.fromEntries(
    agents.map((a) => [a.id, getAgentListings(a.id).length]),
  );
  return NextResponse.json({ agents, purchasedProviders, listingCounts });
}

const createSchema = z
  .object({
    name: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    templateId: z.string().optional(),
    ownerAddress: z.string().optional(),
  })
  .refine((d) => d.templateId || d.name, { message: "Provide a name or templateId" });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid agent payload" }, { status: 400 });
  }

  const { ownerAddress, templateId } = parsed.data;
  const template = templateId ? getAgentTemplate(templateId) : undefined;
  if (templateId && !template) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  const name = parsed.data.name?.trim() || template!.name;
  const role = parsed.data.role?.trim() || template!.role;

  // Each agent gets its own Stellar keypair so it can sign its own autonomous
  // transactions. The secret stays server-side.
  const kp = Keypair.random();

  const agent: Agent = {
    id: `agent-${Date.now()}`,
    name,
    role,
    avatarSeed: name.toLowerCase().replace(/\s+/g, ""),
    walletAddress: kp.publicKey(),
    reputationScore: 0,
    jobsCompleted: 0,
    successfulPayments: 0,
    isProvider: false,
  };
  store.agents.unshift(agent);
  store.agentSecrets[agent.id] = kp.secret();
  if (ownerAddress) store.agentOwners[agent.id] = ownerAddress;

  addEvent({ agentId: agent.id, type: "rep_updated", message: `Agent "${name}" created with wallet ${kp.publicKey().slice(0, 6)}…` });

  return NextResponse.json({ agent }, { status: 201 });
}
