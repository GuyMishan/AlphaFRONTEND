import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/query/query-client", () => ({ getQueryClient: () => ({ clear: vi.fn() }) }));
vi.mock("./storage", () => ({ clearSession: vi.fn(), getSession: () => null }));

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); });

describe("session lifecycle in restricted browsers", () => {
  function blockBroadcastChannel() {
    vi.stubGlobal("BroadcastChannel", class {
      constructor() { throw new DOMException("blocked", "SecurityError"); }
    });
  }

  it("does not break sign-in or shell setup when channels are blocked", async () => {
    blockBroadcastChannel();
    const { announceSignIn, listenForSessionChangesInOtherTabs } = await import("./lifecycle");
    expect(() => announceSignIn("u1")).not.toThrow();
    expect(() => listenForSessionChangesInOtherTabs()()).not.toThrow();
  });

  it("still redirects after a failed logout and blocked broadcast", async () => {
    blockBroadcastChannel();
    const replace = vi.fn();
    vi.stubGlobal("window", { location: { pathname: "/dashboard", replace } });
    const fetchMock = vi.fn(async () => { throw new TypeError("offline"); });
    vi.stubGlobal("fetch", fetchMock);
    const { logout } = await import("./lifecycle");
    await logout();
    expect(replace).toHaveBeenCalledWith("/login");
    expect(fetchMock).toHaveBeenCalledWith("/api/session/logout", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
});
