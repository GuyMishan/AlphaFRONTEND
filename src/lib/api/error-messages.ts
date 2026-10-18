import { ApiError, isMachineCode, problemCode, validationErrors, type ProblemDetails } from "./errors";

/**
 * One user-facing Hebrew message policy for backend Problem Details.
 * Never show machine codes (errorCode / snake_case error) as prose.
 */

const codeMessages: Record<string, string> = {
  EMPLOYER_LEGAL_AGREEMENT_REQUIRED: "לא ניתן לשדר דיווח ללא הסכם התקשרות. יש להעלות הסכם התקשרות בטאב מסמכים בפרופיל המעסיק.",
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
  // Business codes the backend sends without a `detail` (see AlphaBACKEND module endpoints).
  INVALID_EMAIL: "כתובת האימייל אינה תקינה.",
  INVALID_PHONE: "מספר הטלפון אינו תקין.",
  INVALID_NATIONAL_ID: "תעודת הזהות אינה תקינה.",
  INVITATION_ALREADY_PENDING: "כבר קיימת הזמנה פעילה לאימייל הזה.",
  LAST_ORGANIZATION_ADMIN: "לא ניתן להסיר או לשנות את מנהל הארגון האחרון.",
  REFERENT_CANNOT_RECEIVE_CUSTOMER_ACCESS: "לא ניתן להעניק לרפרנט גישת לקוח.",
  EXISTING_CUSTOMER_ACCESS: "למשתמש כבר יש גישת לקוח, ולכן לא ניתן להגדיר אותו כרפרנט.",
  ONBOARDING_ALREADY_COMPLETED: "הקמת העסק כבר הושלמה.",
  BANK_OR_BRANCH_NOT_FOUND: "הבנק או הסניף שנבחרו לא נמצאו.",
  EMPLOYER_PAYMENT_ACCOUNT_ALREADY_EXISTS: "חשבון התשלום כבר קיים.",
  ORGANIZATION_PAYMENT_ACCOUNT_ALREADY_EXISTS: "חשבון התשלום כבר קיים.",
  PAYMENT_PROVIDER_UNAVAILABLE: "ספק התשלום אינו זמין כרגע. נסו שוב מאוחר יותר.",
  STORAGE_NOT_CONFIGURED: "שמירת קבצים אינה זמינה כרגע. פנו לתמיכה.",
  REPORT_CHANGED_DURING_VALIDATION: "הדיווח השתנה במהלך הבדיקה. רעננו ונסו שוב.",
  REPORT_DELETE_REQUIRES_UNSENT_DRAFT: "ניתן למחוק רק טיוטה שלא נשלחה.",
  REPORT_HAS_EXTERNAL_HISTORY: "לא ניתן למחוק דיווח שכבר שודר.",
  REPORT_HAS_DERIVED_VERSIONS: "לא ניתן למחוק דיווח שנוצרו ממנו דיווחים נוספים.",
  CORRECTION_WORKSPACE_CONFLICT: "דיווח התיקון עודכן במקביל. רעננו ונסו שוב.",
  RESOLUTION_GROUP_STALE: "השגיאה עודכנה בינתיים. רעננו ונסו שוב.",
  RESOLUTION_PROBLEM_STALE: "השגיאה עודכנה בינתיים. רעננו ונסו שוב.",
  RESOLUTION_PROBLEM_ALREADY_RESOLVED: "השגיאה כבר טופלה.",
  CASE_NOTE_REQUIRED: "יש להזין הערה.",
  DECISION_NOTE_REQUIRED: "יש להזין הערה.",
  DECISION_NOTE_TOO_LONG: "ההערה ארוכה מדי.",
  TREATMENT_NOTE_TOO_LONG: "ההערה ארוכה מדי.",
  CASE_ATTACHMENT_SIZE_INVALID: "הקובץ ריק או גדול מדי.",
  CASE_ATTACHMENT_TYPE_INVALID: "ניתן לצרף רק קובצי PDF, JPG או PNG.",
  CASE_ATTACHMENT_SIGNATURE_INVALID: "תוכן הקובץ אינו תואם לסוג הקובץ.",
  CASE_ATTACHMENT_SECURITY_FAILED: "הקובץ לא עבר את בדיקת האבטחה.",
};

// `limit` values sent with PLAN_LIMIT_REACHED (backend EntitlementService).
const limitNames: Record<string, string> = { employers: "מעסיקים", employees: "עובדים פעילים", users: "משתמשים" };
const featureNames: Record<string, string> = { report_transmission: "שליחת דיווחים" };

export type ErrorMessageOverride = string | ((problem: ProblemDetails | undefined) => string);
export type ErrorMessageOverrides = Partial<Record<string, ErrorMessageOverride>>;

