import { useQuery } from "@tanstack/react-query";
import { billingApi } from "./api";

export const billingKeys = {
  all: ["billing"] as const,
  organization: (organizationId: string) => [...billingKeys.all, organizationId] as const,
  entitlements: (organizationId: string) => [...billingKeys.organization(organizationId), "entitlements"] as const,
};

/** Plan limits and current usage for an organization (drives free-plan usage cards and upgrade prompts). */
export function useEntitlements(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: billingKeys.entitlements(organizationId),
    queryFn: ({ signal }) => billingApi.entitlements(organizationId, signal),
    enabled: enabled && Boolean(organizationId),
  });
}
