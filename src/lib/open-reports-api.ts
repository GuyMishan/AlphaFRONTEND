import { getSession } from "./session";
import type { ManualReportDraft, ManualReportEmployeeSummary } from "./types";

export type OpenManualReportSummary = ManualReportDraft & {
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OpenManualReportsPage = {
  items: OpenManualReportSummary[];
  hasMore: boolean;
};

async function request<T>(path: string): Promise<T> {
  const session = getSession();
  const headers = new Headers({ Accept: "application/json" });
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  const response = await fetch(`/api/backend${path}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`שגיאת שרת (${response.status})`);
  return response.json() as Promise<T>;
}

export const openReportsApi = {
  list: (organizationId: string, employerId: string, skip = 0, take = 30) => {
    const params = new URLSearchParams({ skip: String(skip), take: String(take) });
    return request<OpenManualReportsPage>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/?${params}`);
  },
  report: (organizationId: string, employerId: string, reportId: string) =>
    request<ManualReportDraft>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}`),
  employees: (organizationId: string, employerId: string, reportId: string, skip = 0, take = 100) => {
    const params = new URLSearchParams({ skip: String(skip), take: String(take) });
    return request<{ items: ManualReportEmployeeSummary[]; hasMore: boolean }>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees?${params}`);
  },
};
