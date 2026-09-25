import { getSession } from "@/lib/session";

export type ReportAttachment = {
  id: string;
  reportProductId: string | null;
  documentTypeCode: 3 | 4 | 5 | 6;
  originalFileName: string;
  transmissionFileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
};

export type ReportAttachmentList = {
  items: ReportAttachment[];
  annualEmployerAffidavitSatisfied: boolean;
  documentTypes: { code: 3 | 4 | 5 | 6; name: string; scope: "report" | "product" }[];
};

async function authHeaders() {
  const session = getSession();
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  return headers;
}

async function parseError(response: Response) {
  try {
    const body = await response.json() as { error?: string; detail?: string };
    return body.error || body.detail || `אירעה שגיאה (${response.status})`;
  } catch {
    return `אירעה שגיאה (${response.status})`;
  }
}

export const reportAttachmentsApi = {
  async list(organizationId: string, employerId: string, reportId: string) {
    const response = await fetch(
      `/api/backend/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/attachments`,
      { headers: await authHeaders(), cache: "no-store" },
    );
    if (!response.ok) throw new Error(await parseError(response));
    return response.json() as Promise<ReportAttachmentList>;
  },

  async upload(organizationId: string, employerId: string, reportId: string, documentTypeCode: 3 | 4 | 5 | 6,
    file: File, reportProductId?: string | null) {
    const form = new FormData();
    form.set("file", file);
    form.set("documentTypeCode", String(documentTypeCode));
    if (reportProductId) form.set("reportProductId", reportProductId);
    const response = await fetch(
      `/api/backend/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/attachments`,
      { method: "POST", headers: await authHeaders(), body: form },
    );
    if (!response.ok) throw new Error(await parseError(response));
    return response.json() as Promise<ReportAttachment>;
  },

  async remove(organizationId: string, employerId: string, reportId: string, attachmentId: string) {
    const response = await fetch(
      `/api/backend/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/attachments/${attachmentId}`,
      { method: "DELETE", headers: await authHeaders() },
    );
    if (!response.ok) throw new Error(await parseError(response));
  },

  fileUrl: (organizationId: string, employerId: string, reportId: string, attachmentId: string) =>
    `/api/backend/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/attachments/${attachmentId}/file`,
};
