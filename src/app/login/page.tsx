"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AuthBrand } from "@/components/auth-brand";
import { OtpInput } from "@/components/otp-input";
import { Field, type FieldErrors } from "@/components/form-feedback";
import { setSession } from "@/lib/session";
import { isIsraeliId } from "@/lib/validation";

type Challenge = { challengeId: string };

export default function LoginPage() {
  const router = useRouter();
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [nextSendAt, setNextSendAt] = useState(0);

  async function requestCode() {
    const next: FieldErrors = {};
    const prototypeAdmin = nationalId === "123456789" && phone === "0501234567";
    if (!prototypeAdmin && !isIsraeliId(nationalId)) next.nationalId = "תעודת הזהות אינה תקינה.";
    if (!/^05\d{8}$/.test(phone)) next.phone = "מספר הטלפון חייב להיות מספר נייד ישראלי בן 10 ספרות.";
    setErrors(next);
    if (Object.values(next).some(Boolean)) { toast.error("יש לתקן את השדות המסומנים באדום."); return; }
    if (Date.now() < nextSendAt) { toast.error("ניתן לבקש קוד חדש בעוד דקה."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/backend/api/auth/otp/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId, phone, channel: "email" }), cache: "no-store",
      });
      if (!response.ok) {
        toast.error(response.status === 401 ? "תעודת הזהות או מספר הטלפון אינם תואמים" : response.status === 429 ? "ניתן לבקש קוד חדש בעוד דקה." : "לא ניתן לשלוח קוד כרגע. נסו שוב מאוחר יותר.");
        return;
      }
      const result = await response.json() as Challenge;
      setChallenge(result);
      setCode("");
      setNextSendAt(Date.now() + 60_000);
      toast.success("קוד נשלח לדוא״ל הרשום");
    } catch { toast.error("לא ניתן לשלוח קוד כרגע. נסו שוב מאוחר יותר."); }
    finally { setLoading(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!challenge || !/^\d{6}$/.test(code)) { toast.error("הזינו קוד בן 6 ספרות."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/backend/api/auth/otp/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.challengeId, code: codeToVerify }), cache: "no-store",
      });
      if (!response.ok) { toast.error(response.status === 401 ? "הקוד שגוי, פג תוקף או נוצל. נסו שוב או בקשו קוד חדש." : "לא ניתן להתחבר כרגע."); return; }
      const result = await response.json() as { accessToken: string; userId: string; platformAdmin: boolean; displayName: string };
      setSession({ mode: "oidc", ...result });
      toast.success("התחברת בהצלחה");
      router.push("/dashboard");
    } catch { toast.error("לא ניתן להתחבר כרגע."); }
    finally { setLoading(false); }
  }

  return <main className="auth-page"><AuthBrand /><section className="auth-form-wrap"><div className="auth-card">
    <h2>כניסה למערכת</h2><p>{challenge ? "הזינו את הקוד בן 6 הספרות שנשלח לדוא״ל הרשום" : "התחברו כדי להמשיך לסביבת העבודה שלכם"}</p>
    {!challenge ? <form className="form" onSubmit={(event) => { event.preventDefault(); void requestCode(); }} noValidate>
      <Field label="תעודת זהות *" error={errors.nationalId}><input aria-invalid={Boolean(errors.nationalId)} id="national-id" inputMode="numeric" autoComplete="username" dir="ltr" value={nationalId} onChange={(e) => { setNationalId(e.target.value.replace(/\D/g, "").slice(0, 9)); setErrors((current) => ({ ...current, nationalId: undefined })); }} required maxLength={9} /></Field>
      <Field label="מספר טלפון *" error={errors.phone}><input aria-invalid={Boolean(errors.phone)} id="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErrors((current) => ({ ...current, phone: undefined })); }} required maxLength={10} /></Field>
      <button className="btn btn-primary btn-lg wide" disabled={loading} type="submit">{loading ? "שולח..." : "שלחו לי קוד בדוא״ל"}<ArrowLeft size={18} /></button>
    </form> : <form className="form" onSubmit={verify} noValidate>
      <Field label="קוד אימות *"><OtpInput value={code} onChange={setCode} onComplete={(value) => void verifyCode(value)} disabled={loading} /></Field>
      <button className="btn btn-primary btn-lg wide" disabled={loading} type="submit">{loading ? "מאמת..." : "אימות וכניסה"}<ArrowLeft size={18} /></button>
      <button className="btn wide" disabled={loading} type="button" onClick={() => void requestCode()}>שלחו קוד חדש</button>
      <button className="btn wide" type="button" onClick={() => { setChallenge(null); setCode(""); }}>שינוי פרטי כניסה</button>
    </form>}
    <div className="auth-footer">צריכים ליצור משתמש? <Link href="/register">להרשמה</Link></div>
  </div></section></main>;
}
