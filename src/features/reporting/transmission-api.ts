import { apiRequest, type ApiRequestOptions } from "@/lib/api/client";
import { employerInterfaceApi } from "@/features/reporting/employer-interface-api";

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
  employerAgreementRequired?: boolean;
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

// Transmission-specific wording for billing gates (takes precedence over backend detail).
const transmissionMessages = {
  EMPLOYER_LEGAL_AGREEMENT_REQUIRED: "נדרש הסכם התקשרות עם ALPHA לפני שידור דיווחים. העלו אותו בטאב מסמכים בפרופיל המעסיק.",
  BILLING_ACCOUNT_REQUIRED: "לא הוגדרו פרטי חיוב עבור הגורם שמחויב בפועל.",
  BILLING_PAYMENT_METHOD_NOT_ACTIVE: "אמצעי התשלום של Alpha אינו פעיל ולכן לא ניתן לשדר דיווחים.",
  BILLING_PAYMENT_METHOD_REFERENCE_REQUIRED: "אמצעי התשלום מסומן כפעיל אך חסר token או mandate reference תקין.",
};

function request<T>(path: string, options: Omit<ApiRequestOptions, "messages"> = {}): Promise<T> {
  return apiRequest<T>(path, { ...options, messages: transmissionMessages });
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
      body: selectedProvider ? { provider: selectedProvider } : {},
    });
  },
};
