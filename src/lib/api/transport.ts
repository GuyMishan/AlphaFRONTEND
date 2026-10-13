import { validationErrors } from "./errors";
import { expireBrowserSession } from "@/lib/session/lifecycle";

/**
 * Low-level transport to the same-origin backend proxy (/api/backend/*).
 * The HttpOnly session cookie travels automatically; JavaScript never sees the token.
 * Prefer `apiRequest`/`apiBlob` from ./client, which add error normalization.
 */
export type TransportOptions = {
  /** Anonymous endpoints (login/registration): a 401 there is a business answer, not an expired session. */
  anonymous?: boolean;
};

export async function backendFetch(path: string, init?: RequestInit, options: TransportOptions = {}): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Capture the actual form/dialog before the async request changes focus.
  // Never guess a form from the current focus when the response returns.
  const originatingControl = typeof document !== "undefined" && document.activeElement instanceof HTMLElement
    ? document.activeElement : null;
  const validationScope = originatingControl?.closest<HTMLElement>(
    'form, [role="dialog"], .app-modal, .payment-modal, .report-modal'
  ) ?? null;
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    headers,
    cache: init?.cache ?? "no-store",
    credentials: init?.credentials ?? "same-origin",
  });

  // Notify the shared field-validation bridge without consuming the response body.
  if (typeof window !== "undefined" && response.status === 400) {
    const problem = await response.clone().json().catch(() => null);
    const errors = validationErrors(problem);
    if (problem?.errorCode === "VALIDATION_FAILED" && Object.keys(errors).length) {
      window.dispatchEvent(new CustomEvent("alpha:server-validation", { detail: { errors, scope: validationScope } }));
    }
  }

  if (response.status === 401 && !options.anonymous) {
    await expireBrowserSession();
  }

  return response;
}
