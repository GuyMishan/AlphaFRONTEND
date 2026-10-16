"use client";

import { useQuery } from "@tanstack/react-query";
import { employeesApi } from "@/features/employees/api";
import { employersApi } from "@/features/employers/api";
import { paymentAccountsApi } from "@/features/payment-accounts/api";
import { getScopeContext } from "@/features/scope/scope-context";
import type { EmployerSelection } from "@/lib/session/app-store";
import { manualReportsApi } from "../api";

/** Independent setup reads run together; the query key isolates employer workspaces. */
async function loadReportSetup({ organizationId, employerId }: EmployerSelection) {
  const [employer, employees, capabilities, settings, accounts, scope, drafts] = await Promise.all([
    employersApi.employer(organizationId, employerId),
    employeesApi.employees(organizationId, employerId),
    employersApi.employerCapabilities(organizationId, employerId),
    employersApi.employerProfileCenterSettings(organizationId, employerId),
    paymentAccountsApi.employerPaymentAccounts(organizationId, employerId),
    getScopeContext(),
    manualReportsApi.openManualReports(organizationId, employerId),
  ]);
  const organization = scope.organizations.find(item => item.id === organizationId);
  return {
    employer, employees, capabilities, accounts, drafts,
    defaultSalaryPaymentDay: settings.reporting.defaultSalaryPaymentDay,
    canManageOrganizationBilling: Boolean(organization?.hasOrganizationScope && organization.canManageOrganization),
  };
}

export type ReportSetup = Awaited<ReturnType<typeof loadReportSetup>>;

export function useReportSetup(scope: EmployerSelection) {
  return useQuery({
    queryKey: ["reporting", scope.organizationId, scope.employerId, "wizard-setup"],
    queryFn: () => loadReportSetup(scope),
    enabled: Boolean(scope.organizationId && scope.employerId),
    gcTime: 0,
  });
}
