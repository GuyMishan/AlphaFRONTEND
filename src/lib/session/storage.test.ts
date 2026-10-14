import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appStore } from "@/lib/session/app-store";
import { clearSession, getEmployerSelection, getSession, setEmployerSelection, setSession } from "./storage";

const session = { mode: "oidc" as const, userId: "u1", platformAdmin: false, displayName: "יעל שטרן" };

beforeEach(() => {
  vi.stubGlobal("window", {
    get localStorage(): Storage { throw new DOMException("blocked", "SecurityError"); },
    get sessionStorage(): Storage { throw new DOMException("blocked", "SecurityError"); },
  });
  appStore.getState().clearBrowserState();
  // Force the next read to hydrate from (blocked) storage.
  appStore.setState({ sessionHydrated: false });
});

afterEach(() => vi.unstubAllGlobals());

describe("session storage when browser storage is blocked", () => {
  it("starts signed out instead of throwing", () => {
    expect(getSession()).toBeNull();
  });

  it("keeps the session and selection in memory for the current page", () => {
    setSession(session);
    expect(getSession()).toEqual(session);
    setEmployerSelection("org-1", "emp-1");
    expect(getEmployerSelection()).toEqual({ organizationId: "org-1", employerId: "emp-1" });
  });

  it("signs out without throwing", () => {
    setSession(session);
    expect(() => clearSession()).not.toThrow();
    expect(getSession()).toBeNull();
  });
});
