import { getSession } from "./session";
import type { ApiProblem, Employee, EmployeeInput, Employer, EmployerCapabilities, EmployerInput, Organization, OrganizationCapabilities } from "./types";
import { demoEmployees, demoEmployers, demoOrganizations } from "./demo-data";

export class ApiError extends Error {
  constructor(public status: number, message: string, public problem?: ApiProblem) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (session?.mode === "development" && session.userId) {
    headers.set("X-Alpha-User-Id", session.userId);
    if (session.platformAdmin) headers.set("X-Alpha-Platform-Admin", "true");
  }

  const response = await fetch(`/api/backend${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    let problem: ApiProblem | undefined;
    try { problem = await response.json(); } catch { /* empty response */ }
    const message = problem?.detail ?? problem?.error ?? problem?.title ?? `שגיאת שרת (${response.status})`;
    throw new ApiError(response.status, message, problem);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const alphaApi = {
  health: () => request<{ status: string; service: string }>("/health"),
  organizations: (): Promise<Organization[]> => getSession()?.mode === "demo"
    ? Promise.resolve(demoOrganizations)
    : request<Organization[]>("/api/organizations/"),
  employers: (organizationId: string): Promise<Employer[]> => getSession()?.mode === "demo"
    ? Promise.resolve(demoEmployers.filter((item) => item.organizationId === organizationId))
    : request<Employer[]>(`/api/organizations/${organizationId}/employers/`),
  employer: (organizationId: string, employerId: string): Promise<Employer> => getSession()?.mode === "demo"
    ? Promise.resolve(demoEmployers.find((item) => item.id === employerId && item.organizationId === organizationId)!)
    : request<Employer>(`/api/organizations/${organizationId}/employers/${employerId}`),
  capabilities: (organizationId: string): Promise<OrganizationCapabilities> => getSession()?.mode === "demo"
    ? Promise.resolve({ canCreateEmployer: true })
    : request<OrganizationCapabilities>(`/api/organizations/${organizationId}/capabilities`),
  employerCapabilities: (organizationId: string, employerId: string): Promise<EmployerCapabilities> => getSession()?.mode === "demo"
    ? Promise.resolve({ canCreateEmployee: true })
    : request<EmployerCapabilities>(`/api/organizations/${organizationId}/employers/${employerId}/capabilities`),
  createEmployer: (organizationId: string, payload: EmployerInput) => getSession()?.mode === "demo"
    ? Promise.resolve({ id: crypto.randomUUID(), organizationId, ...payload, status: 1 } as Employer)
    : request<Employer>(`/api/organizations/${organizationId}/employers/`, { method: "POST", body: JSON.stringify(payload) }),
  updateEmployer: (organizationId: string, employerId: string, payload: EmployerInput) => getSession()?.mode === "demo"
    ? Promise.resolve({ id: employerId, organizationId, ...payload, status: 2 } as Employer)
    : request<Employer>(`/api/organizations/${organizationId}/employers/${employerId}`, { method: "PUT", body: JSON.stringify(payload) }),
  employees: (organizationId: string, employerId: string): Promise<Employee[]> => getSession()?.mode === "demo"
    ? Promise.resolve(demoEmployers.some((item) => item.id === employerId && item.organizationId === organizationId) ? demoEmployees : [])
    : request<Employee[]>(`/api/organizations/${organizationId}/employers/${employerId}/employees`),
  employee: (organizationId: string, employerId: string, employeeId: string): Promise<Employee> => getSession()?.mode === "demo"
    ? Promise.resolve(demoEmployees.find((item) => item.id === employeeId)!)
    : request<Employee>(`/api/organizations/${organizationId}/employers/${employerId}/employees/${employeeId}`),
  createEmployee: (organizationId: string, employerId: string, payload: EmployeeInput) => getSession()?.mode === "demo"
    ? Promise.resolve({ id: crypto.randomUUID(), personId: crypto.randomUUID(), ...payload, status: 1, endDate: null } as Employee)
    : request<{ id: string; personId: string }>(`/api/organizations/${organizationId}/employers/${employerId}/employees`, { method: "POST", body: JSON.stringify(payload) }),
  updateEmployee: (organizationId: string, employerId: string, employeeId: string, payload: EmployeeInput) => getSession()?.mode === "demo"
    ? Promise.resolve({ id: employeeId, personId: employeeId, ...payload, status: 1, endDate: null } as Employee)
    : request<Employee>(`/api/organizations/${organizationId}/employers/${employerId}/employees/${employeeId}`, { method: "PUT", body: JSON.stringify(payload) }),
  createUser: (payload: { externalSubject: string; email: string; displayName: string }) =>
    request<{ id: string }>("/api/platform/users", { method: "POST", body: JSON.stringify(payload) }),
};
