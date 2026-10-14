import { describe, expect, it } from "vitest";
import { floatingMenuPlacement, nextEnabledOption } from "./floating-menu";

describe("floating menus", () => {
  const viewport = { width: 390, height: 700 };

  it("opens a long action menu above a trigger near the bottom and makes it scrollable", () => {
    const result = floatingMenuPlacement({ left: 320, right: 350, top: 630, bottom: 660, width: 30 }, viewport, 900, 260);
    expect(result.top).toBe(8);
    expect(result.maxHeight).toBe(616);
    expect(result.top + result.maxHeight).toBeLessThan(630);
    expect(result.left + result.width).toBeLessThanOrEqual(viewport.width - 8);
  });

  it("clamps a wide control and its menu to a narrow viewport", () => {
    const result = floatingMenuPlacement({ left: -60, right: 440, top: 40, bottom: 84, width: 500 }, viewport, 260);
    expect(result.left).toBe(8);
    expect(result.width).toBe(374);
    expect(result.top).toBe(90);
  });

  it("keeps a menu within a short viewport when neither side fits the requested height", () => {
    const shortViewport = { width: 250, height: 180 };
    const result = floatingMenuPlacement({ left: 10, right: 54, top: 80, bottom: 124, width: 44 }, shortViewport, 500, 260);
    expect(result.width).toBe(234);
    expect(result.top).toBeGreaterThanOrEqual(8);
    expect(result.top + result.maxHeight).toBeLessThanOrEqual(shortViewport.height - 8);
  });

  it("right-aligns a menu with its trigger for RTL", () => {
    const result = floatingMenuPlacement({ left: 100, right: 300, top: 40, bottom: 84, width: 200 }, viewport, 120, 150);
    expect(result.left).toBe(150);
    expect(result.width).toBe(150);
  });

  it("recovers when async filtering removes the active option, and skips disabled options", () => {
    const options = [{ disabled: true }, {}, { disabled: true }, {}];
    expect(nextEnabledOption(options, 20, 1)).toBe(1);
    expect(nextEnabledOption(options, 20, -1)).toBe(3);
    expect(nextEnabledOption(options, 1, 1)).toBe(3);
    expect(nextEnabledOption(options, 3, 1)).toBe(1);
    expect(nextEnabledOption(options, 1, -1)).toBe(3);
  });

  it("has no active option when the list is empty or fully disabled", () => {
    expect(nextEnabledOption([], 2, 1)).toBe(-1);
    expect(nextEnabledOption([{ disabled: true }], 0, -1)).toBe(-1);
  });
});
