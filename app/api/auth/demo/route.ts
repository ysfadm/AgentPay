import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, authCookieOptions } from "@/lib/server/auth";

export async function POST() {
  const jar = await cookies();
  jar.set(AUTH_SESSION_COOKIE, "demo", { ...authCookieOptions(), maxAge: 60 * 60 * 8 });
  return NextResponse.json({ ok: true, username: "demo" });
}

