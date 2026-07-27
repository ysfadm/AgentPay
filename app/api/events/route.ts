import { NextResponse } from "next/server";
import { store } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ events: store.events.slice(0, 50) });
}
