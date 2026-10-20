import { beforeEach, describe, expect, it, vi } from "vitest";
import { manualReportsApi } from "../api";
import { derivedReportsApi } from "../derived-reports-api";
import type { ManualReportDraft, ManualReportEmployeeSummary } from "../types";
import { createReportFromDetails, loadEditableReport } from "./draft-operations";
import { parseReportEntry, type ReportWizardState } from "./model";

vi.mock("../api", () => ({ manualReportsApi: {
  manualReport: vi.fn(), manualReportEmployees: vi.fn(),
  createManualReport: vi.fn(), updateManualReportPaymentAccount: vi.fn(),
} }));
vi.mock("../derived-reports-api", () => ({ derivedReportsApi: { create: vi.fn() } }));

const scope = { organizationId: "org", employerId: "employer" };
const report: ManualReportDraft = { id: "draft", reportingMonth: "2026-09-01", salaryPaymentDate: "2026-10-01", status: 1, employeeCount: 1 };
const entry = parseReportEntry(new URLSearchParams());
const employee = (id: number): ManualReportEmployeeSummary => ({
  id: `row-${id}`, employmentId: `employee-${id}`, personId: `person-${id}`,
  nationalId: "123456782", firstName: "ישראל", lastName: "ישראלי", employeeNumber: String(id),
  monthlySalary: 10000, productCount: 1, validationStatus: "ready",
});

function draft(change: Partial<ReportWizardState> = {}): ReportWizardState {
  return {
    step: 1, reportKind: 1, mode: "manual", month: "2026-09", salaryPaymentDate: "2026-10-01",
    paymentAccountId: "account", reportId: "", sourceReportId: "", correctionOperationCode: 2,
    employees: [], selectedIds: ["employee"], resumingDraft: false, isCorrectionWorkspace: false, showOpenReports: false,
    stepOneAttempted: false, excelIntake: null, fileName: "", sentExternalId: "", error: "",
    advancing: false, sending: false, validationResult: null, validationFocus: null, focusedProductId: "",
    ...change,
  };
}

beforeEach(() => vi.resetAllMocks());

describe("report draft operations", () => {
  it("resumes the complete selection, including employees after 5,000", async () => {
    vi.mocked(manualReportsApi.manualReport).mockResolvedValue(report);
    vi.mocked(manualReportsApi.manualReportEmployees).mockImplementation(async (_org, _employer, _report, _search, skip = 0) => ({
      items: Array.from({ length: Math.min(100, 5001 - skip) }, (_, index) => employee(skip + index)),
      hasMore: skip + 100 < 5001,
    }));
    const result = await loadEditableReport(scope, report.id);
    expect(result.selectedIds).toHaveLength(5001);
    expect(result.selectedIds.at(-1)).toBe("employee-5000");
  });

  it("refuses to resume a report that became immutable", async () => {
    vi.mocked(manualReportsApi.manualReport).mockResolvedValue({ ...report, status: "Submitted" });
    vi.mocked(manualReportsApi.manualReportEmployees).mockResolvedValue({ items: [], hasMore: false });
    await expect(loadEditableReport(scope, report.id)).rejects.toThrow("הדיווח כבר אינו ניתן לעריכה.");
  });

  it("updates a resumed draft without creating another report", async () => {
    await createReportFromDetails(scope, draft({ reportId: report.id }), entry, vi.fn());
    expect(manualReportsApi.updateManualReportPaymentAccount).toHaveBeenCalledWith("org", "employer", report.id, "account");
    expect(manualReportsApi.createManualReport).not.toHaveBeenCalled();
    expect(derivedReportsApi.create).not.toHaveBeenCalled();
  });

  it("keeps the new correction draft available when a later employee load fails", async () => {
    vi.mocked(derivedReportsApi.create).mockResolvedValue(report);
    vi.mocked(manualReportsApi.manualReportEmployees).mockRejectedValue(new Error("offline"));
    const onCreated = vi.fn();
    const correctionEntry = { ...entry, sourceReportId: "source", sourceProductId: "product" };
    await expect(createReportFromDetails(scope, draft({
      mode: "correction", sourceReportId: "source", correctionOperationCode: 3,
    }), correctionEntry, onCreated)).rejects.toThrow("offline");
    expect(onCreated).toHaveBeenCalledWith(report.id);
    expect(derivedReportsApi.create).toHaveBeenCalledWith("org", "employer", expect.objectContaining({
      reportKind: 1, correctionOperationCode: 3, reportProductIds: ["product"],
      sourceReportId: "source", reportingMonth: "2026-09-01", paymentAccountId: "account",
    }));
  });
});
