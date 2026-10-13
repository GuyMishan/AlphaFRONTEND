import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, backendUrl, clearAccessCookie, isCrossSiteRequest } from "@/lib/server/backend";

const BACKEND_LOGOUT_TIMEOUT_MS = 10_000;

/**
 * Ends the browser session: revokes the server-side UserSession through the
 * backend (POST /api/auth/logout) and then clears the HttpOnly cookie. The
 * cookie is cleared even when revocation fails (expired session, network),
 * because the backend already rejects expired or revoked sessions.
 */
export async function POST(request: NextRequest) {
  if (isCrossSiteRequest(request)) {
    return NextResponse.json({ status: 403, title: "הבקשה נחסמה" }, { status: 403 });
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const logoutUrl = backendUrl("api/auth/logout");
  let revoked = false;
  if (token && logoutUrl) {
    try {
      const response = await fetch(logoutUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(BACKEND_LOGOUT_TIMEOUT_MS),
      });
      revoked = response.ok;
    } catch {
      // Best effort; the cookie is still cleared below.
    }
  }

  const response = NextResponse.json({ ok: true, revoked }, { headers: { "cache-control": "no-store" } });
  clearAccessCookie(response);
  return response;
}
