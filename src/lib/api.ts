import { getSession } from "./session";
import type { ApiProblem, Employee, Employer, Organization } from "./types";

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
  organizations: () => request<Organization[]>("/api/organizations/"),
  employers: (organizationId: string) => request<Employer[]>(`/api/organizations/${organizationId}/employers/`),
  employees: (organizationId: string, employerId: string) =>
    request<Employee[]>(`/api/organizations/${organizationId}/employers/${employerId}/employees`),
  createUser: (payload: { externalSubject: string; email: string; displayName: string }) =>
    request<{ id: string }>("/api/platform/users", { method: "POST", body: JSON.stringify(payload) }),
};
