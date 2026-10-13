import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "./api";

export const dashboardKeys = {
  stats: (organizationId?: string, employerId?: string) =>
    ["dashboard", "stats", { organizationId: organizationId ?? null, employerId: employerId ?? null }] as const,
};

export function useDashboardStats(organizationId: string | undefined, employerId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: dashboardKeys.stats(organizationId, employerId),
    queryFn: ({ signal }) => dashboardApi.dashboardStats(organizationId, employerId, signal),
    enabled,
  });
}
