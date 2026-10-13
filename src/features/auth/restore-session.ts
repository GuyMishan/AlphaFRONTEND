import { authApi, sessionFromAuthenticatedUser } from "@/features/auth/api";
import { isApiError } from "@/lib/api/errors";
import { announceSignIn } from "@/lib/session/lifecycle";
import { getSession, setSession } from "@/lib/session/storage";
import type { Session } from "@/lib/session/types";

export type SessionStatus =
  | { status: "authenticated"; session: Session }
  /** The backend rejected the cookie, or there is none: sign in. */
  | { status: "unauthenticated" }
  /** The check could not complete (network, rate limit, outage); nothing is known about the session. */
  | { status: "unavailable" };

let check: Promise<SessionStatus> | null = null;

/**
 * Resolves the signed-in user. Session metadata lives in sessionStorage (one
 * tab), but the HttpOnly cookie outlives the tab, so a tab without metadata asks
 * the backend (`GET /api/auth/session`), which is the only authority.
 *
 * One request per page load: concurrent and later callers share the answer.
 * An "unavailable" answer is not kept, so the next caller tries again.
 */
export function resolveSession(): Promise<SessionStatus> {
  const stored = getSession();
  if (stored) return Promise.resolve({ status: "authenticated", session: stored });

  check ??= authApi.currentSession().then(
    (user): SessionStatus => {
      const session = sessionFromAuthenticatedUser(user);
      setSession(session);
      announceSignIn(session.userId);
      return { status: "authenticated", session };
    },
    (error): SessionStatus => {
      if (isApiError(error) && error.status === 401) return { status: "unauthenticated" };
      check = null;
      return { status: "unavailable" };
    },
  );
  return check;
}
