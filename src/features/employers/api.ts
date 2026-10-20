import { apiRequest, queryString } from "@/lib/api/client";
import type { PagedResult } from "@/lib/api/paging";
import type {
  Employer,
  EmployerAddressSettings,
  EmployerBillingMode,
  EmployerBillingStatus,
  EmployerCapabilities,
  EmployerInput,
  EmployerPensionPaymentMode,
  EmployerProfileCenterSettings,
} from "@/features/employers/types";

const organizationEmployers = (organizationId: string) => `/api/organizations/${organizationId}/employers`;
const employerPath = (organizationId: string, employerId: string) => `${organizationEmployers(organizationId)}/${employerId}`;

export const employersApi = {
  employers: (organizationId: string, signal?: AbortSignal) =>
    apiRequest<Employer[]>(organizationEmployers(organizationId), { signal }),
  employerSearch: (organizationId: string, search = "", skip = 0, take = 50, signal?: AbortSignal) =>
    apiRequest<PagedResult<Employer>>(`${organizationEmployers(organizationId)}/search${queryString({ search, skip, take })}`, { signal }),
  employer: (organizationId: string, employerId: string, signal?: AbortSignal) =>
    apiRequest<Employer>(employerPath(organizationId, employerId), { signal }),
  employerCapabilities: (organizationId: string, employerId: string, signal?: AbortSignal) =>
    apiRequest<EmployerCapabilities>(`${employerPath(organizationId, employerId)}/capabilities`, { signal }),
  employerProfileCenterSettings: (organizationId: string, employerId: string, signal?: AbortSignal) =>
    apiRequest<EmployerProfileCenterSettings>(`${employerPath(organizationId, employerId)}/profile-center/settings`, { signal }),

  createEmployer: (organizationId: string, payload: EmployerInput) =>
    apiRequest<Employer>(organizationEmployers(organizationId), { method: "POST", body: payload }),
  updateEmployer: (organizationId: string, employerId: string, payload: EmployerInput) =>
    apiRequest<Employer>(employerPath(organizationId, employerId), { method: "PUT", body: payload }),
  updateEmployerStatus: (organizationId: string, employerId: string, status: 2 | 4) =>
    apiRequest<Employer>(`${employerPath(organizationId, employerId)}/status`, { method: "PUT", body: { status } }),
  transferEmployer: (sourceOrganizationId: string, employerId: string, targetOrganizationId: string) =>
    apiRequest<{ employerId: string; organizationId: string }>(`${employerPath(sourceOrganizationId, employerId)}/transfer`, {
      method: "POST", body: { targetOrganizationId },
    }),
  updateEmployerAddress: (organizationId: string, employerId: string, payload: EmployerAddressSettings) =>
    apiRequest<void>(`${employerPath(organizationId, employerId)}/profile-center/address`, { method: "PUT", body: payload }),
  updateEmployerBilling: (organizationId: string, employerId: string, billingMode: EmployerBillingMode, billingStatus?: EmployerBillingStatus) =>
    apiRequest<{ billingMode: EmployerBillingMode; billingStatus: EmployerBillingStatus }>(`${employerPath(organizationId, employerId)}/profile-center/billing`, {
      method: "PUT", body: { billingMode, billingStatus },
    }),
  updateEmployerPensionPaymentMode: (organizationId: string, employerId: string, mode: EmployerPensionPaymentMode) =>
    apiRequest<{ mode: EmployerPensionPaymentMode; modeOverridden: boolean }>(`${employerPath(organizationId, employerId)}/profile-center/pension-payment`, {
      method: "PUT", body: { mode },
    }),
  employerDefaultFunds: (organizationId: string, employerId: string) =>
    apiRequest<{ overridden: boolean; selectedKeys: string[]; systemDefaultKeys: string[]; selectedFunds: { externalKey: string; fundName: string; companyName: string }[]; systemDefaultFunds: { externalKey: string; fundName: string; companyName: string }[] }>(`${employerPath(organizationId, employerId)}/profile-center/default-funds`),
  updateEmployerDefaultFunds: (organizationId: string, employerId: string, fundExternalKeys: string[]) =>
    apiRequest<void>(`${employerPath(organizationId, employerId)}/profile-center/default-funds`, { method: "PUT", body: { fundExternalKeys } }),
  resetEmployerDefaultFunds: (organizationId: string, employerId: string) =>
    apiRequest<void>(`${employerPath(organizationId, employerId)}/profile-center/default-funds`, { method: "DELETE" }),
  updateEmployerReportingSettings: (organizationId: string, employerId: string, payload: EmployerProfileCenterSettings["reporting"]) =>
    apiRequest<void>(`${employerPath(organizationId, employerId)}/profile-center/reporting`, { method: "PUT", body: payload }),
};
