import { getSession } from "./session";
import { employerInterfaceApi } from "./employer-interface-api";

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
    let message = `אירעה שגיאה (${response.status})`;
    try {
      const problem = await response.json();
      message = problem?.error === "payment_account_required"
        ? "יש לבחור חשבון תשלום פעיל לדיווח."
        : problem?.error === "bank_mandate_required"
          ? "לא ניתן לשלוח את הדיווח ללא הרשאה פעילה לחיוב חשבון הבנק שנבחר."
          : problem?.error === "billing_account_required"
            ? "לא הוגדר Billing Account עבור הגורם שמחויב בפועל."
            : problem?.error === "billing_payment_method_not_active"
              ? "אמצעי התשלום של Alpha אינו פעיל ולכן לא ניתן לשדר דיווחים."
              : problem?.error === "billing_payment_method_reference_required"
                ? "אמצעי התשלום מסומן כפעיל אך חסר token או mandate reference תקין."
                : problem?.detail ?? problem?.error ?? problem?.title ?? problem?.transmission?.errorMessage ?? message;
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
  send: async (organizationId: string, employerId: string, reportId: string, provider = "MockClearinghouse") => {
    const preflight = await employerInterfaceApi.preflight(organizationId, employerId, reportId);
    if (!preflight.transmittable)
      throw new Error("דיווח הפרשים אינו משודר ישירות בממשק מעסיקים 006. יש ליצור ממנו דיווח שוטף או שלילי לפני השידור.");
    if (!preflight.isValid)
      throw new Error(preflight.issues.slice(0, 8).join(" ") + (preflight.issues.length > 8 ? ` ועוד ${preflight.issues.length - 8} שגיאות.` : ""));
    return request<SendReportResult>(path(organizationId, employerId, reportId), { method: "POST", body: JSON.stringify({ provider }) });
  },
};
