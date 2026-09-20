import { getSession } from "./session";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const headers = new Headers({ Accept: "application/json" });
  if (init?.body) headers.set("Content-Type", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (session?.mode === "development" && session.userId) {
    headers.set("X-Alpha-User-Id", session.userId);
    if (session.platformAdmin) headers.set("X-Alpha-Platform-Admin", "true");
  }
  const response = await fetch(`/api/backend${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    let message = `אירעה שגיאה (${response.status})`;
    try {
      const problem = await response.json();
      message = problem?.detail ?? problem?.error ?? problem?.title ?? message;
    } catch { /* empty */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

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
