/**
 * One user-facing message policy for backend RFC 9457 Problem Details and legacy errors.
 * Never show machine codes (errorCode / snake_case error) as prose.
 */
type ApiProblemBody = {
  detail?: unknown;
  error?: unknown;
  errorCode?: unknown;
  title?: unknown;
  errors?: unknown;
  validation?: { issues?: unknown };
};

const codeMessages: Record<string, string> = {
  PLAN_LIMIT_REACHED: "הגעתם למגבלה של המסלול הנוכחי.",
  FEATURE_NOT_AVAILABLE: "האפשרות אינה זמינה במסלול הנוכחי.",
  PAYMENT_ACCOUNT_REQUIRED: "יש לבחור חשבון תשלום פעיל לדיווח.",
  BANK_MANDATE_REQUIRED: "נדרשת הרשאה פעילה לחיוב חשבון הבנק.",
  BILLING_ACCOUNT_REQUIRED: "לא הוגדר חשבון חיוב.",
  BILLING_PAYMENT_METHOD_NOT_ACTIVE: "אמצעי התשלום אינו פעיל.",
  BILLING_PAYMENT_METHOD_REFERENCE_REQUIRED: "חסרים פרטי הרשאה תקינים לאמצעי התשלום.",
  TREATMENT_CONFLICT: "הטיפול עודכן על ידי משתמש אחר. רעננו את הפרטים ונסו שוב.",
  AUTH_SESSION_EXPIRED: "פג תוקף החיבור. יש להתחבר מחדש.",
  AUTHENTICATION_REQUIRED: "יש להתחבר כדי להמשיך.",
  ACCESS_DENIED: "אין לכם הרשאה לבצע פעולה זו.",
  RESOURCE_NOT_FOUND: "הפריט המבוקש לא נמצא.",
  VALIDATION_FAILED: "חלק מהפרטים שהוזנו אינם תקינים.",
  MALFORMED_REQUEST: "הבקשה אינה תקינה. בדקו את הנתונים ונסו שוב.",
  CONCURRENCY_CONFLICT: "הנתונים עודכנו במקביל. רעננו ונסו שוב.",
  DUPLICATE_RESOURCE: "הפריט כבר קיים במערכת.",
  RATE_LIMIT_EXCEEDED: "בוצעו יותר מדי ניסיונות. נסו שוב מאוחר יותר.",
  INTERNAL_ERROR: "אירעה תקלה במערכת. נסו שוב מאוחר יותר.",
  EXTERNAL_PROVIDER_UNAVAILABLE: "השירות החיצוני אינו זמין כרגע. נסו שוב מאוחר יותר.",
  EXTERNAL_PROVIDER_TIMEOUT: "השירות החיצוני לא הגיב בזמן. נסו שוב מאוחר יותר.",
  SERVICE_UNAVAILABLE: "השירות אינו זמין כרגע. נסו שוב מאוחר יותר.",
  PAYMENT_CALLBACK_NOT_CONFIGURED: "לא ניתן לחבר אמצעי תשלום כרגע. פנו לתמיכה.",
};

const machineCode = /^[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)*$/;
const humanText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() && !machineCode.test(value.trim())
    ? value.trim()
    : null;


export type FieldValidationErrors = Record<string, string[]>;

/** Normalize RFC 9457 ValidationProblemDetails and previous array-based errors. */
export function validationErrors(value: unknown): FieldValidationErrors {
  if (!value || typeof value !== "object") return {};
  const problem = value as { errors?: unknown };
  const errors = problem.errors;
  const normalized: FieldValidationErrors = {};
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

export function apiErrorMessage(status: number, value: unknown, fallback?: string): string {
  const body = value && typeof value === "object" ? value as ApiProblemBody : null;
  const code = typeof body?.errorCode === "string"
    ? body.errorCode.toUpperCase()
    : typeof body?.error === "string" && machineCode.test(body.error)
      ? body.error.toUpperCase().replace(/-/g, "_")
      : "";

  const fromValidation = Object.values(validationErrors(body)).flat().map(humanText).find(Boolean) ?? null;
  const fromIssues = Array.isArray(body?.validation?.issues)
    ? body.validation.issues.map(humanText).find(Boolean)
    : null;

  // Backend's generic English Problem Details text should not override a helpful Hebrew message.
  const detail = humanText(body?.detail);
  if (detail && !/^(The request is invalid|The request conflicts|An unexpected error occurred|Authentication is required|The requested resource was not found|You do not have permission|The service is temporarily unavailable|Too many requests|An external service|The HTTP method is not allowed|The request body is too large|The request content type is not supported)/i.test(detail))
    return detail;
  if (fromValidation) return fromValidation;
  if (fromIssues) return fromIssues;
  if (codeMessages[code]) return codeMessages[code];
  if (status === 401) return codeMessages.AUTHENTICATION_REQUIRED;
  if (status === 403) return codeMessages.ACCESS_DENIED;
  if (status === 404) return codeMessages.RESOURCE_NOT_FOUND;
  if (status === 429) return codeMessages.RATE_LIMIT_EXCEEDED;
  if (status >= 500) return codeMessages.INTERNAL_ERROR;
  return humanText(body?.error) ?? humanText(fallback) ?? "לא ניתן להשלים את הפעולה. בדקו את הפרטים ונסו שוב.";
}

export function problemCode(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const body = value as { errorCode?: unknown; error?: unknown };
  const code = typeof body.errorCode === "string" ? body.errorCode : body.error;
  return typeof code === "string" && machineCode.test(code)
    ? code.toUpperCase().replace(/-/g, "_") : "";
}

export async function responseErrorMessage(response: Response, fallback?: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  return apiErrorMessage(response.status, body, fallback);
}
