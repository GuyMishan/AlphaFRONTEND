/**
 * The single normalized error model for backend communication.
 *
 * The backend (A12) returns RFC 9457 Problem Details for every error:
 * type, title, status, detail, instance, errorCode and traceId; `errors`
 * (field -> messages) is present exactly when errorCode is VALIDATION_FAILED,
 * with non-field messages under the "request" key. Additional context
 * (limit, current, maximum, feature, resourceStatus, ...) stays top level.
 */
export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errorCode?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  /** @deprecated Pre-A12.3 alias kept by the backend during migration. Read `errorCode` instead. */
  error?: string;
  resourceStatus?: number | string;
  limit?: string;
  current?: number;
  maximum?: number;
  feature?: string;
  [extension: string]: unknown;
};

export type ApiErrorKind =
  /** The backend answered with a non-2xx status. */
  | "http"
  /** The request never reached the backend (offline, DNS, proxy down). */
  | "network"
  /** The request exceeded its client-side timeout. */
  | "timeout"
  /** The caller cancelled the request (AbortSignal). */
  | "aborted"
  /** A 2xx response whose body could not be parsed. */
  | "parse";

export type FieldErrors = Record<string, string[]>;

const MACHINE_CODE = /^[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)*$/;

/** Canonical upper-case code from `errorCode`, falling back to the legacy `error` alias. */
export function problemCode(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const body = value as { errorCode?: unknown; error?: unknown };
  const code = typeof body.errorCode === "string" ? body.errorCode : body.error;
  return typeof code === "string" && MACHINE_CODE.test(code)
    ? code.toUpperCase().replace(/-/g, "_") : "";
}

export function isMachineCode(value: string): boolean {
  return MACHINE_CODE.test(value);
}

/** Normalize RFC 9457 ValidationProblemDetails and previous array-based errors. */
export function validationErrors(value: unknown): FieldErrors {
  if (!value || typeof value !== "object") return {};
  const errors = (value as { errors?: unknown }).errors;
  const normalized: FieldErrors = {};
  if (Array.isArray(errors)) {
    const messages = errors.filter((x): x is string => typeof x === "string" && Boolean(x.trim()));
    if (messages.length) normalized.request = messages;
  } else if (errors && typeof errors === "object") {
    for (const [key, items] of Object.entries(errors)) {
      const messages = (Array.isArray(items) ? items : typeof items === "string" ? [items] : [])
        .filter((x): x is string => typeof x === "string" && Boolean(x.trim()));
      if (messages.length) normalized[key] = messages;
    }
  }
  return normalized;
}

export class ApiError extends Error {
  override readonly name = "ApiError";
  readonly kind: ApiErrorKind;
  /** HTTP status, or 0 when the backend never answered. */
  readonly status: number;
  readonly problem?: ProblemDetails;

  constructor(kind: ApiErrorKind, status: number, message: string, problem?: ProblemDetails) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.problem = problem;
  }

  /** Backend errorCode (upper-case), or "" when none was supplied. */
  get code(): string {
    return problemCode(this.problem);
  }

  get fieldErrors(): FieldErrors {
    return validationErrors(this.problem);
  }

  get traceId(): string | undefined {
    return this.problem?.traceId;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
