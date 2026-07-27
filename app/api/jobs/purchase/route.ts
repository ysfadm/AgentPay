import { NextResponse } from "next/server";
import { z } from "zod";
import { executePurchase, SpendingLimitError } from "@/lib/server/payments";

export const maxDuration = 120;

const schema = z.object({
  buyerAgentId: z.string().min(1),
  serviceId: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid purchase payload" }, { status: 400 });
  }

  try {
    const job = await executePurchase(parsed.data.buyerAgentId, parsed.data.serviceId);
    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    if (err instanceof SpendingLimitError) {
      return NextResponse.json({ error: err.message, blocked: true }, { status: 402 });
    }
    const message = err instanceof Error ? err.message : "Purchase failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
