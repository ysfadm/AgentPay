import { store, addEvent, fakeTxHash } from "../demo-store";
import type { Job } from "../types";
import { purchaseOnChain } from "../stellar/provision";
import { ensureBuyerReady, provisionProviders } from "./provision-demo";

const LIVE = process.env.NEXT_PUBLIC_DEMO_MODE === "false";

export class SpendingLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpendingLimitError";
  }
}

/**
 * Execute an agent-to-agent purchase: enforce the delegation allowance,
 * settle USDC on Stellar, bump provider reputation, and emit events.
 *
 * Falls back to the in-memory demo store when contracts aren't deployed yet,
 * but the control flow (allowance check -> pay -> reputation) is identical.
 */
export async function executePurchase(buyerAgentId: string, serviceId: string): Promise<Job> {
  const buyer = store.agents.find((a) => a.id === buyerAgentId);
  const service = store.services.find((s) => s.id === serviceId);
  if (!buyer) throw new Error("Buyer agent not found");
  if (!service) throw new Error("Service not found");

  const provider = store.agents.find((a) => a.id === service.providerAgentId);
  if (!provider) throw new Error("Provider agent not found");

  // 1. Enforce delegation (this is what the Delegation Manager contract guarantees on-chain).
  const delegation = store.delegations[buyerAgentId];
  if (!delegation || delegation.status !== "active") {
    throw new SpendingLimitError("No active spending delegation for this agent.");
  }
  if (new Date(delegation.expiresAt).getTime() < Date.now()) {
    delegation.status = "expired";
    throw new SpendingLimitError("Delegation has expired.");
  }
  if (delegation.spentToday + service.price > delegation.dailyLimit) {
    addEvent({
      agentId: buyerAgentId,
      type: "blocked",
      message: `Blocked: ${service.price} USDC exceeds remaining daily limit (${(
        delegation.dailyLimit - delegation.spentToday
      ).toFixed(2)} USDC left).`,
    });
    throw new SpendingLimitError(
      `Spending limit exceeded. Remaining: ${(delegation.dailyLimit - delegation.spentToday).toFixed(2)} USDC.`
    );
  }

  addEvent({ agentId: buyerAgentId, type: "requested", message: `Requested "${service.title}" from ${provider.name}.` });

  // 2. Settle on Stellar (atomic check_and_spend + transfer + record_job on-chain).
  let txHash: string;
  if (LIVE) {
    const buyerSecret = store.agentSecrets[buyerAgentId];
    if (!buyerSecret) throw new Error("Buyer agent has no on-chain key");
    if (!delegation.onchainLive) {
      throw new SpendingLimitError(
        "Delegation is not on-chain yet. Open the agent page and Approve with Freighter."
      );
    }

    // Ensure marketplace listings + buyer wallet exist on Testnet (idempotent).
    if (store.services.some((s) => s.onchainListingId === undefined)) {
      await provisionProviders();
    }
    const listing = store.services.find((s) => s.id === serviceId);
    if (!listing?.onchainListingId) {
      throw new Error("Service is not listed on-chain yet — run npm run demo:warmup");
    }

    await ensureBuyerReady(buyerAgentId);
    try {
      txHash = await purchaseOnChain(buyerSecret, buyerAgentId, listing.onchainListingId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/check_and_spend|Error\(Contract, #2\)|NoAllowance/i.test(msg)) {
        throw new SpendingLimitError(
          "On-chain delegation missing or expired. Approve with Freighter on the agent page."
        );
      }
      if (/account not found|NotFound/i.test(msg)) {
        throw new Error("Agent wallet is not funded on Testnet yet — try again in a few seconds.");
      }
      throw e;
    }
  } else {
    txHash = fakeTxHash(); // demo fallback
  }

  // 3. Update local state to mirror chain.
  delegation.spentToday += service.price;
  provider.jobsCompleted += 1;
  provider.successfulPayments += 1;
  provider.reputationScore = Math.min(
    100,
    Math.round((provider.successfulPayments / provider.jobsCompleted) * 100)
  );

  const job: Job = {
    id: `job-${Date.now()}`,
    serviceId: service.id,
    buyerAgentId,
    providerAgentId: provider.id,
    amount: service.price,
    status: "completed",
    stellarTxHash: txHash,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
  store.jobs.unshift(job);

  addEvent({ agentId: buyerAgentId, type: "paid", message: `Paid ${service.price} USDC to ${provider.name}.`, txHash });
  addEvent({ agentId: provider.id, type: "delivered", message: `${provider.name} delivered "${service.title}".` });
  addEvent({ agentId: provider.id, type: "rep_updated", message: `${provider.name} reputation → ${provider.reputationScore}.` });

  return job;
}
