import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/server/auth";

export async function GET() {
  const jar = await cookies();
  const username = jar.get(AUTH_SESSION_COOKIE)?.value ?? null;
  // In dev (no ADMIN_TOKEN), everyone is admin for demo purposes
  const isAdmin = !process.env.ADMIN_TOKEN;
  return NextResponse.json({
    authenticated: Boolean(username),
    username,
    isAdmin,
  });
}
