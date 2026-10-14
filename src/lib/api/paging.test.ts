import { describe, expect, it, vi } from "vitest";
import { collectPages } from "./paging";

describe("complete paged lists", () => {
  it("includes employees beyond the first 100 and advances by the number actually returned", async () => {
    const readPage = vi.fn(async (skip: number) => ({
      items: Array.from({ length: skip === 0 ? 100 : skip === 100 ? 37 : 2 }, (_, index) => skip + index),
      hasMore: skip < 137,
    }));
    const items = await collectPages(readPage);
    expect(items).toEqual(Array.from({ length: 139 }, (_, index) => index));
    expect(readPage.mock.calls.map(([skip]) => skip)).toEqual([0, 100, 137]);
  });

  it("does not loop forever if a server returns an empty page marked hasMore", async () => {
    const readPage = vi.fn(async () => ({ items: [], hasMore: true }));
    expect(await collectPages(readPage)).toEqual([]);
    expect(readPage).toHaveBeenCalledTimes(1);
  });

  it("rejects the whole read if a later page fails, rather than exposing a partial employee list", async () => {
    const error = new Error("network unavailable");
    const readPage = vi.fn().mockResolvedValueOnce({ items: [1], hasMore: true }).mockRejectedValueOnce(error);
    await expect(collectPages(readPage)).rejects.toBe(error);
  });
});
