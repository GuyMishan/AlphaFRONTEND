import { getQueryClient } from "@/lib/query/query-client";
import { clearSession, getSession } from "./storage";

let sessionEndInProgress = false;

/**
 * Tabs share the HttpOnly cookie but keep their own session metadata and query
 * cache. Sign-in/sign-out is broadcast so other tabs never keep showing (or
 * acting on) a session that changed elsewhere.
 */
type SessionBroadcast = { type: "signed-out" } | { type: "signed-in"; userId: string | undefined };
const CHANNEL_NAME = "alpha-session";

function broadcast(message: SessionBroadcast) {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage(message);
  channel.close();
}

/** Drops this tab's user data without touching the (shared) server session. */
function discardLocalSession(redirectTo: string) {
  clearSession();
  getQueryClient().clear();
  if (window.location.pathname !== redirectTo) window.location.replace(redirectTo);
}

/**
 * Ends the browser session in one place: clears persisted session state and
 * every cached server response, asks the server route to revoke the backend
 * session and clear the HttpOnly cookie, then performs a full navigation so no
 * in-memory user data survives.
 */
async function endBrowserSession(redirectTo: string): Promise<void> {
  if (typeof window === "undefined") return;

  clearSession();
  getQueryClient().clear();
  if (sessionEndInProgress) return;
  sessionEndInProgress = true;

  try {
    await fetch("/api/session/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    // Local state is already cleared; redirect even if cookie cleanup fails.
  } finally {
    broadcast({ type: "signed-out" });
    if (window.location.pathname !== redirectTo) {
      window.location.replace(redirectTo);
    } else {
      sessionEndInProgress = false;
    }
  }
}

/** User-initiated logout. */
export function logout(): Promise<void> {
  return endBrowserSession("/login");
}

/** The backend rejected the session (the first 401 is authoritative). */
export function expireBrowserSession(): Promise<void> {
  return endBrowserSession("/session-timeout");
}

/** Called after a successful sign-in so other open tabs can react. */
export function announceSignIn(userId: string | undefined) {
  broadcast({ type: "signed-in", userId });
}

/** Reacts to sign-in/sign-out in other tabs. Returns an unsubscribe function. */
export function listenForSessionChangesInOtherTabs(): () => void {
  if (typeof BroadcastChannel === "undefined") return () => undefined;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<SessionBroadcast>) => {
    const current = getSession();
    if (!current) return;
    if (event.data.type === "signed-out") discardLocalSession("/login");
    else if (event.data.userId !== current.userId) discardLocalSession("/login");
  };
  return () => channel.close();
}
