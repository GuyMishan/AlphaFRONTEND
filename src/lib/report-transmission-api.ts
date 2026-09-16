import { getSession } from "./session";

export type ReportTransmissionItem = {
  id: string;
  provider: string;
  attemptNumber: number;
  status: number | string;
  externalId: string;
  errorMessage: string;
  startedAt?: string | null;
  sentAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

export type SendReportResult = {
  reportId: string;
  reportStatus: number | string;
  transmission: ReportTransmissionItem;
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
    let message = `שגיאת שרת (${response.status})`;
    try {
      const problem = await response.json();
      message = problem?.detail ?? problem?.error ?? problem?.title ?? problem?.transmission?.errorMessage ?? message;
    } catch { /* empty */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function path(organizationId: string, employerId: string, reportId: string) {
  return `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/transmissions`;
}

export const reportTransmissionApi = {
  history: (organizationId: string, employerId: string, reportId: string) =>
    request<ReportTransmissionItem[]>(path(organizationId, employerId, reportId)),
  send: (organizationId: string, employerId: string, reportId: string, provider = "MockClearinghouse") =>
    request<SendReportResult>(path(organizationId, employerId, reportId), { method: "POST", body: JSON.stringify({ provider }) }),
};
