import { apiRequest as request } from "@/lib/api/client";
import type { ManualReportKind } from "@/features/reporting/types";


export type EmployerInterfaceDocumentType =
  | "CurrentReport"
  | "NegativeReport"
  | "SummaryFeedback"
  | "AnnualSummaryFeedback";

export type EmployerInterfaceUploadValidation = {
  isValid: boolean;
  documentType?: EmployerInterfaceDocumentType | string | null;
  version?: string | null;
  schemaFileName?: string | null;
  issues: string[];
  fileName?: string | null;
  fileHash?: string | null;
};

export type EmployerInterfaceImportResult = {
  reportId?: string | null;
  feedbackId?: string | null;
  documentType?: EmployerInterfaceDocumentType | string | null;
  importedEmployees: number;
  unmatchedRows: number;
  validation: EmployerInterfaceUploadValidation;
  fileName?: string | null;
  fileHash?: string | null;
};

export type EmployerInterfaceOption = {
  code: number;
  name: string;
  scope: string;
};

export type EmployerInterfaceEmployerProfile = {
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  contactEmail: string;
  contactMobile: string;
};

export type EmployerInterfaceEmployeeProfile = {
  birthDate: string | null;
  gender: number | null;
  email: string;
  mobile: string;
  city: string;
  street: string;
  houseNumber: string;
  apartment: string;
  postalCode: string;
  postOfficeBox: string;
};

export type EmployerInterfaceProductMetadata = {
  reportKind: ManualReportKind | number | string;
  operationCode: number | null;
  depositStatus: number | null;
  employeeStatus: number | null;
  statusStartDate: string | null;
  employmentPercentage: number | null;
  workDaysInMonth: number | null;
  lastDeposit: number | null;
  refundReason: number | null;
  collectiveAgreementRefund: boolean | null;
  paymentMethodCode: number | null;
  employerAccountType: number | null;
  receiverAccountType: number | null;
  oldPensionTypeCode: number | null;
};

export type EmployerInterfaceProductMetadataInput = Omit<EmployerInterfaceProductMetadata, "reportKind">;

export type EmployerInterfacePreviousReference = {
  previousIdentifier: string;
  previousClearingIdentifier: string;
  previousReferenceExceptionCode: number | null;
};

export type EmployerInterfacePreflight = {
  isValid: boolean;
  reportKind: ManualReportKind | number | string;
  transmittable: boolean;
  documentType?: string | null;
  version?: string | null;
  schemaFileName?: string | null;
  issues: string[];
};

function uploadEmployerInterface<T>(path: string, file: File, fields?: Record<string, string>): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  Object.entries(fields ?? {}).forEach(([key, value]) => body.append(key, value));
  return request<T>(path, { method: "POST", body });
}

function employerPath(organizationId: string, employerId: string) {
  return `/api/organizations/${organizationId}/employers/${employerId}/employer-interface`;
}

export const employerInterfaceApi = {
  validateUpload: (organizationId: string, employerId: string, file: File) =>
    uploadEmployerInterface<EmployerInterfaceUploadValidation>(`${employerPath(organizationId, employerId)}/validate`, file),
  importUpload: (organizationId: string, employerId: string, file: File, paymentAccountId: string, salaryPaymentDate: string) =>
    uploadEmployerInterface<EmployerInterfaceImportResult>(`${employerPath(organizationId, employerId)}/import`, file, { paymentAccountId, salaryPaymentDate }),
  optionsBundle: (categories: string[]) => {
    const params = new URLSearchParams({ categories: Array.from(new Set(categories)).join(",") });
    return request<Record<string, EmployerInterfaceOption[]>>(`/api/reference-data/employer-interface-006/options-bundle?${params}`);
  },
  options: (category: string, scope = "all", operationCode?: number | null) => {
    const params = new URLSearchParams({ category, scope });
    if (operationCode != null) params.set("operationCode", String(operationCode));
    return request<EmployerInterfaceOption[]>(`/api/reference-data/employer-interface-006/options?${params}`);
  },
  employerProfile: (organizationId: string, employerId: string) =>
    request<EmployerInterfaceEmployerProfile>(`${employerPath(organizationId, employerId)}/profile`),
  updateEmployerProfile: (organizationId: string, employerId: string, payload: EmployerInterfaceEmployerProfile) =>
    request<EmployerInterfaceEmployerProfile>(`${employerPath(organizationId, employerId)}/profile`, { method: "PUT", body: payload }),
  employeeProfile: (organizationId: string, employerId: string, employmentId: string) =>
    request<EmployerInterfaceEmployeeProfile>(`${employerPath(organizationId, employerId)}/employees/${employmentId}/profile`),
  updateEmployeeProfile: (organizationId: string, employerId: string, employmentId: string, payload: EmployerInterfaceEmployeeProfile) =>
    request<EmployerInterfaceEmployeeProfile>(`${employerPath(organizationId, employerId)}/employees/${employmentId}/profile`, { method: "PUT", body: payload }),
  productMetadata: (organizationId: string, employerId: string, reportId: string, productId: string) =>
    request<EmployerInterfaceProductMetadata>(`${employerPath(organizationId, employerId)}/reports/${reportId}/products/${productId}/metadata`),
  updateProductMetadata: (organizationId: string, employerId: string, reportId: string, productId: string, payload: EmployerInterfaceProductMetadataInput) =>
    request<EmployerInterfaceProductMetadata>(`${employerPath(organizationId, employerId)}/reports/${reportId}/products/${productId}/metadata`, { method: "PUT", body: payload }),
  previousReference: (organizationId: string, employerId: string, reportId: string, productId: string) =>
    request<EmployerInterfacePreviousReference>(`${employerPath(organizationId, employerId)}/reports/${reportId}/products/${productId}/previous-reference`),
  updatePreviousReference: (organizationId: string, employerId: string, reportId: string, productId: string, payload: EmployerInterfacePreviousReference) =>
    request<EmployerInterfacePreviousReference>(`${employerPath(organizationId, employerId)}/reports/${reportId}/products/${productId}/previous-reference`, { method: "PUT", body: payload }),
  preflight: (organizationId: string, employerId: string, reportId: string) =>
    request<EmployerInterfacePreflight>(`${employerPath(organizationId, employerId)}/reports/${reportId}/preflight`),
};
