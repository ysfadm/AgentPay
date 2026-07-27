import { describe, it, expect, beforeEach } from "vitest";
import { store } from "../demo-store";
import { executePurchase, SpendingLimitError } from "./payments";

function activeDelegation(dailyLimit: number, spentToday = 0) {
  return {
    agentId: "buyer",
    dailyLimit,
    spentToday,
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    status: "active" as const,
    onchainTxHash: "demo",
  };
}

function reset() {
  store.agents = [
    {
      id: "buyer",
      name: "Buyer",
      role: "buys things",
      avatarSeed: "buyer",
      walletAddress: "GBUYER",
      reputationScore: 0,
      jobsCompleted: 0,
      successfulPayments: 0,
      isProvider: false,
    },
    {
      id: "prov",
      name: "Provider",
      role: "sells data",
      avatarSeed: "prov",
      walletAddress: "GPROV",
      reputationScore: 50,
      jobsCompleted: 10,
      successfulPayments: 8,
      isProvider: true,
    },
  ];
  store.services = [
    {
      id: "svc",
      providerAgentId: "prov",
      providerName: "Provider",
      providerReputation: 50,
      title: "Data",
      description: "data feed",
      price: 2,
      category: "data",
    },
  ];
  store.delegations = {};
  store.jobs = [];
  store.events = [];
  store.agentSecrets = {};
  store.agentOwners = {};
}

describe("executePurchase (demo mode)", () => {
  beforeEach(reset);

  it("settles a purchase within the delegation limit and bumps reputation", async () => {
    store.delegations["buyer"] = activeDelegation(10);
    const job = await executePurchase("buyer", "svc");

    expect(job.status).toBe("completed");
    expect(job.amount).toBe(2);
    expect(store.delegations["buyer"].spentToday).toBe(2);
    expect(store.agents.find((a) => a.id === "prov")!.jobsCompleted).toBe(11);
    expect(store.jobs).toHaveLength(1);
  });

  it("blocks a purchase that exceeds the daily limit", async () => {
    store.delegations["buyer"] = activeDelegation(1);
    await expect(executePurchase("buyer", "svc")).rejects.toBeInstanceOf(SpendingLimitError);
    expect(store.jobs).toHaveLength(0);
  });

  it("blocks when there is no active delegation", async () => {
    await expect(executePurchase("buyer", "svc")).rejects.toBeInstanceOf(SpendingLimitError);
  });

  it("blocks when the delegation has expired", async () => {
    store.delegations["buyer"] = {
      ...activeDelegation(10),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    await expect(executePurchase("buyer", "svc")).rejects.toBeInstanceOf(SpendingLimitError);
  });
});
