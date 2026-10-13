import { appStore, type EmployerSelection } from "@/lib/session/app-store";
import { getQueryClient } from "@/lib/query/query-client";
import type { Session } from "@/lib/session/types";
import { SESSION_META_STORAGE_KEY } from "@/lib/session/storage-keys";

const SESSION_KEY = "alpha.session.v1";
const SESSION_META_KEY = SESSION_META_STORAGE_KEY;
const EMPLOYER_KEY = "alpha.employer.v1";
const ORGANIZATION_KEY = "alpha.organization.v1";
const EMPLOYEE_KEY = "alpha.employee.v1";

/**
 * Session presentation metadata only (user id, display name, admin/referent flags).
 * The bearer token lives exclusively in the HttpOnly `alpha_access` cookie.
 */
function readSession(): Session | null {
  const value = window.sessionStorage.getItem(SESSION_META_KEY) ?? window.localStorage.getItem(SESSION_KEY);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Session & { accessToken?: string };
    // Older builds persisted the token or used non-OIDC demo/development modes: never trust those.
    if (parsed.accessToken || parsed.mode !== "oidc") {
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_META_KEY);
      if (parsed.mode !== "oidc") return null;
      const safe: Session = { mode: "oidc", userId: parsed.userId, platformAdmin: parsed.platformAdmin, isReferent: parsed.isReferent, displayName: parsed.displayName };
      window.sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(safe));
      return safe;
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
  // A different user must never see cached server data of the previous one.
  if (getSession()?.userId !== session.userId) getQueryClient().clear();
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
