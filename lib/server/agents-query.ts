import { store } from "@/lib/demo-store";
import { isCatalogProvider } from "@/lib/marketplace-catalog";
import type { Agent } from "@/lib/types";

function sortAgents(agents: Agent[]): Agent[] {
  return [...agents].sort((a, b) => {
    const aDemo = a.id.startsWith("agent-demo-") ? 0 : 1;
    const bDemo = b.id.startsWith("agent-demo-") ? 0 : 1;
    return aDemo - bDemo || a.name.localeCompare(b.name);
  });
}

/** Buyer agents visible on the dashboard (demo agents always included). */
export function listBuyerAgents(ownerAddress?: string): Agent[] {
  const buyers = store.agents.filter((a) => {
    if (isCatalogProvider(a.id)) return false;
    if (a.id.startsWith("agent-demo-")) return true;
    if (!store.agentSecrets[a.id]) return false;
    if (ownerAddress) {
      const owner = store.agentOwners[a.id];
      if (owner) return owner === ownerAddress;
    }
    return true;
  });
  return sortAgents(buyers);
}

function buyerIdsForOwner(ownerAddress?: string): Set<string> {
  const ids = new Set(listBuyerAgents(ownerAddress).map((a) => a.id));
  if (!ownerAddress) {
    for (const job of store.jobs) ids.add(job.buyerAgentId);
    return ids;
  }
  for (const job of store.jobs) {
    const owner = store.agentOwners[job.buyerAgentId];
    if (owner === ownerAddress) ids.add(job.buyerAgentId);
  }
  return ids;
}

/** Provider agents the user has paid via marketplace purchases. */
export function listPurchasedProviders(ownerAddress?: string): Agent[] {
  const buyerIds = buyerIdsForOwner(ownerAddress);
  const providerIds = new Set<string>();
  for (const job of store.jobs) {
    if (job.status === "completed" && buyerIds.has(job.buyerAgentId)) {
      providerIds.add(job.providerAgentId);
    }
  }
  return sortAgents(store.agents.filter((a) => a.isProvider && providerIds.has(a.id)));
}
