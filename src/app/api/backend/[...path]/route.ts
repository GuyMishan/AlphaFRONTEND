import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, backendUrl, isCrossSiteRequest, setAccessCookie } from "@/lib/server/backend";

const ANONYMOUS_AUTH_PATHS = new Set([
  "api/auth/otp/request",
  "api/auth/otp/verify",
  "api/auth/register/request",
  "api/auth/register/verify",
]);
const SESSION_PATH = "api/auth/session";
const TOKEN_ISSUING_PATHS = new Set(["api/auth/otp/verify", "api/auth/register/verify"]);
// Allow-list: correlation id lets support match a request to backend logs and audit rows.
const FORWARDED_RESPONSE_HEADERS = ["content-type", "content-disposition", "x-correlation-id"];

/** Proxy-generated errors use the backend's Problem Details shape, including `errorCode`. */
function problem(status: number, errorCode: string, title: string, detail: string) {
  return NextResponse.json({ status, title, detail, errorCode }, {
    status,
    headers: { "content-type": "application/problem+json", "cache-control": "no-store" },
  });
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (isCrossSiteRequest(request)) {
    return problem(403, "ACCESS_DENIED", "הבקשה נחסמה", "הבקשה לא נשלחה מתוך המערכת.");
  }

  const { path } = await context.params;
  const backendPath = path.join("/");
  const url = backendUrl(backendPath, request.nextUrl.search);
  if (!url) return problem(503, "SERVICE_UNAVAILABLE", "השירות אינו זמין", "השירות אינו מוגדר כרגע. פנו לתמיכה.");
  // Only the backend API surface is reachable, and never through dot segments.
  if (backendPath.split(/[\\/]/).some((segment) => segment === "." || segment === "..") || !url.pathname.startsWith("/api/")) {
    return problem(404, "RESOURCE_NOT_FOUND", "הכתובת אינה קיימת", "הבקשה אינה מיועדת לשירות המערכת.");
  }

  const headers = new Headers();
  const cookieToken = request.cookies.get(ACCESS_COOKIE)?.value;
  // Without a cookie the session check can only fail: answer here so anonymous
  // visitors do not use the backend's per-IP /api/auth rate limit.
  if (!cookieToken && request.method === "GET" && backendPath === SESSION_PATH) {
    return problem(401, "AUTHENTICATION_REQUIRED", "נדרשת התחברות", "יש להתחבר כדי להמשיך.");
  }
  const contentType = request.headers.get("content-type");
  // Login/registration endpoints are anonymous by design. Never forward a stale
  // session cookie to them: the backend session middleware would reject an
  // expired server session before the anonymous endpoint can issue a new OTP.
  if (cookieToken && !ANONYMOUS_AUTH_PATHS.has(backendPath)) {
    headers.set("Authorization", `Bearer ${cookieToken}`);
  }
  if (contentType) headers.set("Content-Type", contentType);

  const body = request.method === "GET" ? undefined : await request.arrayBuffer();
  try {
    // request.signal propagates browser-side cancellation to the backend call.
    const response = await fetch(url, { method: request.method, headers, body, cache: "no-store", signal: request.signal });
    // Auth verification is the only endpoint allowed to convert a bearer token into an HttpOnly session cookie.
    if (TOKEN_ISSUING_PATHS.has(backendPath) && response.ok) {
      const payload = await response.json() as { accessToken?: string; [key: string]: unknown };
      const { accessToken, ...safePayload } = payload;
      const next = NextResponse.json(safePayload, { status: response.status, headers: { "cache-control": "no-store" } });
      if (accessToken) setAccessCookie(next, accessToken);
      return next;
    }

    const responseHeaders = new Headers({ "cache-control": "no-store" });
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    if (!responseHeaders.has("content-type")) responseHeaders.set("content-type", "application/json");
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    return problem(502, "SERVICE_UNAVAILABLE", "השירות אינו זמין", "לא ניתן להתחבר כרגע לשירות המערכת. נסו שוב בעוד מספר רגעים.");
  }
}

export const dynamic = "force-dynamic";
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
