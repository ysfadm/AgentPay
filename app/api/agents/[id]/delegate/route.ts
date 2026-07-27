import { NextResponse } from "next/server";
import { z } from "zod";
import { store, addEvent, fakeTxHash } from "@/lib/demo-store";
import { submitSignedXdr } from "@/lib/stellar/soroban-server";
import type { Delegation } from "@/lib/types";

const schema = z.object({
  dailyLimit: z.number().positive(),
  expiryHours: z.number().positive().max(720),
  // When present, this is the Freighter-signed DelegationManager.grant() tx.
  signedXdr: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = store.agents.find((a) => a.id === id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delegation payload" }, { status: 400 });
  }

  const { dailyLimit, expiryHours, signedXdr } = parsed.data;
  const expiresAt = new Date(Date.now() + expiryHours * 3600_000).toISOString();

  let onchainTxHash: string;
  let live = false;
  if (signedXdr) {
    try {
      onchainTxHash = await submitSignedXdr(signedXdr);
      live = true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "On-chain submission failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } else {
    onchainTxHash = fakeTxHash();
  }

  const delegation: Delegation = {
    agentId: id,
    dailyLimit,
    spentToday: 0,
    expiresAt,
    status: "active",
    onchainTxHash,
    onchainLive: live,
  };
  store.delegations[id] = delegation;

  addEvent({
    agentId: id,
    type: "rep_updated",
    message: `Delegation granted: ${dailyLimit} USDC/day for ${expiryHours}h${live ? " (signed on-chain)" : " (demo)"}.`,
    txHash: onchainTxHash,
  });

  return NextResponse.json({ delegation, live }, { status: 201 });
}

const revokeSchema = z.object({ signedXdr: z.string().optional() });

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!store.agents.find((a) => a.id === id)) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = revokeSchema.safeParse(body ?? {});
  const signedXdr = parsed.success ? parsed.data.signedXdr : undefined;

  let live = false;
  let onchainTxHash: string | undefined;
  if (signedXdr) {
    try {
      onchainTxHash = await submitSignedXdr(signedXdr);
      live = true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "On-chain revoke failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  delete store.delegations[id];
  addEvent({
    agentId: id,
    type: "blocked",
    message: `Delegation revoked${live ? " on-chain" : " (demo)"} — agent can no longer spend.`,
    txHash: onchainTxHash,
  });

  return NextResponse.json({ ok: true, live, txHash: onchainTxHash });
}
