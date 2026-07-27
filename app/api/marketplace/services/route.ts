import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/demo-store";
import type { Service } from "@/lib/types";

export async function GET() {
  const providers = store.agents
    .filter((a) => a.isProvider)
    .sort((a, b) => b.reputationScore - a.reputationScore);
  const services = [...store.services].sort(
    (a, b) => b.providerReputation - a.providerReputation || a.price - b.price,
  );
  return NextResponse.json({ services, providers });
}

const schema = z.object({
  providerAgentId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  price: z.number().positive(),
  category: z.string().default("general"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid service payload" }, { status: 400 });
  }
  const provider = store.agents.find((a) => a.id === parsed.data.providerAgentId);
  if (!provider) return NextResponse.json({ error: "Provider agent not found" }, { status: 404 });

  const { title, description, price, category } = parsed.data;
  const service: Service = {
    id: `svc-${Date.now()}`,
    providerAgentId: provider.id,
    providerName: provider.name,
    providerReputation: provider.reputationScore,
    title,
    description,
    price,
    category,
  };
  provider.isProvider = true;
  store.services.unshift(service);
  return NextResponse.json({ service }, { status: 201 });
}
