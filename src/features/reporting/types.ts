import type { ManualContributionInput, ManualProductInput } from "@/features/pension/types";

export type ReportMode = "manual" | "excel" | "xml" | "correction";

export type ManualReportKind = 1 | 2 | 3;

export type ManualReportDraft = {
  id: string;
  reportingMonth: string;
  salaryPaymentDate: string | null;
  status: string | number;
  reportKind?: string | number;
  sourceReportId?: string | null;
  isCorrectionWorkspace?: boolean;
  hasCorrectionChanges?: boolean;
  paymentAccountId?: string | null;
  paymentBankId?: number | null;
  paymentBranchId?: number | null;
  paymentAccountNumberMasked?: string;
  paymentMandateReference?: string;
  employeeCount: number;
};

export type ResumableManualReport = {
  id: string;
  reportingMonth: string;
  salaryPaymentDate: string | null;
  status: string | number;
  reportKind: string | number;
  sourceReportId: string | null;
  isCorrectionWorkspace?: boolean;
  hasCorrectionChanges?: boolean;
  paymentAccountId: string | null;
  createdAt: string;
  updatedAt: string;
  employeeCount: number;
  productCount: number;
};

export type SourceManualReport = {
  id: string;
  reportingMonth: string;
  salaryPaymentDate: string | null;
  status: string | number;
  reportKind: string | number;
  sourceReportId: string | null;
  createdAt: string;
  updatedAt: string;
  employeeCount: number;
  productCount: number;
  canBeCurrentCorrectionSource?: boolean;
};

export type ManualReportEmployeeSummary = {
  id: string;
  employmentId: string;
  personId: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  monthlySalary: number;
  productCount: number;
  validationStatus: "ready" | "missing-products";
};

export type ManualContribution = ManualContributionInput & {
  id: string;
  reportProductId: string;
  party: string | number;
};

export type ManualReportProduct = Omit<ManualProductInput, "employerContributions" | "employeeContributions"> & {
  id: string;
  sourceReportProductId: string | null;
  isCorrectionChanged: boolean;
  employerContributions: ManualContribution[];
  employeeContributions: ManualContribution[];
};

export type ManualReportEmployeeDetail = Omit<ManualReportEmployeeSummary, "productCount" | "validationStatus"> & {
  products: ManualReportProduct[];
};
