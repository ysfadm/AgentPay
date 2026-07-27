import { NextResponse } from "next/server";
import { z } from "zod";
import { listAgentForSale, getAgentListings } from "@/lib/server/list-for-sale";

export const maxDuration = 120;

const schema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  price: z.number().positive(),
  category: z.string().default("general"),
  ownerAddress: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ listings: getAgentListings(id) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid listing payload" }, { status: 400 });
  }

  try {
    const service = await listAgentForSale(id, parsed.data);
    return NextResponse.json({ service }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Listing failed";
    const status = /not found/i.test(message) ? 404 : /own|cannot|recreate/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
