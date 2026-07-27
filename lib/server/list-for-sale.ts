import { store, addEvent, persist } from "@/lib/demo-store";
import { isCatalogProvider } from "@/lib/marketplace-catalog";
import {
  fundWithFriendbot,
  ensureTrustline,
  registerAgentOnChain,
  listServiceOnChain,
} from "@/lib/stellar/provision";
import { getRelayer } from "@/lib/stellar/client";
import type { Agent, Service } from "@/lib/types";

const LIVE = process.env.NEXT_PUBLIC_DEMO_MODE === "false";

export interface ListForSaleInput {
  title: string;
  description: string;
  price: number;
  category: string;
  ownerAddress?: string;
}

export function assertCanListAgent(agentId: string, ownerAddress?: string): Agent {
  const agent = store.agents.find((a) => a.id === agentId);
  if (!agent) throw new Error("Agent not found");
  if (isCatalogProvider(agentId)) throw new Error("Built-in marketplace agents cannot be re-listed");
  if (agentId.startsWith("agent-demo-")) throw new Error("Demo agents cannot be listed for sale");

  const owner = store.agentOwners[agentId];
  if (ownerAddress && owner && owner !== ownerAddress) {
    throw new Error("You can only list agents you own");
  }
  if (!store.agentSecrets[agentId]) {
    throw new Error("Agent has no wallet — recreate the agent first");
  }
  return agent;
}

export async function listAgentForSale(
  agentId: string,
  input: ListForSaleInput,
): Promise<Service> {
  const agent = assertCanListAgent(agentId, input.ownerAddress);
  const secret = store.agentSecrets[agentId]!;

  if (LIVE) {
    await fundWithFriendbot(agent.walletAddress);
    await ensureTrustline(secret);
    await registerAgentOnChain(getRelayer().secret(), agentId, agent.name).catch(() => {});
  }

  let onchainListingId: number | undefined;
  if (LIVE) {
    onchainListingId = await listServiceOnChain(secret, agentId, input.price, input.title);
  }

  agent.isProvider = true;
  const service: Service = {
    id: `svc-${Date.now()}`,
    providerAgentId: agent.id,
    providerName: agent.name,
    providerReputation: agent.reputationScore,
    title: input.title,
    description: input.description,
    price: input.price,
    category: input.category,
    onchainListingId,
  };

  store.services.unshift(service);
  addEvent({
    agentId: agent.id,
    type: "rep_updated",
    message: `Listed on marketplace: "${input.title}" for ${input.price} USDC.`,
  });
  persist();
  return service;
}

export function getAgentListings(agentId: string): Service[] {
  return store.services.filter((s) => s.providerAgentId === agentId);
}

export function isUserOwnedAgent(agentId: string): boolean {
  if (isCatalogProvider(agentId) || agentId.startsWith("agent-demo-")) return false;
  return Boolean(store.agentSecrets[agentId]);
}
