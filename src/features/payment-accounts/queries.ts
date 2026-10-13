import { useQuery } from "@tanstack/react-query";
import { employerKeys } from "@/features/employers/queries";
import { paymentAccountsApi } from "./api";

export const paymentAccountKeys = {
  employerAccounts: (organizationId: string, employerId: string) =>
    [...employerKeys.detail(organizationId, employerId), "payment-accounts"] as const,
};

export function useEmployerPaymentAccounts(organizationId: string, employerId: string) {
  return useQuery({
    queryKey: paymentAccountKeys.employerAccounts(organizationId, employerId),
    queryFn: ({ signal }) => paymentAccountsApi.employerPaymentAccounts(organizationId, employerId, signal),
    enabled: Boolean(organizationId && employerId),
  });
}
