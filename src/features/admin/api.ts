import { apiRequest } from "@/lib/api/client";
import type { PlatformUser, Referent } from "@/features/admin/types";
import type { IntegrationRow, RunDetail } from "./types";

export const adminApi = {
  referents: (): Promise<Referent[]> => apiRequest<Referent[]>("/api/platform/referents"),
  saveReferent: (userId: string, payload: { enabled: boolean; organizationIds: string[]; employerIds: string[] }): Promise<{ userId: string }> =>
    apiRequest<{ userId: string }>(`/api/platform/referents/${userId}`, { method: "PUT", body: payload }),
  platformUsers: (): Promise<PlatformUser[]> => apiRequest<PlatformUser[]>("/api/platform/users"),
  createPlatformUser: (payload: { email: string; displayName: string; nationalId: string; phone: string }): Promise<PlatformUser> =>
    apiRequest<PlatformUser>("/api/platform/users", { method: "POST", body: payload }),
  updatePlatformUser: (userId: string, payload: { email: string; displayName: string; isActive: boolean; isPlatformAdmin: boolean }) =>
    apiRequest<void>(`/api/platform/users/${userId}`, { method: "PUT", body: payload }),
  manufacturerContacts: (): Promise<Array<{ manufacturerName: string; email: string; isVerified: boolean; companyCount: number }>> =>
    apiRequest("/api/platform/reference-data/manufacturer-contacts"),
  saveManufacturerContact: (name: string, email: string, isVerified: boolean) =>
    apiRequest(`/api/platform/reference-data/manufacturer-contacts/${encodeURIComponent(name)}`, { method: "PUT", body: { email, isVerified } }),
  productContactOverrides: (search = ""): Promise<Array<{
    externalKey: string; fundName: string; companyName: string; manufacturerName: string;
    overrideEmail: string; overrideVerified: boolean; manufacturerEmail: string;
    manufacturerVerified: boolean; effectiveEmail: string; source: string;
  }>> =>
    apiRequest(`/api/platform/reference-data/product-contact-overrides?${new URLSearchParams({ search, take: "200" })}`),
  saveProductContactOverride: (key: string, email: string, isVerified: boolean) =>
    apiRequest(`/api/platform/reference-data/product-contact-overrides/${encodeURIComponent(key)}`, { method: "PUT", body: { email, isVerified } }),
  referenceDataIntegrations: () => apiRequest<IntegrationRow[]>("/api/platform/reference-data/interfaces"),
  runReferenceDataIntegration: (key: string) =>
    apiRequest<RunDetail>(`/api/platform/reference-data/interfaces/${key}/run`, { method: "POST" }),
  referenceDataIntegrationRuns: (key: string, take = 30) =>
    apiRequest<RunDetail[]>(`/api/platform/reference-data/interfaces/${key}/runs?take=${take}`),
};
