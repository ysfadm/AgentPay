import { describe, it, expect, beforeEach } from "vitest";
import { store } from "../demo-store";
import { listBuyerAgents, listPurchasedProviders } from "./agents-query";

beforeEach(() => {
  store.agents = [
    {
      id: "agent-demo-research",
      name: "Research Agent",
      role: "demo",
      avatarSeed: "r",
      walletAddress: "GDEMO",
      reputationScore: 0,
      jobsCompleted: 0,
      successfulPayments: 0,
      isProvider: false,
    },
    {
      id: "agent-user",
      name: "My Agent",
      role: "buyer",
      avatarSeed: "u",
      walletAddress: "GUSER",
      reputationScore: 0,
      jobsCompleted: 0,
      successfulPayments: 0,
      isProvider: false,
    },
    {
      id: "agent-data",
      name: "Data Provider",
      role: "sells data",
      avatarSeed: "d",
      walletAddress: "GDATA",
      reputationScore: 90,
      jobsCompleted: 10,
      successfulPayments: 9,
      isProvider: true,
    },
  ];
  store.agentOwners = {
    "agent-user": "GOWNER",
    "agent-demo-research": "GRELAYER",
  };
  store.agentSecrets = {
    "agent-user": "SSECRET",
    "agent-demo-research": "DSECRET",
  };
  store.jobs = [
    {
      id: "job-1",
      serviceId: "svc-1",
      buyerAgentId: "agent-user",
      providerAgentId: "agent-data",
      amount: 2,
      status: "completed",
      createdAt: new Date().toISOString(),
    },
  ];
});

describe("listBuyerAgents", () => {
  it("includes demo agents and owner-matched user agents", () => {
    const agents = listBuyerAgents("GOWNER");
    expect(agents.map((a) => a.id)).toEqual(["agent-demo-research", "agent-user"]);
  });

  it("excludes other users' agents when owner is set", () => {
    const agents = listBuyerAgents("GOTHER");
    expect(agents.map((a) => a.id)).toEqual(["agent-demo-research"]);
  });

  it("includes user agents even when listed as providers", () => {
    store.agents.push({
      id: "agent-user-seller",
      name: "My Seller",
      role: "sells things",
      avatarSeed: "sell",
      walletAddress: "GSELL",
      reputationScore: 0,
      jobsCompleted: 0,
      successfulPayments: 0,
      isProvider: true,
    });
    store.agentSecrets["agent-user-seller"] = "SSECRET2";
    store.agentOwners["agent-user-seller"] = "GOWNER";
    const agents = listBuyerAgents("GOWNER");
    expect(agents.some((a) => a.id === "agent-user-seller")).toBe(true);
  });
});

describe("listPurchasedProviders", () => {
  it("returns providers purchased by the owner's agents", () => {
    const providers = listPurchasedProviders("GOWNER");
    expect(providers.map((a) => a.id)).toEqual(["agent-data"]);
  });

  it("returns empty when owner has no purchases", () => {
    expect(listPurchasedProviders("GOTHER")).toEqual([]);
  });
});
