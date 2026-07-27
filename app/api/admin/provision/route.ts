import { NextResponse } from "next/server";
import { provisionProviders } from "@/lib/server/provision-demo";
import { isStellarConfigured } from "@/lib/stellar/client";
import { isAdminAuthorized } from "@/lib/server/auth";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStellarConfigured()) {
    return NextResponse.json({ error: "Stellar is not configured (contract IDs / relayer secret)" }, { status: 400 });
  }
  try {
    const result = await provisionProviders();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Provisioning failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
