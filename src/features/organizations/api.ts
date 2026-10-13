import { apiRequest } from "@/lib/api/client";
import type {
  Organization,
  OrganizationCapabilities,
  OrganizationEmployerBilling,
  OrganizationMemberSummary,
  OrganizationProfileCenter,
} from "@/features/organizations/types";

export type OrganizationGeneralInput = {
  name: string; type: number; registrationNumber: string; city: string; street: string;
  houseNumber: string; apartment: string; postalCode: string; postOfficeBox: string;
  contactName: string; contactEmail: string; contactPhone: string;
};

const organizationPath = (organizationId: string) => `/api/organizations/${organizationId}`;

export const organizationsApi = {
  organizations: (signal?: AbortSignal) => apiRequest<Organization[]>("/api/organizations", { signal }),
  capabilities: (organizationId: string, signal?: AbortSignal) =>
    apiRequest<OrganizationCapabilities>(`${organizationPath(organizationId)}/capabilities`, { signal }),
  organizationProfile: (organizationId: string, signal?: AbortSignal) =>
    apiRequest<OrganizationProfileCenter>(`${organizationPath(organizationId)}/profile-center`, { signal }),
  organizationMembers: (organizationId: string, signal?: AbortSignal) =>
    apiRequest<OrganizationMemberSummary[]>(`${organizationPath(organizationId)}/profile-center/members`, { signal }),
  organizationEmployerBilling: (organizationId: string, signal?: AbortSignal) =>
    apiRequest<OrganizationEmployerBilling[]>(`${organizationPath(organizationId)}/profile-center/employer-billing`, { signal }),

  createOrganization: (payload: { name: string; type: number }) =>
    apiRequest<Organization>("/api/organizations", { method: "POST", body: payload }),
  updateOrganizationGeneral: (organizationId: string, payload: OrganizationGeneralInput) =>
    apiRequest<void>(`${organizationPath(organizationId)}/profile-center/general`, { method: "PUT", body: payload }),
};
