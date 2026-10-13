import { ApiError, type ProblemDetails } from "./errors";
import {
  httpErrorMessage,
  NETWORK_ERROR_MESSAGE,
  TIMEOUT_MESSAGE,
  UNEXPECTED_RESPONSE_MESSAGE,
  type ErrorMessageOverrides,
} from "./error-messages";
import { backendFetch } from "./transport";

/**
 * Shared, typed client for every backend call.
 *
 * - Paths are backend paths (`/api/...`); the transport prefixes the same-origin proxy.
 * - `body` is JSON-serialized unless it is already a string, FormData or Blob.
 * - Every failure is thrown as one normalized `ApiError` (see ./errors).
 * - No UI side effects: callers or the query layer decide how to present errors.
 * - No automatic retries here; retry policy belongs to TanStack Query (src/lib/query).
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
  /** Client-side timeout; none by default so long reporting operations are not cut off. */
  timeoutMs?: number;
  /** Per-call Hebrew messages by backend errorCode (take precedence over `detail`). */
  messages?: ErrorMessageOverrides;
  /** Last-resort message when the backend supplies nothing usable. */
  fallbackMessage?: string;
  /** Anonymous endpoint: do not treat 401 as session expiry. */
  anonymous?: boolean;
};

type ApiErrorListener = (error: ApiError) => void;
const errorListeners = new Set<ApiErrorListener>();

/**
 * Observe HTTP errors from every request (e.g. the app shell opens the plan
 * upgrade dialog). Listeners must not throw; returns an unsubscribe function.
 */
export function subscribeToApiErrors(listener: ApiErrorListener): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (typeof body === "string" || body instanceof FormData || body instanceof Blob) return body;
  return JSON.stringify(body);
}

/** Combines the caller's signal with an optional timeout without relying on AbortSignal.any. */
function withTimeout(signal: AbortSignal | undefined, timeoutMs: number | undefined) {
  if (!timeoutMs) return { signal, timedOut: () => false, dispose: () => undefined };
  const controller = new AbortController();
  let expired = false;
  const timer = setTimeout(() => { expired = true; controller.abort(); }, timeoutMs);
  const forward = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", forward, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => expired,
    dispose: () => { clearTimeout(timer); signal?.removeEventListener("abort", forward); },
  };
}

async function readProblem(response: Response): Promise<ProblemDetails | undefined> {
  const text = await response.text().catch(() => "");
  if (!text) return undefined;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" ? value as ProblemDetails : undefined;
  } catch {
    return undefined;
  }
}

async function send(path: string, options: ApiRequestOptions, accept: string): Promise<Response> {
  const timeout = withTimeout(options.signal, options.timeoutMs);
  let response: Response;
  try {
    response = await backendFetch(path, {
      method: options.method ?? "GET",
      headers: { Accept: accept },
      body: serializeBody(options.body),
      signal: timeout.signal,
    }, { anonymous: options.anonymous });
  } catch (cause) {
    if (timeout.timedOut()) throw new ApiError("timeout", 0, TIMEOUT_MESSAGE);
    if (options.signal?.aborted || (cause instanceof DOMException && cause.name === "AbortError")) {
      throw new ApiError("aborted", 0, "הבקשה בוטלה.");
    }
    throw new ApiError("network", 0, NETWORK_ERROR_MESSAGE);
  } finally {
    timeout.dispose();
  }

  if (!response.ok) {
    const problem = await readProblem(response);
    const error = new ApiError("http", response.status, httpErrorMessage(response.status, problem, options.messages, options.fallbackMessage, options.anonymous), problem);
    errorListeners.forEach((listener) => listener(error));
    throw error;
  }
  return response;
}

/** JSON request. Resolves `undefined` for 204/empty bodies. */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await send(path, options, "application/json");
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("parse", response.status, UNEXPECTED_RESPONSE_MESSAGE);
  }
}

/** Binary download (exports, uploaded documents). */
export async function apiBlob(path: string, options: ApiRequestOptions = {}): Promise<Blob> {
  const response = await send(path, options, "*/*");
  return response.blob();
}

/**
 * Builds `?a=1&b=2` from defined, non-empty values. Use it only where the
 * endpoint expects empty values to be omitted.
 */
export function queryString(values: Record<string, string | number | boolean | null | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}
