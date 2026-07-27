import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/server/auth";
import { isStellarConfigured } from "@/lib/stellar/client";
import { store, addEvent, persist } from "@/lib/demo-store";
import { isCatalogProvider } from "@/lib/marketplace-catalog";
import { executePurchase, SpendingLimitError } from "@/lib/server/payments";
import { chooseService } from "@/lib/ai/orchestrator";
import { DEMO_BUYERS } from "@/lib/server/demo-seed";
import type { Agent, Delegation, Service } from "@/lib/types";

export const maxDuration = 180;

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
const DEMO_BUYER_IDS = DEMO_BUYERS.map((b) => b.id);
const DEMO_DAILY_LIMIT = 25;

function pickDemoBuyer(): Agent | undefined {
  for (const id of DEMO_BUYER_IDS) {
    const agent = store.agents.find((a) => a.id === id);
    if (agent) return agent;
  }
  return store.agents.find(
    (a) =>
      store.agentSecrets[a.id] &&
      !isCatalogProvider(a.id) &&
      !a.id.startsWith("agent-demo-"),
  );
}

function ensureDemoDelegation(buyerId: string): Delegation {
  const prev = store.delegations[buyerId];
  const delegation: Delegation = {
    agentId: buyerId,
    dailyLimit: DEMO_DAILY_LIMIT,
    spentToday: 0,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    status: "active",
    onchainLive: DEMO_MODE ? prev?.onchainLive : prev?.onchainLive ?? false,
  };
  store.delegations[buyerId] = delegation;
  return delegation;
}

function affordableCatalogServices(delegation: Delegation): Service[] {
  const remaining = delegation.dailyLimit - delegation.spentToday;
  return store.services.filter(
    (s) => isCatalogProvider(s.providerAgentId) && s.price <= remaining,
  );
}

/**
 * One-click E2E demo: reset buyer budget, pick 3 marketplace services, pay.
 */
export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!DEMO_MODE && !isStellarConfigured()) {
    return NextResponse.json(
      { error: "Stellar is not configured — set contract IDs in .env.local or enable demo mode." },
      { status: 400 },
    );
  }

  try {
    const buyer = pickDemoBuyer();
    if (!buyer) {
      return NextResponse.json(
        {
          error:
            "No buyer agent found. Run npm run demo:seed or create an agent on the dashboard.",
        },
        { status: 400 },
      );
    }

    const delegation = ensureDemoDelegation(buyer.id);
    let availableServices = affordableCatalogServices(delegation);

    if (availableServices.length === 0) {
      return NextResponse.json(
        { error: "No marketplace services available. Restart the dev server to merge the catalog." },
        { status: 400 },
      );
    }

    addEvent({
      agentId: buyer.id,
      type: "discovered",
      message: `🚀 E2E demo started with ${buyer.name} (${DEMO_DAILY_LIMIT} USDC budget reset).`,
    });

    const goals = [
      "I need image generation for a landing page",
      "Please generate JSON schema from my description",
      "I need to analyze and summarize customer feedback",
    ];

    const purchases: Array<Record<string, unknown>> = [];

    for (let i = 0; i < Math.min(3, goals.length); i++) {
      const goal = goals[i];
      availableServices = affordableCatalogServices(delegation);
      if (availableServices.length === 0) break;

      try {
        const { service, reason } = await chooseService(goal, availableServices);
        const provider = store.agents.find((a) => a.id === service.providerAgentId);

        addEvent({
          agentId: buyer.id,
          type: "discovered",
          message: `🔍 Goal: "${goal}" → "${service.title}" (${reason})`,
        });

        const job = await executePurchase(buyer.id, service.id);

        addEvent({
          agentId: buyer.id,
          type: "paid",
          message: `✅ Purchased "${service.title}" for ${service.price} USDC from ${provider?.name ?? "provider"}`,
        });

        purchases.push({
          goalIndex: i + 1,
          goal,
          serviceId: service.id,
          serviceTitle: service.title,
          amount: service.price,
          jobId: job.id,
          status: "success",
        });

        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        const message =
          err instanceof SpendingLimitError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unknown error";
        addEvent({
          agentId: buyer.id,
          type: "blocked",
          message: `❌ Purchase ${i + 1} failed: ${message}`,
        });
        purchases.push({ goalIndex: i + 1, error: message, status: "failed" });
        if (err instanceof SpendingLimitError) break;
      }
    }

    const successful = purchases.filter((p) => p.status === "success").length;

    addEvent({
      agentId: buyer.id,
      type: "delivered",
      message: `🎉 Demo complete! ${successful}/${purchases.length} purchases succeeded.`,
    });

    persist();

    if (successful === 0) {
      return NextResponse.json(
        {
          error:
            purchases[0]?.error ??
            "All purchases failed. In live mode run npm run demo:seed first.",
          purchases,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      buyerId: buyer.id,
      purchases,
      delegationRemaining: delegation.dailyLimit - delegation.spentToday,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Demo flow failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
