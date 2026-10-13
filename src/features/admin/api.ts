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
  referenceDataIntegrations: () => apiRequest<IntegrationRow[]>("/api/platform/reference-data/interfaces"),
  runReferenceDataIntegration: (key: string) =>
    apiRequest<RunDetail>(`/api/platform/reference-data/interfaces/${key}/run`, { method: "POST" }),
  referenceDataIntegrationRuns: (key: string, take = 30) =>
    apiRequest<RunDetail[]>(`/api/platform/reference-data/interfaces/${key}/runs?take=${take}`),
};
