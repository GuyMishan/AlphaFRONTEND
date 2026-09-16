import { getSession } from "./session";
import type { ManualReportKind } from "./types";

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
  paymentMethodCode: number | null;
  employerAccountType: number | null;
  receiverAccountType: number | null;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
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
      message = problem?.detail ?? problem?.error ?? problem?.title ?? message;
    } catch { /* empty response */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function employerPath(organizationId: string, employerId: string) {
  return `/api/organizations/${organizationId}/employers/${employerId}/employer-interface`;
}

export const employerInterfaceApi = {
  options: (category: string, scope = "all") => {
    const params = new URLSearchParams({ category, scope });
    return request<EmployerInterfaceOption[]>(`/api/reference-data/employer-interface-006/options?${params}`);
  },
  employerProfile: (organizationId: string, employerId: string) =>
    request<EmployerInterfaceEmployerProfile>(`${employerPath(organizationId, employerId)}/profile`),
  updateEmployerProfile: (organizationId: string, employerId: string, payload: EmployerInterfaceEmployerProfile) =>
    request<EmployerInterfaceEmployerProfile>(`${employerPath(organizationId, employerId)}/profile`, { method: "PUT", body: JSON.stringify(payload) }),
  employeeProfile: (organizationId: string, employerId: string, employmentId: string) =>
    request<EmployerInterfaceEmployeeProfile>(`${employerPath(organizationId, employerId)}/employees/${employmentId}/profile`),
  updateEmployeeProfile: (organizationId: string, employerId: string, employmentId: string, payload: EmployerInterfaceEmployeeProfile) =>
    request<EmployerInterfaceEmployeeProfile>(`${employerPath(organizationId, employerId)}/employees/${employmentId}/profile`, { method: "PUT", body: JSON.stringify(payload) }),
  productMetadata: (organizationId: string, employerId: string, reportId: string, productId: string) =>
    request<EmployerInterfaceProductMetadata>(`${employerPath(organizationId, employerId)}/reports/${reportId}/products/${productId}/metadata`),
  updateProductMetadata: (organizationId: string, employerId: string, reportId: string, productId: string, payload: EmployerInterfaceProductMetadataInput) =>
    request<EmployerInterfaceProductMetadata>(`${employerPath(organizationId, employerId)}/reports/${reportId}/products/${productId}/metadata`, { method: "PUT", body: JSON.stringify(payload) }),
  previousReference: (organizationId: string, employerId: string, reportId: string, productId: string) =>
    request<EmployerInterfacePreviousReference>(`${employerPath(organizationId, employerId)}/reports/${reportId}/products/${productId}/previous-reference`),
  updatePreviousReference: (organizationId: string, employerId: string, reportId: string, productId: string, payload: EmployerInterfacePreviousReference) =>
    request<EmployerInterfacePreviousReference>(`${employerPath(organizationId, employerId)}/reports/${reportId}/products/${productId}/previous-reference`, { method: "PUT", body: JSON.stringify(payload) }),
  preflight: (organizationId: string, employerId: string, reportId: string) =>
    request<EmployerInterfacePreflight>(`${employerPath(organizationId, employerId)}/reports/${reportId}/preflight`),
};
