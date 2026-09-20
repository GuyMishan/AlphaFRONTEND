import { getSession } from "./session";

export type ReportFeedbackStatus = "all" | "success" | "error" | "pending" | "not-sent";

export type ReportFeedbackRow = {
  id: string;
  reportingMonth: string;
  salaryPaymentDate: string | null;
  reportKind: number | string;
  status: number | string;
  feedbackStatus: Exclude<ReportFeedbackStatus, "all">;
  hasFeedback: boolean;
  issueCount: number;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
  lastTransmission: null | {
    id: string;
    attemptNumber: number;
    status: number | string;
    provider: string;
    externalId: string;
    errorMessage: string;
    startedAt: string | null;
    sentAt: string | null;
    completedAt: string | null;
  };
};

export type ReportFeedbackIssue = {
  source: string;
  code: string;
  description: string;
  employeeId: string | null;
  employeeName: string | null;
  productId: string | null;
  productName: string | null;
  actionType: "EditReport" | "RetryTransmission" | string;
};

export type ReportFeedbackDetails = {
  report: {
    id: string;
    reportingMonth: string;
    salaryPaymentDate: string | null;
    reportKind: number | string;
    status: number | string;
    validationError: string;
    createdAt: string;
    updatedAt: string;
  };
  feedbackStatus: Exclude<ReportFeedbackStatus, "all">;
  issueCount: number;
  issues: ReportFeedbackIssue[];
  transmissions: Array<{
    id: string;
    attemptNumber: number;
    status: number | string;
    provider: string;
    externalId: string;
    errorMessage: string;
    startedAt: string | null;
    sentAt: string | null;
    completedAt: string | null;
    createdAt: string;
  }>;
};

async function request<T>(path: string): Promise<T> {
  const session = getSession();
  const headers = new Headers({ Accept: "application/json" });
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  const response = await fetch(`/api/backend${path}`, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`אירעה שגיאה (${response.status})`);
  return response.json() as Promise<T>;
}

export const reportFeedbackApi = {
  list: (organizationId: string, employerId: string, feedbackStatus: ReportFeedbackStatus = "all", skip = 0, take = 50) => {
    const params = new URLSearchParams({ feedbackStatus, skip: String(skip), take: String(take) });
    return request<{ items: ReportFeedbackRow[]; hasMore: boolean }>(`/api/organizations/${organizationId}/employers/${employerId}/report-feedback/?${params}`);
  },
  details: (organizationId: string, employerId: string, reportId: string) =>
    request<ReportFeedbackDetails>(`/api/organizations/${organizationId}/employers/${employerId}/report-feedback/${reportId}`),
};
