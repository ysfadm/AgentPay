/**
 * Lightweight guard for admin-only endpoints. If ADMIN_TOKEN is set, requests
 * must send a matching `x-admin-token` header. If it's unset (local dev), the
 * endpoint is open for convenience.
 */
export function isAdminAuthorized(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return true;
  return req.headers.get("x-admin-token") === token;
}

export const AUTH_SESSION_COOKIE = "agentpay_session";

export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
