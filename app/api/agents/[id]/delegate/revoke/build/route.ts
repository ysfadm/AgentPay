import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/demo-store";
import { buildRevokeTx } from "@/lib/stellar/soroban-server";

const schema = z.object({ ownerAddress: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = store.agents.find((a) => a.id === id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const xdr = await buildRevokeTx({ ownerAddress: parsed.data.ownerAddress, agentAddress: agent.walletAddress });
    return NextResponse.json({ xdr });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build revoke transaction";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
