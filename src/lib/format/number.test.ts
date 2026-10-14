import { describe, expect, it } from "vitest";
import { formatCount, formatMoney } from "./number";

describe("formatMoney", () => {
  it("keeps whole amounts without decimals", () => {
    expect(formatMoney(52180)).toBe("₪52,180");
    expect(formatMoney(0)).toBe("₪0");
  });

  it("shows two decimals for fractional amounts", () => {
    expect(formatMoney(87421.5)).toBe("₪87,421.50");
    expect(formatMoney(98012.35)).toBe("₪98,012.35");
    expect(formatMoney(-12.5)).toMatch(/12\.50/);
  });

  it("renders a dash for missing values", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
  });
});

describe("formatCount", () => {
  it("groups thousands", () => {
    expect(formatCount(1234)).toBe("1,234");
  });
});
