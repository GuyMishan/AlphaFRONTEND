import { apiErrorMessage, problemCode } from "./api-error-message";
import { backendFetch } from "./backend-fetch";
import { employerInterfaceApi } from "./employer-interface-api";

export type ReportTransmissionItem = {
  id: string;
  provider: string;
  routingKey?: string;
  routedProductIdsJson?: string;
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
  transmission?: ReportTransmissionItem;
  transmissions?: ReportTransmissionItem[];
  requiresProducerFeedback?: boolean;
};

export type ManufacturerRoutingPreview = {
  provider: string | null;
  configured: boolean;
  requiresSplit: boolean;
  destinations: Array<{ fundCode: string; provider: string }>;
};

export type ManufacturerRoutingValidation = {
  reportId: string;
  canTransmit: boolean;
  requiresSplit: boolean;
  packages: Array<{
    provider: string;
    providerConfigured: boolean;
    productCount: number;
    valid: boolean;
    errors: unknown[];
  }>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  if (init?.body) headers.set("Content-Type", "application/json");
  const response = await backendFetch(path, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    let message = `אירעה שגיאה (${response.status})`;
    try {
      const problem = await response.json();
      const code = problemCode(problem);
      message = code === "PAYMENT_ACCOUNT_REQUIRED"
        ? "יש לבחור חשבון תשלום פעיל לדיווח."
        : code === "BANK_MANDATE_REQUIRED"
          ? "לא ניתן לשלוח את הדיווח ללא הרשאה פעילה לחיוב חשבון הבנק שנבחר."
          : code === "BILLING_ACCOUNT_REQUIRED"
            ? "לא הוגדר Billing Account עבור הגורם שמחויב בפועל."
            : code === "BILLING_PAYMENT_METHOD_NOT_ACTIVE"
              ? "אמצעי התשלום של Alpha אינו פעיל ולכן לא ניתן לשדר דיווחים."
              : code === "BILLING_PAYMENT_METHOD_REFERENCE_REQUIRED"
                ? "אמצעי התשלום מסומן כפעיל אך חסר token או mandate reference תקין."
                : apiErrorMessage(response.status, problem);
    } catch { /* empty */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function path(organizationId: string, employerId: string, reportId: string) {
  return `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/transmissions`;
}

export const reportTransmissionApi = {
  routing: (organizationId: string, employerId: string, reportId: string) =>
    request<ManufacturerRoutingPreview>(
      `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/transmission-routing`),
  validateRouting: (organizationId: string, employerId: string, reportId: string) =>
    request<ManufacturerRoutingValidation>(
      `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/transmission-routing/validate`),
  resumeHybrid: (organizationId: string, employerId: string, reportId: string) =>
    request<SendReportResult>(`${path(organizationId, employerId, reportId)}/resume-hybrid`, {
      method: "POST",
    }),
  history: (organizationId: string, employerId: string, reportId: string) =>
    request<ReportTransmissionItem[]>(path(organizationId, employerId, reportId)),
  send: async (organizationId: string, employerId: string, reportId: string, provider?: string) => {
    const preflight = await employerInterfaceApi.preflight(organizationId, employerId, reportId);
    if (!preflight.transmittable)
      throw new Error("דיווח הפרשים אינו משודר ישירות בממשק מעסיקים 006. יש ליצור ממנו דיווח שוטף או שלילי לפני השידור.");
    if (!preflight.isValid)
      throw new Error(preflight.issues.slice(0, 8).join(" ") + (preflight.issues.length > 8 ? ` ועוד ${preflight.issues.length - 8} שגיאות.` : ""));

    const selectedProvider = provider?.trim();
    return request<SendReportResult>(path(organizationId, employerId, reportId), {
      method: "POST",
      body: JSON.stringify(selectedProvider ? { provider: selectedProvider } : {}),
    });
  },
};
