import { afterEach, describe, expect, it, vi } from "vitest";
import * as client from "@/lib/api/client";
import { employeesApi } from "./api";

afterEach(() => vi.restoreAllMocks());

describe("complete employer employee list", () => {
  it("reads beyond both the 100-row page and the legacy 500-row list limit", async () => {
    const request = vi.spyOn(client, "apiRequest");
    const signal = new AbortController().signal;
    const employees = Array.from({ length: 601 }, (_, id) => ({ id: String(id) }));
    for (let skip = 0; skip < employees.length; skip += 100) {
      request.mockResolvedValueOnce({ items: employees.slice(skip, skip + 100), hasMore: skip + 100 < employees.length });
    }
    expect(await employeesApi.employees("organization", "employer", signal)).toEqual(employees);
    expect(request).toHaveBeenCalledTimes(7);
    request.mock.calls.forEach(([path, options], index) => {
      const url = new URL(path, "https://alpha.test");
      expect(url.pathname).toBe("/api/organizations/organization/employers/employer/employees/search");
      expect(url.searchParams.get("skip")).toBe(String(index * 100));
      expect(url.searchParams.get("take")).toBe("100");
      expect(options?.signal).toBe(signal);
    });
  });
});
