import { NextRequest, NextResponse } from "next/server";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const DEFAULT_API_URL = "https://alphabackend-s9h0.onrender.com";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const baseUrl = process.env.ALPHA_API_URL ?? DEFAULT_API_URL;
  const url = new URL(path.join("/"), `${baseUrl.replace(/\/$/, "")}/`);
  url.search = request.nextUrl.search;

  const headers = new Headers();
  const cookieToken = request.cookies.get("alpha_access")?.value;
  const userId = request.headers.get("x-alpha-user-id");
  const platformAdmin = request.headers.get("x-alpha-platform-admin");
  const contentType = request.headers.get("content-type");
  if (cookieToken) headers.set("Authorization", `Bearer ${cookieToken}`);
  if (userId) headers.set("X-User-Id", userId);
  if (platformAdmin) headers.set("X-Platform-Admin", platformAdmin);
  if (contentType) headers.set("Content-Type", contentType);

  const body = request.method === "GET" ? undefined : await request.arrayBuffer();
  try {
    const response = await fetch(url, { method: request.method, headers, body, cache: "no-store" });
    // Auth verification is the only endpoint allowed to convert a bearer token into an HttpOnly session cookie.
    if (path.join("/") === "api/auth/otp/verify" && response.ok) {
      const payload = await response.json() as { accessToken?: string; [key: string]: unknown };
      if (payload.accessToken) {
        const { accessToken, ...safePayload } = payload;
        const next = NextResponse.json(safePayload, { status: response.status });
        next.cookies.set("alpha_access", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 12 });
        return next;
      }
    }
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({
      title: "השירות אינו זמין",
      detail: "לא ניתן להתחבר כרגע לשירות המערכת. נסו שוב בעוד מספר רגעים.",
    }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

void METHODS;
