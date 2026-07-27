import { describe, it, expect } from "vitest";
import { chooseService } from "./orchestrator";
import type { Service } from "../types";

const services: Service[] = [
  {
    id: "data",
    providerAgentId: "p1",
    providerName: "P1",
    providerReputation: 90,
    title: "Real-time Market Data Feed",
    description: "Live crypto and equities prices",
    price: 2,
    category: "data",
  },
  {
    id: "translate",
    providerAgentId: "p2",
    providerName: "P2",
    providerReputation: 80,
    title: "Multilingual Translation",
    description: "Translate text between languages",
    price: 1,
    category: "nlp",
  },
];

describe("chooseService (deterministic mode)", () => {
  it("picks the most relevant service for the goal", async () => {
    const { service } = await chooseService("I need live market data prices", services);
    expect(service.id).toBe("data");
  });

  it("picks the translation service for a translation goal", async () => {
    const { service } = await chooseService("translate this document", services);
    expect(service.id).toBe("translate");
  });

  it("throws when there are no services", async () => {
    await expect(chooseService("anything", [])).rejects.toThrow();
  });
});
