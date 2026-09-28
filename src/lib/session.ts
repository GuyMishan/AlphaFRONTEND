import type { Session } from "./types";

const SESSION_KEY = "alpha.session.v1";
const SESSION_META_KEY = "alpha.session.meta.v2";
const EMPLOYER_KEY = "alpha.employer.v1";
const ORGANIZATION_KEY = "alpha.organization.v1";
const EMPLOYEE_KEY = "alpha.employee.v1";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(SESSION_META_KEY) ?? window.localStorage.getItem(SESSION_KEY);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Session;
    // Migrate legacy sessions: never retain bearer tokens in browser storage.
    if ((parsed as Session & { accessToken?: string }).accessToken) {
      const { accessToken: _token, ...safe } = parsed as Session & { accessToken?: string };
      window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_META_KEY);
      window.sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(safe));
      return safe as Session;
    }
    return parsed;
  } catch { return null; }
}

export function setSession(session: Session) {
  const safe = session;
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(safe));
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
  return session?.platformAdmin === true;
}
