import { appStore, type EmployerSelection } from "./app-store";
import type { Session } from "./types";

const SESSION_KEY = "alpha.session.v1";
const SESSION_META_KEY = "alpha.session.meta.v2";
const EMPLOYER_KEY = "alpha.employer.v1";
const ORGANIZATION_KEY = "alpha.organization.v1";
const EMPLOYEE_KEY = "alpha.employee.v1";

function readSession(): Session | null {
  const value = window.sessionStorage.getItem(SESSION_META_KEY) ?? window.localStorage.getItem(SESSION_KEY);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Session & { accessToken?: string };
    if (parsed.accessToken) {
      const { accessToken: _token, ...safe } = parsed;
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_META_KEY);
      window.sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(safe));
      return safe as Session;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readEmployerSelection(): EmployerSelection | null {
  const value = window.localStorage.getItem(EMPLOYER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as EmployerSelection;
  } catch {
    return null;
  }
}

export function hydrateBrowserState() {
  if (typeof window === "undefined" || appStore.getState().sessionHydrated) return;
  appStore.getState().hydrateBrowserState({
    session: readSession(),
    selectedOrganizationId: window.localStorage.getItem(ORGANIZATION_KEY),
    selectedEmployer: readEmployerSelection(),
    selectedEmployeeId: window.localStorage.getItem(EMPLOYEE_KEY),
  });
}

export function getSession(): Session | null {
  hydrateBrowserState();
  return appStore.getState().session;
}

export function setSession(session: Session) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(session));
  appStore.getState().setSession(session);
}

export function clearSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_META_KEY);
    window.localStorage.removeItem(EMPLOYER_KEY);
    window.localStorage.removeItem(ORGANIZATION_KEY);
    window.localStorage.removeItem(EMPLOYEE_KEY);
  }
  appStore.getState().clearBrowserState();
}

export function setEmployerSelection(organizationId: string, employerId: string) {
  if (typeof window === "undefined") return;
  const selection = { organizationId, employerId };
  window.localStorage.setItem(ORGANIZATION_KEY, organizationId);
  window.localStorage.setItem(EMPLOYER_KEY, JSON.stringify(selection));
  window.localStorage.removeItem(EMPLOYEE_KEY);
  appStore.getState().setOrganizationSelection(organizationId);
  appStore.getState().setEmployerSelection(selection);
  appStore.getState().setEmployeeSelection(null);
}

export function getEmployerSelection(): EmployerSelection | null {
  hydrateBrowserState();
  return appStore.getState().selectedEmployer;
}

export function setOrganizationSelection(organizationId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ORGANIZATION_KEY, organizationId);
  const employer = getEmployerSelection();
  appStore.getState().setOrganizationSelection(organizationId);
  if (employer?.organizationId !== organizationId) {
    window.localStorage.removeItem(EMPLOYER_KEY);
    window.localStorage.removeItem(EMPLOYEE_KEY);
    appStore.getState().setEmployerSelection(null);
    appStore.getState().setEmployeeSelection(null);
  }
}

export function getOrganizationSelection(): string | null {
  hydrateBrowserState();
  return appStore.getState().selectedOrganizationId;
}

export function setEmployeeSelection(employeeId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EMPLOYEE_KEY, employeeId);
  appStore.getState().setEmployeeSelection(employeeId);
}

export function getEmployeeSelection(): string | null {
  hydrateBrowserState();
  return appStore.getState().selectedEmployeeId;
}

export function isPlatformAdminSession(session: Session | null): boolean {
  return session?.platformAdmin === true;
}
