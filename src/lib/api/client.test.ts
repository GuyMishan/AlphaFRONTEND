import { afterEach, describe, expect, it, vi } from "vitest";
import { apiBlob, apiRequest, queryString, subscribeToApiErrors } from "./client";
import { ApiError } from "./errors";

function jsonResponse(status: number, body: unknown, contentType = "application/json") {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": contentType } });
}

function mockFetch(implementation: (url: string, init: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("apiRequest", () => {
  it("sends JSON bodies through the same-origin proxy and parses JSON", async () => {
    const fetchMock = mockFetch(async () => jsonResponse(200, { id: "1" }));

    const result = await apiRequest<{ id: string }>("/api/things", { method: "POST", body: { name: "x" } });

    expect(result).toEqual({ id: "1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/backend/api/things");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "x" }));
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(init.credentials).toBe("same-origin");
    expect(init.cache).toBe("no-store");
  });

  it("passes FormData through untouched without a JSON content type", async () => {
    const fetchMock = mockFetch(async () => jsonResponse(200, { ok: true }));
    const body = new FormData();
    body.set("file", new Blob(["pdf"]), "a.pdf");

    await apiRequest("/api/upload", { method: "POST", body });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(body);
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });

  it("resolves undefined for 204 and empty bodies", async () => {
    mockFetch(async () => new Response(null, { status: 204 }));
    await expect(apiRequest("/api/x", { method: "DELETE" })).resolves.toBeUndefined();

    mockFetch(async () => new Response("", { status: 200 }));
    await expect(apiRequest("/api/x")).resolves.toBeUndefined();
  });

  it("normalizes RFC 9457 problems into ApiError with code, field errors and trace id", async () => {
    mockFetch(async () => jsonResponse(400, {
      status: 400,
      title: "Bad Request",
      detail: "The request is invalid.",
      errorCode: "VALIDATION_FAILED",
      traceId: "trace-1",
      errors: { firstName: ["שם פרטי הוא שדה חובה."] },
    }, "application/problem+json"));

    const error = await apiRequest("/api/x").catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.kind).toBe("http");
    expect(apiError.status).toBe(400);
    expect(apiError.code).toBe("VALIDATION_FAILED");
    expect(apiError.traceId).toBe("trace-1");
    expect(apiError.fieldErrors).toEqual({ firstName: ["שם פרטי הוא שדה חובה."] });
    // Generic English detail is skipped in favor of the Hebrew field message.
    expect(apiError.message).toBe("שם פרטי הוא שדה חובה.");
  });

  it("prefers per-call messages over backend detail", async () => {
    mockFetch(async () => jsonResponse(409, { errorCode: "BILLING_ACCOUNT_REQUIRED", detail: "Billing account missing" }));

    const error = await apiRequest("/api/x", { messages: { BILLING_ACCOUNT_REQUIRED: "הודעה מותאמת" } }).catch((cause: unknown) => cause);

    expect((error as ApiError).message).toBe("הודעה מותאמת");
  });

  it("formats plan-limit gates from problem extensions", async () => {
    mockFetch(async () => jsonResponse(409, { errorCode: "PLAN_LIMIT_REACHED", limit: "employers", current: 3, maximum: 3 }));

    const error = await apiRequest("/api/x").catch((cause: unknown) => cause) as ApiError;

    expect(error.message).toBe("הגעתם למגבלת מעסיקים במסלול הנוכחי (3/3).");
    expect(error.problem?.limit).toBe("employers");
  });

  it("notifies error subscribers and supports unsubscribe", async () => {
    mockFetch(async () => jsonResponse(403, { errorCode: "ACCESS_DENIED" }));
    const listener = vi.fn();
    const unsubscribe = subscribeToApiErrors(listener);

    await apiRequest("/api/x").catch(() => undefined);
    unsubscribe();
    await apiRequest("/api/x").catch(() => undefined);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toBeInstanceOf(ApiError);
  });

  it("maps network failures, cancellation and timeouts to distinct kinds", async () => {
    mockFetch(async () => { throw new TypeError("Failed to fetch"); });
    await expect(apiRequest("/api/x")).rejects.toMatchObject({ kind: "network", status: 0 });

    const controller = new AbortController();
    controller.abort();
    mockFetch(async () => { throw new DOMException("aborted", "AbortError"); });
    await expect(apiRequest("/api/x", { signal: controller.signal })).rejects.toMatchObject({ kind: "aborted" });

    mockFetch((_url, init) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
    await expect(apiRequest("/api/x", { timeoutMs: 5 })).rejects.toMatchObject({ kind: "timeout" });
  });

  it("rejects malformed success bodies as parse errors", async () => {
    mockFetch(async () => new Response("<html>", { status: 200 }));
    await expect(apiRequest("/api/x")).rejects.toMatchObject({ kind: "parse" });
  });
});

describe("apiBlob", () => {
  it("returns binary bodies", async () => {
    mockFetch(async () => new Response(new Blob(["abc"]), { status: 200 }));
    const blob = await apiBlob("/api/file");
    expect(await blob.text()).toBe("abc");
  });
});

describe("queryString", () => {
  it("omits empty values", () => {
    expect(queryString({ search: "", skip: 0, take: 20, employerId: undefined, active: null })).toBe("?skip=0&take=20");
    expect(queryString({})).toBe("");
  });
});
