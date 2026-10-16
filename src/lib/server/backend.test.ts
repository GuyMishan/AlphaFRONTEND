import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as proxyGet, POST as proxyPost } from "@/app/api/backend/[...path]/route";
import { POST as logout } from "@/app/api/session/logout/route";
import { isCrossSiteRequest } from "./backend";

function request(method: string, headers: Record<string, string> = {}, url = "https://app.alpha.test/api/backend/api/x") {
  return new NextRequest(url, { method, headers });
}

afterEach(() => vi.unstubAllGlobals());

describe("isCrossSiteRequest", () => {
  it("allows safe methods and same-origin writes", () => {
    expect(isCrossSiteRequest(request("GET", { origin: "https://evil.test" }))).toBe(false);
    expect(isCrossSiteRequest(request("POST", { origin: "https://app.alpha.test", host: "app.alpha.test" }))).toBe(false);
    expect(isCrossSiteRequest(request("POST", { host: "app.alpha.test" }))).toBe(false);
  });

  it("honors the forwarded host set by the hosting proxy", () => {
    expect(isCrossSiteRequest(request("PUT", {
      origin: "https://app.alpha.test", host: "internal:3000", "x-forwarded-host": "app.alpha.test",
    }))).toBe(false);
  });

  it("rejects cross-site writes", () => {
    expect(isCrossSiteRequest(request("POST", { origin: "https://evil.test", host: "app.alpha.test" }))).toBe(true);
    expect(isCrossSiteRequest(request("DELETE", { "sec-fetch-site": "cross-site", host: "app.alpha.test" }))).toBe(true);
    expect(isCrossSiteRequest(request("POST", { origin: "not a url", host: "app.alpha.test" }))).toBe(true);
  });
});

describe("POST /api/session/logout", () => {
  it("revokes the backend session with the HttpOnly token, then clears the cookie", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await logout(request("POST", {
      origin: "https://app.alpha.test", host: "app.alpha.test", cookie: "alpha_access=secret-token",
    }, "https://app.alpha.test/api/session/logout"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toMatch(/\/api\/auth\/logout$/);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer secret-token");
    expect(await response.json()).toEqual({ ok: true, revoked: true });
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/alpha_access=;/);
    expect(cookie).toMatch(/Max-Age=0/i);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it("still clears the cookie when the backend is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));

    const response = await logout(request("POST", { cookie: "alpha_access=t" }, "https://app.alpha.test/api/session/logout"));

    expect(await response.json()).toEqual({ ok: true, revoked: false });
    expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
  });

  it("does not call the backend without a session cookie", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await logout(request("POST", {}, "https://app.alpha.test/api/session/logout"));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects cross-site logout requests", async () => {
    const response = await logout(request("POST", { origin: "https://evil.test", host: "app.alpha.test" }, "https://app.alpha.test/api/session/logout"));
    expect(response.status).toBe(403);
  });
});

describe("backend proxy", () => {
  const params = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });

  it("moves the issued token into an HttpOnly cookie and strips it from the body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ accessToken: "jwt", userId: "u1", displayName: "D" })));

    const response = await proxyPost(request("POST", { origin: "https://app.alpha.test", host: "app.alpha.test" },
      "https://app.alpha.test/api/backend/api/auth/otp/verify"), params("api/auth/otp/verify"));

    expect(await response.json()).toEqual({ userId: "u1", displayName: "D" });
    expect(response.headers.get("set-cookie")).toMatch(/alpha_access=jwt;.*HttpOnly/i);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("handles mixed-case authentication routes without exposing tokens or forwarding stale cookies", async () => {
    const fetchMock = vi.fn(async () => Response.json({ accessToken: "jwt", userId: "u1" }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await proxyPost(request("POST", { cookie: "alpha_access=expired" }), params("API/Auth/OTP/Verify"));
    expect(await response.json()).toEqual({ userId: "u1" });
    expect(response.headers.get("set-cookie")).toContain("alpha_access=jwt");
    const init = (fetchMock.mock.calls[0] as unknown as [URL, RequestInit])[1];
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
    expect(init.redirect).toBe("error");
  });

  it.each([
    ["https:", "", "evil.test", "api", "scope"],
    ["", "", "evil.test", "api", "scope"],
    ["api", "%2e%2e", "api", "scope"],
    ["api", "auth", "otp", "verify", ""],
    ["api", "auth", "otp", "verify?ignored"],
    ["api", "auth", "otp", "verify#ignored"],
    ["api", "auth\\otp\\verify"],
  ])("rejects ambiguous or external path segments: %j", async (...path) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await proxyGet(request("GET", { cookie: "alpha_access=secret" }), { params: Promise.resolve({ path }) });
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("supports the HEAD request Next delegates to GET without a request body", async () => {
    const fetchMock = vi.fn(async () => new Response(null));
    vi.stubGlobal("fetch", fetchMock);
    await proxyGet(request("HEAD", { cookie: "alpha_access=jwt" }), params("api/scope"));
    const init = (fetchMock.mock.calls[0] as unknown as [URL, RequestInit])[1];
    expect(init.method).toBe("HEAD");
    expect(init.body).toBeUndefined();
  });

  it("forwards the cookie as a bearer token, except to anonymous auth endpoints", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    const headers = { origin: "https://app.alpha.test", host: "app.alpha.test", cookie: "alpha_access=jwt" };

    await proxyPost(request("POST", headers, "https://app.alpha.test/api/backend/api/employees"), params("api/employees"));
    await proxyPost(request("POST", headers, "https://app.alpha.test/api/backend/api/auth/otp/request"), params("api/auth/otp/request"));

    const authHeader = (call: number) => new Headers((fetchMock.mock.calls[call] as unknown as [URL, RequestInit])[1].headers).get("Authorization");
    expect(authHeader(0)).toBe("Bearer jwt");
    expect(authHeader(1)).toBeNull();
  });

  it("blocks cross-site writes before contacting the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxyPost(request("POST", { origin: "https://evil.test", host: "app.alpha.test", cookie: "alpha_access=jwt" },
      "https://app.alpha.test/api/backend/api/employees"), params("api/employees"));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only proxies the backend /api surface and rejects dot segments", async () => {
    const fetchMock = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    const get = (segments: string[]) => proxyGet(request("GET", {}, "https://app.alpha.test/api/backend/x"), { params: Promise.resolve({ path: segments }) });

    expect((await get(["health"])).status).toBe(404);
    expect((await get(["api", "..", "admin"])).status).toBe(404);
    expect((await get(["api", "employees%2F..%2F..%2Fhealth".replace(/%2F/g, "/")])).status).toBe(404);
    expect((await get(["api", "scope"])).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
