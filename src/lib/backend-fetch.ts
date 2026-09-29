import { clearSession, getSession } from "./session";

let sessionExpiryInProgress = false;

export async function expireBrowserSession(): Promise<void> {
  if (typeof window === "undefined") return;

  clearSession();
  if (sessionExpiryInProgress) return;
  sessionExpiryInProgress = true;

  try {
    await fetch("/api/session/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    // Local state is already cleared; redirect even if cookie cleanup fails.
  } finally {
    if (window.location.pathname !== "/session-timeout") {
      window.location.replace("/session-timeout");
    }
  }
}

export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = getSession();
  const headers = new Headers(init?.headers);

  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.mode === "development" && session.userId) {
    headers.set("X-Alpha-User-Id", session.userId);
    if (session.platformAdmin) headers.set("X-Alpha-Platform-Admin", "true");
  }

  const response = await fetch(`/api/backend${path}`, {
    ...init,
    headers,
    cache: init?.cache ?? "no-store",
    credentials: init?.credentials ?? "same-origin",
  });

  if (response.status === 401) {
    await expireBrowserSession();
  }

  return response;
}
