import { NextRequest, NextResponse } from "next/server";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const DEFAULT_API_URL = "https://alphabackend-s9h0.onrender.com";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const baseUrl = process.env.ALPHA_API_URL ?? DEFAULT_API_URL;
  const url = new URL(path.join("/"), `${baseUrl.replace(/\/$/, "")}/`);
  url.search = request.nextUrl.search;

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const userId = request.headers.get("x-alpha-user-id");
  const platformAdmin = request.headers.get("x-alpha-platform-admin");
  const contentType = request.headers.get("content-type");
  if (authorization) headers.set("Authorization", authorization);
  if (userId) headers.set("X-User-Id", userId);
  if (platformAdmin) headers.set("X-Platform-Admin", platformAdmin);
  if (contentType) headers.set("Content-Type", contentType);

  const body = request.method === "GET" ? undefined : await request.arrayBuffer();
  try {
    const response = await fetch(url, { method: request.method, headers, body, cache: "no-store" });
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({
      title: "Backend unavailable",
      detail: `לא ניתן להתחבר ל־Alpha API בכתובת ${baseUrl}`,
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
