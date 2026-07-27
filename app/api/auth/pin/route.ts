import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, authCookieOptions } from "@/lib/server/auth";
import { getOrCreateUser, setUserPin, userHasPin, verifyUserPin } from "@/lib/server/auth-store";

export async function GET(req: Request) {
  const username = new URL(req.url).searchParams.get("username") ?? "demo";
  getOrCreateUser(username);
  return NextResponse.json({ hasPin: userHasPin(username) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "demo");
  const pin = String(body.pin ?? "");
  const confirmPin = body.confirmPin != null ? String(body.confirmPin) : undefined;

  if (!pin) {
    return NextResponse.json({ error: "Enter your PIN" }, { status: 400 });
  }

  const hasPin = userHasPin(username);

  try {
    if (!hasPin) {
      if (confirmPin === undefined) {
        return NextResponse.json({ error: "Confirm your PIN", needsSetup: true }, { status: 400 });
      }
      if (pin !== confirmPin) {
        return NextResponse.json({ error: "PINs do not match" }, { status: 400 });
      }
      setUserPin(username, pin);
    } else if (!verifyUserPin(username, pin)) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }

    const user = getOrCreateUser(username);
    const jar = await cookies();
    jar.set(AUTH_SESSION_COOKIE, user.username, { ...authCookieOptions(), maxAge: 60 * 60 * 8 });
    return NextResponse.json({ ok: true, username: user.username, createdPin: !hasPin });
  } catch (e) {
    const message = e instanceof Error ? e.message : "PIN login failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
