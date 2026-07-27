import { NextResponse } from "next/server";
import { store, addEvent } from "@/lib/demo-store";
import { readOnChainReputation } from "@/lib/stellar/provision";
import { getAgentListings, isUserOwnedAgent } from "@/lib/server/list-for-sale";
import { isCatalogProvider } from "@/lib/marketplace-catalog";

const LIVE = process.env.NEXT_PUBLIC_DEMO_MODE === "false";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = store.agents.find((a) => a.id === id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const delegation = store.delegations[id] ?? null;
  const jobs = store.jobs.filter((j) => j.buyerAgentId === id || j.providerAgentId === id);
  const listings = getAgentListings(id);

  const onchainReputation = LIVE ? await readOnChainReputation(id) : null;

  return NextResponse.json({
    agent,
    delegation,
    jobs,
    listings,
    onchainReputation,
    canList: isUserOwnedAgent(id),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idx = store.agents.findIndex((a) => a.id === id);
  if (idx === -1) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  if (isCatalogProvider(id)) {
    return NextResponse.json({ error: "Built-in marketplace agents cannot be deleted" }, { status: 400 });
  }
  if (id.startsWith("agent-demo-")) {
    return NextResponse.json({ error: "Demo agents are protected — run npm run demo:seed to reset" }, { status: 400 });
  }
  if (!isUserOwnedAgent(id)) {
    return NextResponse.json({ error: "Agent cannot be deleted" }, { status: 400 });
  }

  const name = store.agents[idx].name;
  store.agents.splice(idx, 1);
  delete store.delegations[id];
  delete store.agentSecrets[id];
  delete store.agentOwners[id];
  store.services = store.services.filter((s) => s.providerAgentId !== id);
  store.jobs = store.jobs.filter((j) => j.buyerAgentId !== id && j.providerAgentId !== id);

  addEvent({ type: "rep_updated", message: `Agent "${name}" removed.` });
  return NextResponse.json({ ok: true });
}
