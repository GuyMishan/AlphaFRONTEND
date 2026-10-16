import { describe, expect, it } from "vitest";
import { defaultSalaryDate, parseReportEntry, reportSteps } from "./model";

describe("report entry and stage routing", () => {
  it("preserves follow-up and feedback context when opening a correction", () => {
    const entry = parseReportEntry(new URLSearchParams({
      resumeReportId: "negative", followUpReportId: "current", correctionWorkspace: "1",
      resolutionProblemIds: " one, ,two ", focusReportProductId: "product", resolutionResolver: "payment",
    }));
    expect(entry).toMatchObject({
      resumeReportId: "negative", followUpReportId: "current", correctionWorkspace: true,
      problemIds: ["one", "two"], focusProductId: "product", resolver: "payment",
    });
  });

  it("routes the common employee/deposit/summary stages after the optional Excel upload", () => {
    expect(reportSteps(false)).toMatchObject({ employees: 2, deposits: 3, summary: 4 });
    expect(reportSteps(true)).toMatchObject({ employees: 3, deposits: 4, summary: 5 });
  });

  it("clamps the configured salary day to the end of the reporting month", () => {
    expect(defaultSalaryDate("2026-02", 31)).toBe("2026-02-28");
    expect(defaultSalaryDate("2024-02", 31)).toBe("2024-02-29");
    expect(defaultSalaryDate("2026-02", null)).toBe("");
  });
});
