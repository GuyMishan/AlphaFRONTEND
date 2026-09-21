"use client";

import { UiInput } from "@/components/ui-controls";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AuthBrand } from "@/components/auth-brand";
import { OtpInput } from "@/components/otp-input";
import { Field, type FieldErrors } from "@/components/form-feedback";
import { isIsraeliId, isValidEmail } from "@/lib/validation";
import { setSession } from "@/lib/session";
import { alphaApi } from "@/lib/api";
import type { PublicInvitation } from "@/lib/types";

type Challenge = { challengeId: string };

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [nextSendAt, setNextSendAt] = useState(0);
  const [invitationToken, setInvitationToken] = useState("");
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [invitationLoading, setInvitationLoading] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invitation")?.trim() ?? "";
    if (!token) return;
    setInvitationToken(token);
    setInvitationLoading(true);
    alphaApi.publicInvitation(token)
      .then((value) => {
        if (!value.usable) {
          toast.error("ההזמנה אינה פעילה יותר.");
          return;
        }
        setInvitation(value);
        setEmail(value.email);
      })
      .catch(() => toast.error("ההזמנה לא נמצאה או שאינה זמינה יותר."))
      .finally(() => setInvitationLoading(false));
  }, []);

  function validateDetails() {
    const next: FieldErrors = {};
    const name = displayName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedNationalId = nationalId.trim();
    const normalizedPhone = phone.trim();

    if (name.length < 2 || name.length > 120) next.displayName = "שם מלא הוא שדה חובה ובאורך 2-120 תווים.";
    if (!isValidEmail(normalizedEmail)) next.email = "כתובת האימייל אינה תקינה.";
    if (!isIsraeliId(normalizedNationalId)) next.nationalId = "תעודת הזהות אינה תקינה.";
    if (!/^05\d{8}$/.test(normalizedPhone)) next.phone = "מספר הטלפון חייב להיות מספר נייד ישראלי בן 10 ספרות.";

    setErrors(next);
    return Object.values(next).every((value) => !value);
  }

  async function requestCode() {
    if (!validateDetails()) {
      toast.error("יש לתקן את השדות המסומנים באדום.");
      return;
    }
    if (Date.now() < nextSendAt) {
      toast.error("ניתן לבקש קוד חדש בעוד דקה.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/backend/api/auth/register/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          nationalId: nationalId.trim(),
          phone: phone.trim(),
          invitationToken: invitationToken || undefined,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 409) toast.error("כבר קיים משתמש עם אותו שילוב של תעודת זהות + מספר פלאפון. כרגע לא ניתן ליצור משתמש נוסף עם אותו שילוב; נטפל בתרחיש הזה בהמשך.");
        else if (response.status === 429) toast.error("ניתן לבקש קוד חדש בעוד דקה.");
        else toast.error("לא ניתן לשלוח קוד כרגע. נסו שוב מאוחר יותר.");
        return;
      }

      const result = await response.json() as Challenge;
      setChallenge(result);
      setCode("");
      setNextSendAt(Date.now() + 60_000);
      toast.success("קוד אימות נשלח לאימייל שהזנת");
    } catch {
      toast.error("לא ניתן לשלוח קוד כרגע. נסו שוב מאוחר יותר.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(codeToVerify = code) {
    if (!challenge || !/^\d{6}$/.test(codeToVerify) || loading) return;

    setLoading(true);
    try {
      const response = await fetch("/api/backend/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ challengeId: challenge.challengeId, code: codeToVerify }),
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) toast.error("הקוד שגוי, פג תוקף או נוצל. נסו שוב או בקשו קוד חדש.");
        else if (response.status === 409) toast.error("כבר קיים משתמש עם אותו שילוב של תעודת זהות + מספר פלאפון. כרגע לא ניתן ליצור משתמש נוסף עם אותו שילוב; נטפל בתרחיש הזה בהמשך.");
        else toast.error("לא ניתן להשלים את ההרשמה כרגע.");
        return;
      }

      const result = await response.json() as { accessToken: string; userId: string; platformAdmin: boolean; displayName: string };
      setSession({ mode: "oidc", ...result });
      toast.success("ההרשמה הושלמה בהצלחה");
      if (invitationToken) {
        router.replace("/dashboard");
      } else {
        const onboarding = await alphaApi.onboardingStatus();
        router.replace(onboarding.needsOnboarding ? "/onboarding" : "/dashboard");
      }
    } catch {
      toast.error("לא ניתן להשלים את ההרשמה כרגע.");
    } finally {
      setLoading(false);
    }
  }

  function verify(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error("הזינו קוד בן 6 ספרות.");
      return;
    }
    void verifyCode();
  }

  return <main className="auth-page"><AuthBrand /><section className="auth-form-wrap"><div className="auth-card">
    <h2>{invitation ? `הצטרפות ל־${invitation.organizationName}` : "יצירת משתמש"}</h2>
    <p>{challenge ? "הזינו את קוד האימות בן 6 הספרות שנשלח לאימייל" : invitation ? "השלימו את הפרטים. האימייל מקובע להזמנה שקיבלתם." : "הזינו את פרטי המשתמש החדש"}</p>
    {invitationLoading ? <div className="notice notice-info" style={{ marginBottom: 16 }}>בודק את ההזמנה...</div> : null}

    {!challenge ? (
      <form className="form" onSubmit={(event) => { event.preventDefault(); void requestCode(); }} noValidate>
        <Field label="שם מלא *" error={errors.displayName}><UiInput aria-invalid={Boolean(errors.displayName)} id="name" maxLength={120} value={displayName} onChange={(e) => { setDisplayName(e.target.value); setErrors((current) => ({ ...current, displayName: undefined })); }} required /></Field>
        <Field label="תעודת זהות *" error={errors.nationalId}><UiInput aria-invalid={Boolean(errors.nationalId)} id="national-id" inputMode="numeric" dir="ltr" maxLength={9} value={nationalId} onChange={(e) => { setNationalId(e.target.value.replace(/\D/g, "").slice(0, 9)); setErrors((current) => ({ ...current, nationalId: undefined })); }} required /></Field>
        <Field label="מספר טלפון *" error={errors.phone}><UiInput aria-invalid={Boolean(errors.phone)} id="phone" type="tel" inputMode="tel" dir="ltr" maxLength={10} value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErrors((current) => ({ ...current, phone: undefined })); }} required /></Field>
        <Field label="אימייל *" error={errors.email}><UiInput aria-invalid={Boolean(errors.email)} id="email" type="email" maxLength={254} dir="ltr" value={email} disabled={Boolean(invitation)} onChange={(e) => { setEmail(e.target.value); setErrors((current) => ({ ...current, email: undefined })); }} required /></Field>
        <button className="btn btn-primary btn-lg wide" disabled={loading || invitationLoading || Boolean(invitationToken && !invitation)} type="submit">{loading ? "שולח..." : "שלחו לי קוד אימות"}<ArrowLeft size={18} /></button>
      </form>
    ) : (
      <form className="form" onSubmit={verify} noValidate>
        <Field label="קוד אימות *"><OtpInput value={code} onChange={setCode} onComplete={(value) => void verifyCode(value)} disabled={loading} /></Field>
        <button className="btn btn-primary btn-lg wide" disabled={loading} type="submit">{loading ? "מאמת..." : "אימות והרשמה"}<ArrowLeft size={18} /></button>
        <button className="btn wide" disabled={loading} type="button" onClick={() => void requestCode()}>שלחו קוד חדש</button>
        <button className="btn wide" disabled={loading} type="button" onClick={() => { setChallenge(null); setCode(""); }}>שינוי פרטי הרשמה</button>
      </form>
    )}

    <div className="auth-footer">כבר יש לך משתמש? <Link href="/login">להתחברות</Link></div>
  </div></section></main>;
}
