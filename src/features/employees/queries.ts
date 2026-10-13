import { useQuery, type QueryClient } from "@tanstack/react-query";
import { billingKeys } from "@/features/billing/queries";
import { employerKeys } from "@/features/employers/queries";
import { employeesApi } from "./api";

/** Employee keys live under their employer, so invalidating an employer covers its employees. */
export const employeeKeys = {
  employer: (organizationId: string, employerId: string) => [...employerKeys.detail(organizationId, employerId), "employees"] as const,
  list: (organizationId: string, employerId: string) => [...employeeKeys.employer(organizationId, employerId), "list"] as const,
  detail: (organizationId: string, employerId: string, employeeId: string) =>
    [...employeeKeys.employer(organizationId, employerId), employeeId] as const,
};

export function useEmployee(organizationId: string, employerId: string, employeeId: string) {
  return useQuery({
    queryKey: employeeKeys.detail(organizationId, employerId, employeeId),
    queryFn: ({ signal }) => employeesApi.employee(organizationId, employerId, employeeId, signal),
    enabled: Boolean(organizationId && employerId && employeeId),
  });
}

/** All employees of an employer (used by the scope controller's employee selector). */
export function useEmployees(organizationId: string, employerId: string, enabled = true) {
  return useQuery({
    queryKey: employeeKeys.list(organizationId, employerId),
    queryFn: ({ signal }) => employeesApi.employees(organizationId, employerId, signal),
    enabled: enabled && Boolean(organizationId && employerId),
  });
}

/** Refreshes cached employee data and plan usage after an employee was created or edited. */
export function invalidateEmployeeData(queryClient: QueryClient, organizationId: string, employerId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: employeeKeys.employer(organizationId, employerId) }),
    queryClient.invalidateQueries({ queryKey: billingKeys.organization(organizationId) }),
  ]);
}
