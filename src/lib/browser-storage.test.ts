import { afterEach, describe, expect, it, vi } from "vitest";
import { readStorage, removeStorage, writeStorage } from "./browser-storage";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: (key) => { values.delete(key); },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("browser storage", () => {
  it("reads, writes and removes when storage works", () => {
    vi.stubGlobal("window", { localStorage: memoryStorage(), sessionStorage: memoryStorage() });
    writeStorage("session", "k", "v");
    expect(readStorage("session", "k")).toBe("v");
    expect(readStorage("local", "k")).toBeNull();
    removeStorage("session", "k");
    expect(readStorage("session", "k")).toBeNull();
  });

  it("never throws when accessing storage is blocked", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage { throw new DOMException("blocked", "SecurityError"); },
      get sessionStorage(): Storage { throw new DOMException("blocked", "SecurityError"); },
    });
    expect(() => writeStorage("local", "k", "v")).not.toThrow();
    expect(readStorage("local", "k")).toBeNull();
    expect(() => removeStorage("session", "k")).not.toThrow();
  });

  it("never throws when a write exceeds the quota", () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new DOMException("full", "QuotaExceededError"); };
    vi.stubGlobal("window", { localStorage: storage, sessionStorage: storage });
    expect(() => writeStorage("local", "k", "v")).not.toThrow();
  });

  it("returns nothing on the server", () => {
    expect(readStorage("local", "k")).toBeNull();
  });
});
