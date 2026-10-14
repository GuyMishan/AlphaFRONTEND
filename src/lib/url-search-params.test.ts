import { afterEach, describe, expect, it, vi } from "vitest";
import { replaceSearchParams } from "./url-search-params";

function stubLocation(href: string) {
  const replaceState = vi.fn();
  vi.stubGlobal("window", { location: { href }, history: { state: { __NA: true }, replaceState } });
  return replaceState;
}

afterEach(() => vi.unstubAllGlobals());

describe("replaceSearchParams", () => {
  it("sets a parameter and keeps the rest of the URL", () => {
    const replaceState = stubLocation("https://alpha.test/employers/e1?organizationId=o1#top");
    replaceSearchParams((params) => params.set("tab", "employees"));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/employers/e1?organizationId=o1&tab=employees#top");
  });

  it("never passes Next's internal history state, so useSearchParams stays in sync", () => {
    const replaceState = stubLocation("https://alpha.test/employees/a1");
    replaceSearchParams((params) => params.set("tab", "mix"));
    expect(replaceState.mock.calls[0][0]).toBeNull();
  });

  it("drops the question mark when the last parameter is removed", () => {
    const replaceState = stubLocation("https://alpha.test/settings?payment=success");
    replaceSearchParams((params) => params.delete("payment"));
    expect(replaceState).toHaveBeenCalledWith(null, "", "/settings");
  });
});
