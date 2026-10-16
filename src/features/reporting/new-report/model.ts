import type { ExcelEmployeeIntakeResult } from "@/features/employees/components/excel-employee-intake";
import type { Employee } from "@/features/employees/types";
import type { ReportValidationResult } from "../validation-api";
import type { ManualReportKind } from "../types";
import type { IntakeMode } from "../new-report-options";

/** URL entry points are immutable for the lifetime of a wizard workspace. */
export function parseReportEntry(params: Pick<URLSearchParams, "get">) {
  return {
    sourceReportId: params.get("sourceReportId") ?? "",
    sourceProductId: params.get("sourceProductId") ?? "",
    sourceMonth: params.get("sourceMonth") ?? "",
    sourceKind: params.get("sourceKind") ?? "",
    resumeReportId: params.get("resumeReportId") ?? "",
    followUpReportId: params.get("followUpReportId") ?? "",
    correctionWorkspace: params.get("correctionWorkspace") === "1",
    focusProductId: params.get("focusReportProductId") ?? "",
    focusEmployeeId: params.get("focusReportEmployeeId") ?? "",
    missingFieldNumber: params.get("focusMissingFieldNumber") ?? "",
    resolver: params.get("resolutionResolver") ?? "",
    resolutionSourceReportId: params.get("resolutionSourceReportId") ?? "",
    problemIds: (params.get("resolutionProblemIds") ?? "").split(",").map(id => id.trim()).filter(Boolean),
  };
}

export type ReportEntry = ReturnType<typeof parseReportEntry>;

export type ReportWizardState = {
  step: number;
  reportKind: ManualReportKind;
  mode: IntakeMode;
  month: string;
  salaryPaymentDate: string;
  paymentAccountId: string;
  reportId: string;
  sourceReportId: string;
  correctionOperationCode: 2 | 3;
  employees: Employee[];
  selectedIds: string[];
  resumingDraft: boolean;
  showOpenReports: boolean;
  stepOneAttempted: boolean;
  excelIntake: ExcelEmployeeIntakeResult | null;
  fileName: string;
  sentExternalId: string;
  error: string;
  advancing: boolean;
  sending: boolean;
  validationResult: ReportValidationResult | null;
  validationFocus: { employeeId: string; productId: string } | null;
  focusedProductId: string;
};

export type PatchReportWizard = (change: Partial<ReportWizardState>) => void;

export function reportSteps(isExcel: boolean) {
  return {
    labels: isExcel
      ? ["פרטי הדיווח", "העלאת קובץ דיווח", "רשימת עובדים", "נתוני הפקדות", "סיכום ושליחה"]
      : ["פרטי הדיווח", "רשימת עובדים", "נתוני הפקדות", "סיכום ושליחה"],
    employees: isExcel ? 3 : 2,
    deposits: isExcel ? 4 : 3,
    summary: isExcel ? 5 : 4,
  };
}

export function defaultSalaryDate(month: string, day: number | null) {
  if (!day || !/^\d{4}-\d{2}$/.test(month)) return "";
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function validationMessage(errors: string[]) {
  if (!errors.length) return "בדיקת הדיווח נכשלה.";
  const missingSalary = errors.filter(error => error.includes("חסר שכר חודשי")).length;
  const missingProduct = errors.filter(error => error.includes("אין מוצר פנסיוני בדיווח")).length;
  const otherErrors = errors.length - missingSalary - missingProduct;
  const parts: string[] = [];
  if (missingSalary) parts.push(`חסר שכר חודשי ל־${missingSalary} עובדים`);
  if (missingProduct) parts.push(`חסר מוצר פנסיוני ל־${missingProduct} עובדים`);
  if (otherErrors) parts.push(`${otherErrors} שגיאות נוספות`);
  return `לא ניתן להמשיך: ${parts.join(", ")}.`;
}
