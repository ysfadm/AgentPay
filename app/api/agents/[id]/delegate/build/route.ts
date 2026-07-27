import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/demo-store";
import { buildGrantTx } from "@/lib/stellar/soroban-server";

const schema = z.object({
  ownerAddress: z.string().min(1),
  dailyLimit: z.number().positive(),
  expiryHours: z.number().positive().max(720),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = store.agents.find((a) => a.id === id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + parsed.data.expiryHours * 3600;

  try {
    const xdr = await buildGrantTx({
      ownerAddress: parsed.data.ownerAddress,
      agentAddress: agent.walletAddress,
      dailyLimit: parsed.data.dailyLimit,
      expiresAt,
    });
    store.agentOwners[id] = parsed.data.ownerAddress;
    return NextResponse.json({ xdr, expiresAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
