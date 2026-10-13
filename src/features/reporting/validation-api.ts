import { apiRequest as request } from "@/lib/api/client";

export type ReportValidationIssue = {
  code: string;
  message: string;
  scope: "Report" | "Employee" | "Product" | "Contribution" | "Payment" | string;
  employeeId?: string | null;
  productId?: string | null;
};

export type ReportValidationResult = {
  isValid: boolean;
  status: number | string;
  snapshotTakenAt?: string | null;
  validatedAt?: string | null;
  errors: string[];
  issues: ReportValidationIssue[];
};

export type ContributionPercentageLimit = {
  year: number;
  productType: number | string;
  party: number | string;
  component: number | string;
  maxPercentage: number;
};


function validationPath(organizationId: string, employerId: string, reportId: string, stage: "employees" | "deposits" | "final") {
  return `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/validate?stage=${stage}`;
}

export const reportValidationApi = {
  preview: (organizationId: string, employerId: string, reportId: string, stage: "employees" | "deposits" | "final") =>
    request<ReportValidationResult>(validationPath(organizationId, employerId, reportId, stage)),
  validate: (organizationId: string, employerId: string, reportId: string, stage: "employees" | "deposits" | "final") =>
    request<ReportValidationResult>(validationPath(organizationId, employerId, reportId, stage)),
  commit: (organizationId: string, employerId: string, reportId: string, stage: "employees" | "deposits" | "final") =>
    request<ReportValidationResult>(validationPath(organizationId, employerId, reportId, stage), { method: "POST" }),
  contributionLimits: (organizationId: string, employerId: string, year: number) =>
    request<ContributionPercentageLimit[]>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/contribution-limits?year=${year}`),
};
