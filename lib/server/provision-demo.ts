import { Keypair } from "@stellar/stellar-sdk";
import { store, addEvent, persist } from "@/lib/demo-store";
import { getRelayer } from "@/lib/stellar/client";
import {
  fundWithFriendbot,
  ensureTrustline,
  mintUsdc,
  getUsdcBalance,
  registerAgentOnChain,
  listServiceOnChain,
} from "@/lib/stellar/provision";

/**
 * One-time (idempotent) setup of provider agents + their service listings on-chain.
 * Generates a real keypair per provider, funds it, sets a USDC trustline,
 * registers it in the Registry, and lists each of its services on the Marketplace.
 */
export async function provisionProviders(): Promise<{ provisioned: string[] }> {
  const relayerSecret = getRelayer().secret();
  const provisioned: string[] = [];

  for (const p of store.agents.filter((a) => a.isProvider)) {
    let secret = store.agentSecrets[p.id];
    if (!secret) {
      const kp = Keypair.random();
      secret = kp.secret();
      store.agentSecrets[p.id] = secret;
      p.walletAddress = kp.publicKey();
    }

    await fundWithFriendbot(p.walletAddress);
    await ensureTrustline(secret);
    await registerAgentOnChain(relayerSecret, p.id, p.name).catch(() => {
      /* AgentExists on re-run is fine */
    });

    for (const s of store.services.filter((svc) => svc.providerAgentId === p.id)) {
      if (s.onchainListingId === undefined) {
        s.onchainListingId = await listServiceOnChain(secret, p.id, s.price, s.title);
      }
    }
    provisioned.push(p.id);
  }

  addEvent({ type: "rep_updated", message: `Provisioned ${provisioned.length} providers + listings on-chain.` });
  persist();
  return { provisioned };
}

/** Idempotent: fund, trustline, mint USDC if needed, register on-chain. Safe to call before every purchase. */
export async function ensureBuyerReady(agentId: string, mintAmount = 100): Promise<void> {
  const agent = store.agents.find((a) => a.id === agentId);
  if (!agent) throw new Error("Agent not found");
  const secret = store.agentSecrets[agentId];
  if (!secret) throw new Error("Agent has no on-chain key — recreate the agent");

  const relayerSecret = getRelayer().secret();
  await fundWithFriendbot(agent.walletAddress);
  await ensureTrustline(secret);

  let balance = 0;
  try {
    balance = await getUsdcBalance(agent.walletAddress);
  } catch {
    /* account may not exist yet — mint below */
  }
  if (balance < 1) {
    await mintUsdc(agent.walletAddress, mintAmount);
  }

  await registerAgentOnChain(relayerSecret, agentId, agent.name).catch(() => {});
  persist();
}

/** Fund + trustline + mint USDC + register a buyer agent so it can transact. */
export async function provisionBuyer(agentId: string, mintAmount = 100): Promise<void> {
  await ensureBuyerReady(agentId, mintAmount);
}
