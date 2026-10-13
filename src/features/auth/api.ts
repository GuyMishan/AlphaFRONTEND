import { apiRequest } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import type { PublicInvitation } from "@/features/access/types";
import type { RefreshedSession, Session } from "@/lib/session/types";

export type OtpChallenge = { challengeId: string };

/**
 * Successful OTP verification. The proxy moves the bearer token into the
 * HttpOnly cookie before the response reaches the browser.
 */
export type AuthenticatedUser = RefreshedSession;

/** Builds the persisted session presentation metadata from explicit fields only. */
export function sessionFromAuthenticatedUser(user: AuthenticatedUser): Session {
  return { mode: "oidc", userId: user.userId, platformAdmin: user.platformAdmin, isReferent: user.isReferent, displayName: user.displayName };
}

export type RegistrationRequest = {
  displayName: string;
  email: string;
  nationalId: string;
  phone: string;
  invitationToken?: string;
};

export const authApi = {
  refreshSession: (signal?: AbortSignal) => apiRequest<RefreshedSession>("/api/auth/session", { signal }),
  /** Same endpoint, for a tab without session metadata: a 401 only means "not signed in", not expiry. */
  currentSession: () => apiRequest<RefreshedSession>("/api/auth/session", { anonymous: true }),

  // Anonymous endpoints: a 401 means wrong details or code, not an expired session.
  requestLoginCode: (nationalId: string, phone: string) =>
    apiRequest<OtpChallenge>("/api/auth/otp/request", { method: "POST", body: { nationalId, phone, channel: "email" }, anonymous: true }),
  verifyLoginCode: (challengeId: string, code: string) =>
    apiRequest<AuthenticatedUser>("/api/auth/otp/verify", { method: "POST", body: { challengeId, code }, anonymous: true }),
  requestRegistrationCode: (payload: RegistrationRequest) =>
    apiRequest<OtpChallenge>("/api/auth/register/request", { method: "POST", body: payload, anonymous: true }),
  verifyRegistrationCode: (challengeId: string, code: string) =>
    apiRequest<AuthenticatedUser>("/api/auth/register/verify", { method: "POST", body: { challengeId, code }, anonymous: true }),
  publicInvitation: (token: string, signal?: AbortSignal) =>
    apiRequest<PublicInvitation>(`/api/invitations/${encodeURIComponent(token)}`, { signal, anonymous: true }),
};

// Business errors of the anonymous auth endpoints. Unknown users get the same
// neutral 200 as known ones, so "wrong details" is only detectable at verification (401).
const authCodeMessages: Record<string, string> = {
  INVALID_INPUT: "חלק מהפרטים שהוזנו אינם תקינים.",
  INVALID_CODE: "הזינו קוד בן 6 ספרות.",
  CHANNEL_UNAVAILABLE: "לא ניתן לשלוח קוד לערוץ שנבחר.",
  USER_EXISTS: "כבר קיים משתמש עם תעודת הזהות הזו.",
  INVITATION_NOT_FOUND: "ההזמנה לא נמצאה.",
  INVITATION_NOT_PENDING: "ההזמנה אינה פעילה יותר.",
  INVITATION_EXPIRED: "תוקף ההזמנה פג. בקשו הזמנה חדשה.",
  INVITATION_EMAIL_MISMATCH: "האימייל אינו תואם לאימייל שאליו נשלחה ההזמנה.",
};

/** Hebrew message for a failed login/registration call; `fallback` covers outages and unknown errors. */
export function authErrorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback;
  if (error.status === 401) return "הקוד שגוי, פג תוקף או נוצל. נסו שוב או בקשו קוד חדש.";
  if (error.status === 429) return "בוצעו יותר מדי ניסיונות. נסו שוב בעוד דקה.";
  // Joining an organization can exceed its plan; the client already words plan gates in Hebrew.
  if (error.code === "PLAN_LIMIT_REACHED") return error.message;
  return authCodeMessages[error.code] ?? fallback;
}
