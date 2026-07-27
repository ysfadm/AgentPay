import { NextResponse } from "next/server";
import { z } from "zod";
import { store, addEvent } from "@/lib/demo-store";
import { provisionBuyer } from "@/lib/server/provision-demo";
import { grantWithKeypair, getUsdcBalance } from "@/lib/stellar/provision";
import { getRelayer } from "@/lib/stellar/client";
import type { Delegation } from "@/lib/types";

export const maxDuration = 120;

const schema = z.object({
  mintAmount: z.number().positive().optional(),
  // Optional dev-only on-chain grant (production grant is signed by Freighter).
  grant: z
    .object({ dailyLimit: z.number().positive(), expiryHours: z.number().positive() })
    .optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = store.agents.find((a) => a.id === id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    await provisionBuyer(id, parsed.data.mintAmount ?? 100);

    let delegationTx: string | undefined;
    if (parsed.data.grant) {
      const { dailyLimit, expiryHours } = parsed.data.grant;
      const expiresAt = Math.floor(Date.now() / 1000) + expiryHours * 3600;
      delegationTx = await grantWithKeypair(getRelayer().secret(), agent.walletAddress, dailyLimit, expiresAt);

      const delegation: Delegation = {
        agentId: id,
        dailyLimit,
        spentToday: 0,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        status: "active",
        onchainTxHash: delegationTx,
        onchainLive: true,
      };
      store.delegations[id] = delegation;
      addEvent({ agentId: id, type: "rep_updated", message: `Delegation granted on-chain: ${dailyLimit} USDC/day.`, txHash: delegationTx });
    }

    const balance = await getUsdcBalance(agent.walletAddress);
    return NextResponse.json({ ok: true, balance, walletAddress: agent.walletAddress, delegationTx });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Provisioning failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
