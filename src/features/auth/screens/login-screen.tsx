"use client";

import { UiInput } from "@/components/ui/ui-controls";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AuthBrand, AuthMobileBrand } from "@/features/auth/components/auth-brand";
import { LegalConsentModal } from "@/features/auth/components/legal-consent-modal";
import { OtpInput } from "@/features/auth/components/otp-input";
import {
  authApi,
  authErrorMessage,
  sessionFromAuthenticatedUser,
  type AuthenticatedUser,
  type LegalDocument,
  type OtpChallenge,
} from "@/features/auth/api";
import { loginSchema, OTP_CODE_PATTERN, type LoginValues } from "@/features/auth/schemas";
import { Field } from "@/components/forms/form-feedback";
import { digitsOnly } from "@/lib/forms/input-masks";
import { INVALID_FORM_MESSAGE, useZodForm } from "@/lib/forms/use-zod-form";
import { announceSignIn, logout } from "@/lib/session/lifecycle";
import { setSession } from "@/lib/session/storage";

const RESEND_INTERVAL_MS = 60_000;
const SEND_FAILED = "לא ניתן לשלוח קוד כרגע. נסו שוב מאוחר יותר.";

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useZodForm(loginSchema, { defaultValues: { nationalId: "", phone: "" } });
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextSendAt, setNextSendAt] = useState(0);
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalSaving, setLegalSaving] = useState(false);

  async function finishAuthenticatedLogin(user: AuthenticatedUser) {
    setSession(sessionFromAuthenticatedUser(user));
    announceSignIn(user.userId);

    if (!user.legalConsentRequired) {
      toast.success("התחברת בהצלחה");
      router.replace("/dashboard");
      return;
    }

    setLegalModalOpen(true);
    try {
      setLegalDocument(await authApi.activeLegalDocument());
    } catch {
      toast.error("לא ניתן לטעון כרגע את תנאי השימוש. נסו להתחבר מחדש.");
      setLegalModalOpen(false);
      await logout();
    }
  }

  async function requestCode({ nationalId, phone }: LoginValues) {
    if (Date.now() < nextSendAt) {
      toast.error("ניתן לבקש קוד חדש בעוד דקה.");
      return;
    }

    setLoading(true);
    try {
      setChallenge(await authApi.requestLoginCode(nationalId, phone));
      setCode("");
      setNextSendAt(Date.now() + RESEND_INTERVAL_MS);
      toast.success("קוד האימות נשלח בהצלחה לכתובת הדוא״ל הרשומה.");
    } catch (err) {
      toast.error(authErrorMessage(err, SEND_FAILED));
    } finally {
      setLoading(false);
    }
  }

  const submitDetails = (event?: FormEvent) => handleSubmit(requestCode, () => toast.error(INVALID_FORM_MESSAGE))(event);

  async function verifyCode(codeToVerify = code) {
    if (!challenge || !OTP_CODE_PATTERN.test(codeToVerify) || loading) return;

    setLoading(true);
    try {
      const user = await authApi.verifyLoginCode(challenge.challengeId, codeToVerify);
      await finishAuthenticatedLogin(user);
    } catch (err) {
      toast.error(authErrorMessage(err, "לא ניתן להתחבר כרגע."));
    } finally {
      setLoading(false);
    }
  }

  function verify(event: FormEvent) {
    event.preventDefault();
    if (!OTP_CODE_PATTERN.test(code)) {
      toast.error("הזינו קוד בן 6 ספרות.");
      return;
    }
    void verifyCode();
  }

  async function acceptRequiredLegal(version: number) {
    setLegalSaving(true);
    try {
      await authApi.acceptLegal(version);
      setLegalModalOpen(false);
      toast.success("התחברת בהצלחה");
      router.replace("/dashboard");
    } catch {
      toast.error("שמירת האישור נכשלה. נסו שוב.");
    } finally {
      setLegalSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <AuthBrand />
      <section className="auth-form-wrap">
        <div className="auth-card">
          <AuthMobileBrand />
          <h2>כניסה למערכת</h2>
          <p>{challenge ? "הזינו את קוד האימות בן 6 הספרות שנשלח לכתובת הדוא״ל הרשומה." : "התחברו כדי להמשיך לסביבת העבודה שלכם"}</p>

          {!challenge ? (
            <form className="form" onSubmit={submitDetails} noValidate>
              <Field label="תעודת זהות *" error={errors.nationalId?.message}>
                <UiInput
                  aria-invalid={Boolean(errors.nationalId)}
                  id="national-id"
                  inputMode="numeric"
                  autoComplete="username"
                  dir="ltr"
                  required
                  maxLength={9}
                  {...digitsOnly(register("nationalId"), 9)}
                />
              </Field>

              <Field label="מספר טלפון *" error={errors.phone?.message}>
                <UiInput
                  aria-invalid={Boolean(errors.phone)}
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  required
                  maxLength={10}
                  {...digitsOnly(register("phone"), 10)}
                />
              </Field>

              <button className="btn btn-primary btn-lg wide" disabled={loading} type="submit">
                {loading ? "שולח..." : "שלחו לי קוד בדוא״ל"}
                <ArrowLeft size={18} />
              </button>
            </form>
          ) : (
            <form className="form" onSubmit={verify} noValidate>
              <Field label="קוד אימות *">
                <OtpInput
                  value={code}
                  onChange={setCode}
                  onComplete={(value) => void verifyCode(value)}
                  disabled={loading}
                />
              </Field>

              <button className="btn btn-primary btn-lg wide" disabled={loading} type="submit">
                {loading ? "מאמת..." : "אימות וכניסה"}
                <ArrowLeft size={18} />
              </button>
              <button className="btn wide" disabled={loading} type="button" onClick={() => void submitDetails()}>
                שלחו קוד חדש
              </button>
              <button className="btn wide" disabled={loading} type="button" onClick={() => { setChallenge(null); setCode(""); }}>
                שינוי פרטי כניסה
              </button>
            </form>
          )}

          <div className="auth-footer">צריכים ליצור משתמש? <Link href="/register">להרשמה</Link></div>
        </div>
      </section>
      <LegalConsentModal
        open={legalModalOpen}
        required
        document={legalDocument}
        saving={legalSaving}
        onClose={() => void logout()}
        onAccept={acceptRequiredLegal}
      />
    </main>
  );
}
