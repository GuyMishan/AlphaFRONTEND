import { apiRequest, queryString } from "@/lib/api/client";
import type { DashboardStats } from "@/features/dashboard/types";

export const dashboardApi = {
  /** System-wide (platform admin), organization-wide, or employer-level counts depending on the ids given. */
  dashboardStats: (organizationId?: string, employerId?: string, signal?: AbortSignal) =>
    apiRequest<DashboardStats>(`/api/dashboard/stats${queryString({ organizationId, employerId })}`, { signal }),
};
