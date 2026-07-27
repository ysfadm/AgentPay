import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/server/auth";

export async function POST() {
  const jar = await cookies();
  jar.delete(AUTH_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}

