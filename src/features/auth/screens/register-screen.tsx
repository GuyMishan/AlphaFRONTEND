"use client";

import { UiInput, UiCheckbox } from "@/components/ui/ui-controls";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AuthBrand, AuthMobileBrand } from "@/features/auth/components/auth-brand";
import { LegalConsentModal } from "@/features/auth/components/legal-consent-modal";
import { OtpInput } from "@/features/auth/components/otp-input";
import { authApi, authErrorMessage, sessionFromAuthenticatedUser, type OtpChallenge, type LegalDocument } from "@/features/auth/api";
import { OTP_CODE_PATTERN, registerSchema, type RegisterValues } from "@/features/auth/schemas";
import type { PublicInvitation } from "@/features/access/types";
import { Field } from "@/components/forms/form-feedback";
import { digitsOnly } from "@/lib/forms/input-masks";
import { INVALID_FORM_MESSAGE, useZodForm } from "@/lib/forms/use-zod-form";
import { announceSignIn } from "@/lib/session/lifecycle";
import { setSession } from "@/lib/session/storage";

const RESEND_INTERVAL_MS = 60_000;

export default function RegisterPage() {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useZodForm(registerSchema, {
    defaultValues: { displayName: "", email: "", nationalId: "", phone: "", acceptedTerms: false, marketingEmailOptIn: false, legalVersion: 0 },
  });
  const [legal, setLegal] = useState<LegalDocument | null>(null);
  const [legalError, setLegalError] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextSendAt, setNextSendAt] = useState(0);
  const [invitationToken, setInvitationToken] = useState("");
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(false);

  useEffect(() => {
    authApi.activeLegalDocument().then((doc) => {
      setLegal(doc);
      setLegalError(false);
      setValue("legalVersion", doc.version);
    }).catch(() => setLegalError(true));
  }, [setValue]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invitation")?.trim() ?? "";
    if (!token) return;
    setInvitationToken(token);
    setInvitationLoading(true);
    authApi.publicInvitation(token)
      .then((value) => {
        if (!value.usable) {
          toast.error("ההזמנה אינה פעילה יותר.");
          return;
        }
        setInvitation(value);
        setValue("email", value.email);
      })
      .catch(() => toast.error("ההזמנה לא נמצאה או שאינה זמינה יותר."))
      .finally(() => setInvitationLoading(false));
  }, [setValue]);

  async function requestCode(details: RegisterValues) {
    if (!legal || legal.version !== details.legalVersion) {
      toast.error("לא ניתן להירשם ללא מסמך משפטי פעיל.");
      return;
    }
    if (Date.now() < nextSendAt) {
      toast.error("ניתן לבקש קוד חדש בעוד דקה.");
      return;
    }

    setLoading(true);
    try {
      setChallenge(await authApi.requestRegistrationCode({ ...details, invitationToken: invitationToken || undefined }));
      setCode("");
      setNextSendAt(Date.now() + RESEND_INTERVAL_MS);
      toast.success("קוד אימות נשלח לאימייל שהזנת");
    } catch (err) {
      toast.error(authErrorMessage(err, "לא ניתן לשלוח קוד כרגע. נסו שוב מאוחר יותר."));
    } finally {
      setLoading(false);
    }
  }

  const submitDetails = (event?: FormEvent) => handleSubmit(requestCode, () => toast.error(INVALID_FORM_MESSAGE))(event);

  async function verifyCode(codeToVerify = code) {
    if (!challenge || !OTP_CODE_PATTERN.test(codeToVerify) || loading) return;

    setLoading(true);
    try {
      const user = await authApi.verifyRegistrationCode(challenge.challengeId, codeToVerify);
      setSession(sessionFromAuthenticatedUser(user));
      announceSignIn(user.userId);
      toast.success("ההרשמה הושלמה בהצלחה");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(authErrorMessage(err, "לא ניתן להשלים את ההרשמה כרגע."));
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

  return <main className="auth-page"><AuthBrand /><section className="auth-form-wrap"><div className="auth-card">
    <AuthMobileBrand />
    <h2>{invitation ? `הצטרפות ל־${invitation.organizationName}` : "יצירת משתמש"}</h2>
    <p>{challenge ? "הזינו את קוד האימות בן 6 הספרות שנשלח לאימייל" : invitation ? "השלימו את הפרטים. האימייל מקובע להזמנה שקיבלתם." : "הזינו את פרטי המשתמש החדש"}</p>
    {invitationLoading ? <div className="notice notice-info" style={{ marginBottom: 16 }}>בודק את ההזמנה...</div> : null}

    {!challenge ? (
      <form className="form" onSubmit={submitDetails} noValidate>
        <Field label="שם מלא *" error={errors.displayName?.message}><UiInput aria-invalid={Boolean(errors.displayName)} id="name" maxLength={120} required {...register("displayName")} /></Field>
        <Field label="תעודת זהות *" error={errors.nationalId?.message}><UiInput aria-invalid={Boolean(errors.nationalId)} id="national-id" inputMode="numeric" dir="ltr" maxLength={9} required {...digitsOnly(register("nationalId"), 9)} /></Field>
        <Field label="מספר טלפון *" error={errors.phone?.message}><UiInput aria-invalid={Boolean(errors.phone)} id="phone" type="tel" inputMode="tel" dir="ltr" maxLength={10} required {...digitsOnly(register("phone"), 10)} /></Field>
        <Field label="אימייל *" error={errors.email?.message}><UiInput aria-invalid={Boolean(errors.email)} id="email" type="email" maxLength={254} dir="ltr" disabled={Boolean(invitation)} required {...register("email")} /></Field>
        <div className="auth-consent-row">
          <UiCheckbox checked={watch("acceptedTerms")} readOnly aria-label="אישור תנאי השימוש" aria-invalid={Boolean(errors.acceptedTerms)} onClick={() => setLegalModalOpen(true)} />
          <span>קראתי ואני מאשר/ת את <button type="button" className="auth-inline-link" onClick={() => setLegalModalOpen(true)}>תנאי השימוש</button></span>
        </div>

        {errors.acceptedTerms ? <p role="alert">{errors.acceptedTerms.message}</p> : null}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <UiCheckbox {...register("marketingEmailOptIn")} />
          <span>אני מסכים/ה לקבל עדכונים והודעות שיווקיות בדוא״ל (לא חובה).</span>
        </label>
        {legalError ? <p role="alert">המסמך המשפטי אינו זמין כרגע, ולא ניתן להשלים הרשמה.</p> : null}
        <button className="btn btn-primary btn-lg wide" disabled={!legal || legalError || loading || invitationLoading || Boolean(invitationToken && !invitation)} type="submit">{loading ? "שולח..." : "שלחו לי קוד אימות"}<ArrowLeft size={18} /></button>
      </form>
    ) : (
      <form className="form" onSubmit={verify} noValidate>
        <Field label="קוד אימות *"><OtpInput value={code} onChange={setCode} onComplete={(value) => void verifyCode(value)} disabled={loading} /></Field>
        <button className="btn btn-primary btn-lg wide" disabled={loading} type="submit">{loading ? "מאמת..." : "אימות והרשמה"}<ArrowLeft size={18} /></button>
        <button className="btn wide" disabled={loading} type="button" onClick={() => void submitDetails()}>שלחו קוד חדש</button>
        <button className="btn wide" disabled={loading} type="button" onClick={() => { setChallenge(null); setCode(""); }}>שינוי פרטי הרשמה</button>
      </form>
    )}

    <LegalConsentModal open={legalModalOpen} document={legal} onClose={() => setLegalModalOpen(false)}
      onAccept={(version) => { setValue("acceptedTerms", true, { shouldValidate: true }); setValue("legalVersion", version); setLegalModalOpen(false); }} />
    <div className="auth-footer">כבר יש לך משתמש? <Link href="/login">להתחברות</Link></div>
  </div></section></main>;
}
