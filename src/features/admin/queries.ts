import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/features/billing/api";
import { adminApi } from "./api";

/** Platform-administration data (never tenant-scoped). */
export const adminKeys = {
  all: ["platform-admin"] as const,
  integrations: () => [...adminKeys.all, "reference-data-integrations"] as const,
  integrationRuns: (key: string) => [...adminKeys.integrations(), key, "runs"] as const,
  billingCustomers: () => [...adminKeys.all, "billing-customers"] as const,
  platformUsers: () => [...adminKeys.all, "users"] as const,
  referents: () => [...adminKeys.all, "referents"] as const,
};

export function useReferenceDataIntegrations(enabled: boolean) {
  return useQuery({ queryKey: adminKeys.integrations(), queryFn: () => adminApi.referenceDataIntegrations(), enabled });
}

export function useBillingCustomers(enabled: boolean) {
  return useQuery({ queryKey: adminKeys.billingCustomers(), queryFn: ({ signal }) => billingApi.billingCustomers(signal), enabled });
}

export function useRunReferenceDataIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => adminApi.runReferenceDataIntegration(key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.integrations() }),
  });
}

export function usePlatformUsers(enabled: boolean) {
  return useQuery({ queryKey: adminKeys.platformUsers(), queryFn: () => adminApi.platformUsers(), enabled });
}

export function useReferents() {
  return useQuery({ queryKey: adminKeys.referents(), queryFn: () => adminApi.referents() });
}
