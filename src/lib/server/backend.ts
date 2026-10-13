// Server-only helpers shared by the Next.js route handlers under src/app/api.
// Never import this module from client components: it reads server environment
// variables and owns the HttpOnly session cookie.
import type { NextRequest, NextResponse } from "next/server";

// Local backend for `npm run dev` and tests only (same value as .env.example).
const DEVELOPMENT_API_URL = "http://localhost:5080";

export const ACCESS_COOKIE = "alpha_access";
const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;

let misconfigurationLogged = false;

/**
 * The backend origin from ALPHA_API_URL. A production server has no fallback:
 * a missing or invalid value must never silently send users' requests (and
 * session tokens) to another environment. Callers answer 503 instead.
 */
function backendOrigin(): string | null {
  const configured = process.env.ALPHA_API_URL?.trim();
  const value = configured || (process.env.NODE_ENV === "production" ? "" : DEVELOPMENT_API_URL);
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return `${url.origin}${url.pathname}`.replace(/\/$/, "");
  } catch {
    // Reported below.
  }
  if (!misconfigurationLogged) {
    misconfigurationLogged = true;
    console.error("ALPHA_API_URL is missing or is not an http(s) URL; backend requests are refused.");
  }
  return null;
}

/** Absolute backend URL for an `api/...` path, or null when the backend is not configured. */
export function backendUrl(path: string, search = ""): URL | null {
  const origin = backendOrigin();
  if (!origin) return null;
  const url = new URL(path, `${origin}/`);
  url.search = search;
  return url;
}

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge };
}

export function setAccessCookie(response: NextResponse, token: string) {
  response.cookies.set(ACCESS_COOKIE, token, cookieOptions(ACCESS_COOKIE_MAX_AGE_SECONDS));
}

export function clearAccessCookie(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", cookieOptions(0));
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defense in depth on top of the SameSite=Strict cookie: state-changing
 * requests must originate from this site. Mirrors the Next.js Server Actions
 * origin check (Origin host vs. X-Forwarded-Host/Host).
 */
export function isCrossSiteRequest(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return !host || new URL(origin).host !== host.split(",")[0].trim();
  } catch {
    return true;
  }
}
