import { apiBlob, apiRequest } from "@/lib/api/client";

export type EmployerDocument = {
  id: string;
  documentTypeCode: number;
  employmentId: string | null;
  employeePensionProductId: string | null;
  originalFileName: string;
  sizeBytes: number;
  createdAt: string;
};

export type EmployerDocumentScope = { employmentId?: string; employeePensionProductId?: string };

const base = (organizationId: string, employerId: string) =>
  `/api/organizations/${organizationId}/employers/${employerId}/documents`;

function scopeQuery(scope: EmployerDocumentScope) {
  const params = new URLSearchParams();
  if (scope.employmentId) params.set("employmentId", scope.employmentId);
  if (scope.employeePensionProductId) params.set("employeePensionProductId", scope.employeePensionProductId);
  return params.size ? `?${params}` : "";
}

/** Employer and employee pension-product documents (PDF library). */
export const employerDocumentsApi = {
  list: (organizationId: string, employerId: string, scope: EmployerDocumentScope = {}) =>
    apiRequest<EmployerDocument[]>(`${base(organizationId, employerId)}${scopeQuery(scope)}`),
  upload: (organizationId: string, employerId: string, file: File, documentTypeCode: number, scope: EmployerDocumentScope = {}) => {
    const body = new FormData();
    body.set("file", file);
    body.set("documentTypeCode", String(documentTypeCode));
    if (scope.employmentId) body.set("employmentId", scope.employmentId);
    if (scope.employeePensionProductId) body.set("employeePensionProductId", scope.employeePensionProductId);
    return apiRequest<EmployerDocument>(base(organizationId, employerId), { method: "POST", body, fallbackMessage: "שמירת המסמך נכשלה" });
  },
  remove: (organizationId: string, employerId: string, documentId: string) =>
    apiRequest<void>(`${base(organizationId, employerId)}/${documentId}`, { method: "DELETE", fallbackMessage: "המחיקה נכשלה" }),
  assignProduct: (organizationId: string, employerId: string, documentId: string, employeePensionProductId: string) =>
    apiRequest<void>(`${base(organizationId, employerId)}/${documentId}/product`, {
      method: "PATCH", body: { employeePensionProductId }, fallbackMessage: "שיוך המסמך לקרן נכשל.",
    }),
  download: (organizationId: string, employerId: string, documentId: string) =>
    apiBlob(`${base(organizationId, employerId)}/${documentId}/file`, { fallbackMessage: "הורדת המסמך נכשלה" }),
};
