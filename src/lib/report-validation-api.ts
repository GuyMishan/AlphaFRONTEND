import { getSession } from "./session";

export type ReportValidationResult = { isValid: boolean; errors: string[] };
export type ContributionPercentageLimit = {
  year: number;
  productType: number | string;
  party: number | string;
  component: number | string;
  maxPercentage: number;
};

async function request<T>(path: string): Promise<T> {
  const session = getSession();
  const headers = new Headers({ Accept: "application/json" });
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (session?.mode === "development" && session.userId) {
    headers.set("X-Alpha-User-Id", session.userId);
    if (session.platformAdmin) headers.set("X-Alpha-Platform-Admin", "true");
  }
  const response = await fetch(`/api/backend${path}`, { headers, cache: "no-store" });
  if (!response.ok) {
    let message = `שגיאת שרת (${response.status})`;
    try {
      const problem = await response.json();
      message = problem?.detail ?? problem?.error ?? problem?.title ?? message;
    } catch { /* empty */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const reportValidationApi = {
  validate: (organizationId: string, employerId: string, reportId: string, stage: "employees" | "deposits" | "final") =>
    request<ReportValidationResult>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/validate?stage=${stage}`),
  contributionLimits: (organizationId: string, employerId: string, year: number) =>
    request<ContributionPercentageLimit[]>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/contribution-limits?year=${year}`),
};
