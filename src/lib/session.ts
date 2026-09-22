import type { Session } from "./types";

const SESSION_KEY = "alpha.session.v1";
const EMPLOYER_KEY = "alpha.employer.v1";
const ORGANIZATION_KEY = "alpha.organization.v1";
const EMPLOYEE_KEY = "alpha.employee.v1";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(SESSION_KEY);
  if (!value) return null;
  try { return JSON.parse(value) as Session; } catch { return null; }
}

export function setSession(session: Session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(EMPLOYER_KEY);
  window.localStorage.removeItem(ORGANIZATION_KEY);
  window.localStorage.removeItem(EMPLOYEE_KEY);
}

export function setEmployerSelection(organizationId: string, employerId: string) {
  window.localStorage.setItem(ORGANIZATION_KEY, organizationId);
  window.localStorage.setItem(EMPLOYER_KEY, JSON.stringify({ organizationId, employerId }));
  window.localStorage.removeItem(EMPLOYEE_KEY);
}

export function getEmployerSelection(): { organizationId: string; employerId: string } | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(EMPLOYER_KEY);
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

export function setOrganizationSelection(organizationId: string) {
  window.localStorage.setItem(ORGANIZATION_KEY, organizationId);
  const employer = getEmployerSelection();
  if (employer?.organizationId !== organizationId) {
    window.localStorage.removeItem(EMPLOYER_KEY);
    window.localStorage.removeItem(EMPLOYEE_KEY);
  }
}

export function getOrganizationSelection(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ORGANIZATION_KEY);
}

export function setEmployeeSelection(employeeId: string) {
  window.localStorage.setItem(EMPLOYEE_KEY, employeeId);
}

export function getEmployeeSelection(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(EMPLOYEE_KEY);
}


export function isPlatformAdminSession(session: Session | null): boolean {
  if (!session) return false;
  if (session.platformAdmin === true) return true;
  if (!session.accessToken) return false;

  try {
    const payloadPart = session.accessToken.split(".")[1];
    if (!payloadPart) return false;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(window.atob(padded)) as Record<string, unknown>;
    return payload["alpha:platform_admin"] === "true" || payload["alpha:platform_admin"] === true;
  } catch {
    return false;
  }
}
