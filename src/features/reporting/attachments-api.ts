import { apiRequest } from "@/lib/api/client";

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

export type LibraryDocumentCandidate = { id: string; documentTypeCode: 3 | 4 | 5 | 6; originalFileName: string; sizeBytes: number; createdAt: string };

export type ReportAttachmentList = {
  items: ReportAttachment[];
  requiredCode5ProductIds: string[];
  eligibleCode5ProductIds: string[];
  annualEmployerAffidavitSatisfied: boolean;
  documentTypes: { code: 3 | 4 | 5 | 6; name: string; scope: "report" | "product" }[];
};

export const reportAttachmentsApi = {
  list(organizationId: string, employerId: string, reportId: string) {
    return apiRequest<ReportAttachmentList>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/attachments`);
  },

  upload(organizationId: string, employerId: string, reportId: string, documentTypeCode: 3 | 4 | 5 | 6,
    file: File, reportProductId?: string | null) {
    const form = new FormData();
    form.set("file", file);
    form.set("documentTypeCode", String(documentTypeCode));
    if (reportProductId) form.set("reportProductId", reportProductId);
    return apiRequest<ReportAttachment>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/attachments`, { method: "POST", body: form });
  },

  libraryCandidates(organizationId: string, employerId: string, reportId: string, reportProductId: string) {
    const url = `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/attachments/library-candidates?reportProductId=${encodeURIComponent(reportProductId)}`;
    return apiRequest<LibraryDocumentCandidate[]>(url);
  },

  attachFromLibrary(organizationId: string, employerId: string, reportId: string,
    employerDocumentId: string, reportProductId: string | null) {
    return apiRequest<ReportAttachment>(
      `/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/attachments/from-library`,
      { method: "POST", body: { employerDocumentId, reportProductId } });
  },

  async remove(organizationId: string, employerId: string, reportId: string, attachmentId: string) {
    await apiRequest<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/attachments/${attachmentId}`, { method: "DELETE" });
  },
};
