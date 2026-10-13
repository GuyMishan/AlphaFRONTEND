import { describe, expect, it } from "vitest";
import { createEmptyPensionEditorProduct, validatePensionEditorProducts, type PensionEditorProduct } from "./pension-products-editor";

function product(patch: Partial<PensionEditorProduct> = {}): PensionEditorProduct {
  return {
    ...createEmptyPensionEditorProduct("report", 0, "2026-09"),
    fundExternalKey: "test-fund",
    ...patch,
  };
}

describe("shared pension editor preventable validation", () => {
  it("rejects exempt insurance contributions in report editing (code 74)", () => {
    const value = product({
      productType: 3,
      employerContributions: [{ component: 3, percentage: 1, amount: 100, exemptPayments: 10 }],
    });
    expect(validatePensionEditorProducts([value], "report")).toContain("74");
  });

  it("rejects negative contribution amounts in report editing", () => {
    const value = product({
      employerContributions: [{ component: 2, percentage: 5, amount: -10, exemptPayments: 0 }],
    });
    expect(validatePensionEditorProducts([value], "report")).toContain("אינם שליליים");
  });

  it("rejects more than two decimal places in report editing", () => {
    const value = product({
      employerContributions: [{ component: 2, percentage: 5.123, amount: 100, exemptPayments: 0 }],
    });
    expect(validatePensionEditorProducts([value], "report")).toContain("שתי ספרות");
  });

  it("rejects duplicate policy numbers on employee pension mix", () => {
    const first = product({ productType: 1, policyNumber: "abc" });
    const second = product({ productType: 1, policyNumber: "ABC" });
    expect(validatePensionEditorProducts([first, second], "employee")).toContain("אותו מספר פוליסה");
  });
});
