import { NextResponse } from "next/server";
import { isStellarConfigured } from "@/lib/stellar/client";
import { isAdminAuthorized } from "@/lib/server/auth";
import { seedDemoVideo } from "@/lib/server/demo-seed";

export const maxDuration = 180;

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStellarConfigured()) {
    return NextResponse.json({ error: "Stellar is not configured" }, { status: 400 });
  }
  try {
    const result = await seedDemoVideo();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Demo seed failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
