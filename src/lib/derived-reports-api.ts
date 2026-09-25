import { getSession } from "./session";
import type { ManualReportDraft, ManualReportKind, PagedResult, SourceManualReport } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  const response = await fetch(`/api/backend${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    let message = `אירעה שגיאה (${response.status})`;
    try {
      const problem = await response.json();
      message = problem?.error === "payment_account_required"
        ? "יש לבחור חשבון תשלום פעיל לדיווח."
        : problem?.error === "bank_mandate_required"
          ? "לא ניתן לשלוח את הדיווח ללא הרשאה פעילה לחיוב חשבון הבנק שנבחר."
          : problem?.detail ?? problem?.error ?? problem?.title ?? message;
    } catch { /* no json */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const derivedReportsApi = {
  sourceReports: (organizationId: string, employerId: string, search = "", skip = 0, take = 30) => {
    const params = new URLSearchParams({ search, skip: String(skip), take: String(take) });
    return request<PagedResult<SourceManualReport>>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/source-reports?${params}`);
  },
  create: (organizationId: string, employerId: string, payload: { sourceReportId: string; reportKind: ManualReportKind; reportingMonth: string; salaryPaymentDate: string | null; paymentAccountId?: string; correctionOperationCode?: 2 | 3 }) =>
    request<ManualReportDraft>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/derived`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  metadata: (organizationId: string, employerId: string, reportId: string) =>
    request<ManualReportDraft>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/metadata`),
};
