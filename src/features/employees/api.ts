import { apiRequest, queryString } from "@/lib/api/client";
import { collectPages, type PagedResult } from "@/lib/api/paging";
import type { Employee, EmployeeInput } from "@/features/employees/types";
import type { EmployeePensionProduct, EmployeePensionProductInput } from "@/features/pension/types";

const employeesPath = (organizationId: string, employerId: string) =>
  `/api/organizations/${organizationId}/employers/${employerId}/employees`;

export const employeesApi = {
  employees: (organizationId: string, employerId: string, signal?: AbortSignal) =>
    collectPages((skip) => employeesApi.employeeSearch(organizationId, employerId, "", skip, 100, signal)),
  employeeSearch: (organizationId: string, employerId: string, search = "", skip = 0, take = 50, signal?: AbortSignal) =>
    apiRequest<PagedResult<Employee>>(`${employeesPath(organizationId, employerId)}/search${queryString({ search, skip, take })}`, { signal }),
  employee: (organizationId: string, employerId: string, employeeId: string, signal?: AbortSignal) =>
    apiRequest<Employee>(`${employeesPath(organizationId, employerId)}/${employeeId}`, { signal }),
  createEmployee: (organizationId: string, employerId: string, payload: EmployeeInput) =>
    apiRequest<{ id: string; personId: string }>(employeesPath(organizationId, employerId), { method: "POST", body: payload }),
  updateEmployee: (organizationId: string, employerId: string, employeeId: string, payload: EmployeeInput) =>
    apiRequest<Employee>(`${employeesPath(organizationId, employerId)}/${employeeId}`, { method: "PUT", body: payload }),

  employeePensionMix: (organizationId: string, employerId: string, employeeId: string, signal?: AbortSignal) =>
    apiRequest<EmployeePensionProduct[]>(`${employeesPath(organizationId, employerId)}/${employeeId}/pension-mix`, { signal }),
  saveEmployeePensionMix: (organizationId: string, employerId: string, employeeId: string, products: EmployeePensionProductInput[], monthlySalary?: number) =>
    apiRequest<void>(`${employeesPath(organizationId, employerId)}/${employeeId}/pension-mix`, { method: "PUT", body: { products, monthlySalary } }),
};
