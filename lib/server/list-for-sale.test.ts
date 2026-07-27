import { describe, it, expect, beforeEach } from "vitest";
import { store } from "../demo-store";
import { listAgentForSale, assertCanListAgent } from "./list-for-sale";

beforeEach(() => {
  store.agents = [
    {
      id: "agent-user",
      name: "My Agent",
      role: "Does work",
      avatarSeed: "u",
      walletAddress: "GUSER",
      reputationScore: 0,
      jobsCompleted: 0,
      successfulPayments: 0,
      isProvider: false,
    },
  ];
  store.services = [];
  store.agentSecrets = { "agent-user": "SSECRETKEY000000000000000000000000000000000000000000" };
  store.agentOwners = { "agent-user": "GOWNER" };
});

describe("listAgentForSale", () => {
  it("creates a marketplace listing for a user agent", async () => {
    const service = await listAgentForSale("agent-user", {
      title: "My Service",
      description: "Does stuff",
      price: 2,
      category: "general",
      ownerAddress: "GOWNER",
    });
    expect(service.providerAgentId).toBe("agent-user");
    expect(store.services).toHaveLength(1);
    expect(store.agents[0].isProvider).toBe(true);
  });

  it("rejects listing catalog providers", () => {
    store.agents.push({
      id: "agent-data",
      name: "Data Provider",
      role: "sells data",
      avatarSeed: "d",
      walletAddress: "GDATA",
      reputationScore: 90,
      jobsCompleted: 10,
      successfulPayments: 9,
      isProvider: true,
    });
    expect(() => assertCanListAgent("agent-data")).toThrow(/cannot be re-listed/i);
  });

  it("rejects listing by wrong owner", () => {
    expect(() =>
      assertCanListAgent("agent-user", "GOTHER"),
    ).toThrow(/only list agents you own/i);
  });
});
