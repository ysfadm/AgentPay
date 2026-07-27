/**
 * One-shot setup for a polished demo video: named buyer agents, on-chain funding,
 * USDC, delegations, and a sample payment on the hero agent.
 */
import { Keypair } from "@stellar/stellar-sdk";
import { store, addEvent, persist } from "@/lib/demo-store";
import { getRelayer } from "@/lib/stellar/client";
import { grantWithKeypair, getUsdcBalance } from "@/lib/stellar/provision";
import { ensureBuyerReady, provisionProviders } from "./provision-demo";
import { executePurchase } from "./payments";
import type { Agent, Delegation } from "@/lib/types";

export const DEMO_BUYERS: Array<Pick<Agent, "id" | "name" | "role" | "avatarSeed">> = [
  {
    id: "agent-demo-research",
    name: "Research Agent",
    role: "Hero demo agent — buys market data autonomously",
    avatarSeed: "research",
  },
  {
    id: "agent-demo-scout",
    name: "Budget Scout",
    role: "Multi-step demo — spends until the daily limit blocks",
    avatarSeed: "scout",
  },
  {
    id: "agent-demo-analyst",
    name: "Market Analyst",
    role: "Purchases NLP services from the marketplace",
    avatarSeed: "analyst",
  },
];

export interface DemoSeedResult {
  providers: string[];
  agents: Array<{ id: string; name: string; walletAddress: string; balance: number; dailyLimit: number }>;
  sampleJob?: { id: string; txHash?: string };
}

/** Reset demo buyer state before re-seeding; user-created agents are kept. */
function resetDemoBuyerState() {
  const demoIds = new Set(DEMO_BUYERS.map((a) => a.id));
  for (const id of Object.keys(store.delegations)) {
    if (demoIds.has(id)) delete store.delegations[id];
  }
}

function upsertDemoAgent(spec: (typeof DEMO_BUYERS)[number]): Agent {
  let agent = store.agents.find((a) => a.id === spec.id);
  if (!agent) {
    const kp = Keypair.random();
    agent = {
      ...spec,
      walletAddress: kp.publicKey(),
      reputationScore: 0,
      jobsCompleted: 0,
      successfulPayments: 0,
      isProvider: false,
    };
    store.agents.unshift(agent);
    store.agentSecrets[spec.id] = kp.secret();
  } else {
    agent.name = spec.name;
    agent.role = spec.role;
    agent.avatarSeed = spec.avatarSeed;
    if (!store.agentSecrets[spec.id]) {
      const kp = Keypair.random();
      store.agentSecrets[spec.id] = kp.secret();
      agent.walletAddress = kp.publicKey();
    }
  }
  return agent;
}

async function grantDemoDelegation(agentId: string, dailyLimit: number): Promise<Delegation> {
  const agent = store.agents.find((a) => a.id === agentId)!;
  const expiryHours = 48;
  const expiresAtUnix = Math.floor(Date.now() / 1000) + expiryHours * 3600;
  const txHash = await grantWithKeypair(
    getRelayer().secret(),
    agent.walletAddress,
    dailyLimit,
    expiresAtUnix
  );
  const delegation: Delegation = {
    agentId,
    dailyLimit,
    spentToday: 0,
    expiresAt: new Date(expiresAtUnix * 1000).toISOString(),
    status: "active",
    onchainTxHash: txHash,
    onchainLive: true,
  };
  store.delegations[agentId] = delegation;
  return delegation;
}

/** Prepare the full demo: providers, 3 buyer agents, funding, grants, one sample payment. */
export async function seedDemoVideo(): Promise<DemoSeedResult> {
  resetDemoBuyerState();
  store.events = [
    {
      id: "evt-demo-start",
      type: "rep_updated",
      message: "Preparing demo agents for Stellar Testnet…",
      createdAt: new Date().toISOString(),
    },
  ];

  for (const spec of DEMO_BUYERS) upsertDemoAgent(spec);

  const { provisioned } = await provisionProviders();

  const relayer = getRelayer().publicKey();
  const limits: Record<string, number> = {
    "agent-demo-research": 10,
    "agent-demo-scout": 6,
    "agent-demo-analyst": 10,
  };

  const agents: DemoSeedResult["agents"] = [];
  for (const spec of DEMO_BUYERS) {
    await ensureBuyerReady(spec.id, 100);
    const delegation = await grantDemoDelegation(spec.id, limits[spec.id] ?? 10);
    const balance = await getUsdcBalance(store.agents.find((a) => a.id === spec.id)!.walletAddress);
    store.agentOwners[spec.id] = relayer;
    agents.push({
      id: spec.id,
      name: spec.name,
      walletAddress: store.agents.find((a) => a.id === spec.id)!.walletAddress,
      balance,
      dailyLimit: delegation.dailyLimit,
    });
    addEvent({
      agentId: spec.id,
      type: "rep_updated",
      message: `${spec.name} ready: ${balance} USDC, ${delegation.dailyLimit} USDC/day delegation on-chain.`,
      txHash: delegation.onchainTxHash,
    });
  }

  let sampleJob: DemoSeedResult["sampleJob"];
  try {
    const job = await executePurchase("agent-demo-research", "svc-market-data");
    sampleJob = { id: job.id, txHash: job.stellarTxHash };
  } catch {
    /* non-fatal — agents are still usable */
  }

  addEvent({
    type: "rep_updated",
    message: "Demo ready — open Research Agent and press Run, or use Budget Scout for multi-step spending.",
  });
  persist();

  return { providers: provisioned, agents, sampleJob };
}
