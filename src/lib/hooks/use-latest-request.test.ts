import { describe, expect, it } from "vitest";
import { createRequestGuard } from "./use-latest-request";

describe("createRequestGuard", () => {
  it("keeps only the latest request current", () => {
    const guard = createRequestGuard();
    const first = guard.begin();
    expect(first()).toBe(true);
    const second = guard.begin();
    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });

  it("drops a slow response for a previous scope", async () => {
    const guard = createRequestGuard();
    const shown: string[] = [];
    const load = async (organizationId: string, delay: number) => {
      const isCurrent = guard.begin();
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (isCurrent()) shown.push(organizationId);
    };
    await Promise.all([load("org-old", 20), load("org-new", 1)]);
    expect(shown).toEqual(["org-new"]);
  });

  it("makes every request stale on cancel", () => {
    const guard = createRequestGuard();
    const pending = guard.begin();
    guard.cancel();
    expect(pending()).toBe(false);
  });
});