/**
 * Plan and payment gates: these specific messages take precedence over the
 * backend `detail` because they carry the plan limits and actionable wording.
 */
const gateMessages: ErrorMessageOverrides = {
  PLAN_LIMIT_REACHED: (problem) =>
    `הגעתם למגבלת ${limitNames[problem?.limit ?? ""] ?? problem?.limit ?? "המסלול"} במסלול הנוכחי (${problem?.current ?? 0}/${problem?.maximum ?? 0}).`,
  FEATURE_NOT_AVAILABLE: (problem) =>
    `האפשרות ${featureNames[problem?.feature ?? ""] ?? problem?.feature ?? ""} אינה זמינה במסלול הנוכחי.`,
  PAYMENT_ACCOUNT_REQUIRED: "יש לבחור חשבון תשלום פעיל לדיווח.",
  BANK_MANDATE_REQUIRED: "לא ניתן לשלוח את הדיווח ללא הרשאה פעילה לחיוב חשבון הבנק שנבחר.",
};

export const SESSION_EXPIRED_MESSAGE = codeMessages.AUTH_SESSION_EXPIRED;
export const NETWORK_ERROR_MESSAGE = "לא ניתן להתחבר כרגע לשירות המערכת. נסו שוב בעוד מספר רגעים.";
export const TIMEOUT_MESSAGE = "השירות לא הגיב בזמן. נסו שוב בעוד מספר רגעים.";
export const UNEXPECTED_RESPONSE_MESSAGE = "התקבלה תשובה לא צפויה מהשירות. נסו שוב מאוחר יותר.";
const DEFAULT_MESSAGE = "לא ניתן להשלים את הפעולה. בדקו את הפרטים ונסו שוב.";

// Backend's generic English Problem Details text should not override a helpful Hebrew message.
const GENERIC_ENGLISH_DETAIL = /^(The request is invalid|The request conflicts|An unexpected error occurred|Authentication is required|The requested resource was not found|You do not have permission|The service is temporarily unavailable|Too many requests|An external service|The HTTP method is not allowed|The request body is too large|The request content type is not supported)/i;

const humanText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() && !isMachineCode(value.trim())
    ? value.trim()
    : null;

// The backend copies a generic default `detail` into `errors.request`, so the same filter applies to both.
const specificText = (value: unknown): string | null => {
  const text = humanText(value);
  return text && !GENERIC_ENGLISH_DETAIL.test(text) ? text : null;
};

export function apiErrorMessage(status: number, value: unknown, fallback?: string): string {
  const body = value && typeof value === "object" ? value as ProblemDetails & { validation?: { issues?: unknown } } : null;
  const code = problemCode(body);

  const fromValidation = Object.values(validationErrors(body)).flat().map(specificText).find(Boolean) ?? null;
  const fromIssues = Array.isArray(body?.validation?.issues)
    ? body.validation.issues.map(specificText).find(Boolean)
    : null;

  const detail = specificText(body?.detail);
  if (detail) return detail;
  if (fromValidation) return fromValidation;
  if (fromIssues) return fromIssues;
  if (codeMessages[code]) return codeMessages[code];
  if (status === 401) return codeMessages.AUTHENTICATION_REQUIRED;
  if (status === 403) return codeMessages.ACCESS_DENIED;
  if (status === 404) return codeMessages.RESOURCE_NOT_FOUND;
  if (status === 429) return codeMessages.RATE_LIMIT_EXCEEDED;
  if (status >= 500) return codeMessages.INTERNAL_ERROR;
  return humanText(body?.error) ?? humanText(fallback) ?? DEFAULT_MESSAGE;
}

/** Message for an HTTP error response, honoring per-call overrides and plan/payment gates. */
export function httpErrorMessage(status: number, problem: ProblemDetails | undefined, overrides?: ErrorMessageOverrides, fallback?: string, anonymous = false): string {
  if (status === 401 && !anonymous) return SESSION_EXPIRED_MESSAGE;
  const code = problemCode(problem);
  const override = overrides?.[code] ?? gateMessages[code];
  if (override) return typeof override === "function" ? override(problem) : override;
  return apiErrorMessage(status, problem, fallback);
}

const HEBREW_TEXT = /[֐-׿]/;

/**
 * Display text for any caught error. ApiError messages are already user-facing Hebrew;
 * a plain Error is shown only when the app wrote it in Hebrew. Runtime failures
 * (TypeError, SyntaxError, ...) and English library text never reach the user.
 */
export function errorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.name === "Error" && HEBREW_TEXT.test(error.message)) return error.message;
  return fallback;
}
