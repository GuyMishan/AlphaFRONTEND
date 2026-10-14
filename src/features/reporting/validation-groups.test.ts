import { describe, expect, it } from "vitest";
import { validationGroups, validationIssues, validationStage } from "./validation-groups";

describe("report validation groups", () => {
  it("preserves separate employee and product findings even with identical messages", () => {
    const issues = [
      { code: "SUG_SHGIHA_72", scope: "Contribution", message: "חריגה", employeeId: "a", productId: "p1" },
      { code: "SUG_SHGIHA_72", scope: "Contribution", message: "חריגה", employeeId: "b", productId: "p2" },
      { code: "SUG_SHGIHA_53", scope: "Contribution", message: "סכום שגוי", employeeId: "a", productId: "p1" },
    ];
    const groups = validationGroups(issues);
    expect(groups.map(g => g.code)).toEqual(["SUG_SHGIHA_72", "SUG_SHGIHA_53"]);
    expect(groups[0].issues).toHaveLength(2);
    expect(groups[0].employeeCount).toBe(2);
  });
  it("falls back to backend errors when structured issues are absent", () => {
    expect(validationIssues({ isValid: false, status: 9, errors: ["א", "ב"], issues: [] })).toHaveLength(2);
  });
  it("maps edit steps by scope", () => {
    expect(validationStage({ code: "PAYMENT_REQUIRED", scope: "Payment", message: "" })).toBe(3);
    expect(validationStage({ code: "SUG_SHGIHA_72", scope: "Contribution", message: "" })).toBe(2);
    expect(validationStage({ code: "SALARY_PAYMENT_DATE_REQUIRED", scope: "Report", message: "" })).toBe(1);
  });
});
