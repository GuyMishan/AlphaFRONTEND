import { beforeEach, describe, expect, it, vi } from "vitest";
import { manualReportsApi } from "../api";
import { employeesApi } from "@/features/employees/api";
import type { EmployeeInput } from "@/features/employees/types";
import type { ExcelEmployeeIntakeResult } from "@/features/employees/components/excel-employee-intake";
import { importExcelReport } from "./import-excel-report";

vi.mock("../api", () => ({ manualReportsApi: {
  createManualReport: vi.fn(), manualReportEmployees: vi.fn(), syncManualReportEmployees: vi.fn(),
} }));
vi.mock("@/features/employees/api", () => ({ employeesApi: {
  updateEmployee: vi.fn(), createEmployee: vi.fn(), saveEmployeePensionMix: vi.fn(),
} }));

const input: EmployeeInput = {
  nationalId: "123456782", firstName: "ישראל", lastName: "ישראלי", employeeNumber: "1", startDate: "2020-01-01",
  birthDate: "1990-01-01", gender: 1, email: "", mobile: "", city: "", street: "", houseNumber: "",
  apartment: "", postalCode: "", postOfficeBox: "",
};
const intake: ExcelEmployeeIntakeResult = {
  fileName: "salary.xlsx", matchedEmploymentIds: ["employee"], matchedEmployees: [{ employmentId: "employee", input }],
  newEmployees: [], blockedCount: 0, totalRows: 1, reportRows: [], updateEmployeeProfiles: false, updatePensionMix: false,
};
const options = {
  scope: { organizationId: "org", employerId: "employer" }, intake, reportId: "", month: "2026-09",
  salaryPaymentDate: "2026-10-01", paymentAccountId: "account", onReportCreated: vi.fn(),
};

beforeEach(() => vi.resetAllMocks());

describe("Excel report persistence", () => {
  it("rejects blocked rows before making any changes to employees or reports", async () => {
    await expect(importExcelReport({ ...options, intake: { ...intake, blockedCount: 1 } })).rejects.toThrow("יש שורות חסומות");
    expect(employeesApi.updateEmployee).not.toHaveBeenCalled();
    expect(employeesApi.createEmployee).not.toHaveBeenCalled();
    expect(manualReportsApi.createManualReport).not.toHaveBeenCalled();
  });

  it("preserves the created draft ID for retry when a later request fails", async () => {
    vi.mocked(manualReportsApi.createManualReport).mockResolvedValue({
      id: "draft", reportingMonth: "2026-09-01", salaryPaymentDate: "2026-10-01", status: 1, employeeCount: 1,
    });
    vi.mocked(manualReportsApi.manualReportEmployees).mockRejectedValue(new Error("offline"));
    await expect(importExcelReport(options)).rejects.toThrow("offline");
    expect(options.onReportCreated).toHaveBeenCalledWith("draft");
    expect(manualReportsApi.createManualReport).toHaveBeenCalledWith("org", "employer", {
      reportingMonth: "2026-09-01", salaryPaymentDate: "2026-10-01", employmentIds: ["employee"], paymentAccountId: "account",
    });
    expect(employeesApi.updateEmployee).not.toHaveBeenCalled();
  });
});
