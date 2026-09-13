import type { Session } from "./types";

const SESSION_KEY = "alpha.session.v1";
const EMPLOYER_KEY = "alpha.employer.v1";

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
}

export function setEmployerSelection(organizationId: string, employerId: string) {
  window.localStorage.setItem(EMPLOYER_KEY, JSON.stringify({ organizationId, employerId }));
}

export function getEmployerSelection(): { organizationId: string; employerId: string } | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(EMPLOYER_KEY);
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}
