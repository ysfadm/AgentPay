import { NextResponse, type NextRequest } from "next/server";

const AUTH_SESSION_COOKIE = "agentpay_session";
const protectedPrefixes = ["/dashboard", "/marketplace", "/activity", "/agents"];

export function middleware(req: NextRequest) {
  const isProtected = protectedPrefixes.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const session = req.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (session) return NextResponse.next();

  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/marketplace/:path*", "/activity/:path*", "/agents/:path*"],
};

