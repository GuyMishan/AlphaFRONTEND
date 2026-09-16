"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AuthBrand } from "@/components/auth-brand";
import { Field, type FieldErrors } from "@/components/form-feedback";
import { setSession } from "@/lib/session";
import { isIsraeliId } from "@/lib/validation";

const DEMO_LOGIN_CREDENTIALS = new Set([
  "123456789:0501234567",
  "200000008:0507000001",
  "200000016:0507000002",
]);

function isDemoLogin(nationalId: string, phone: string) {
  return DEMO_LOGIN_CREDENTIALS.has(`${nationalId}:${phone}`);
}

export default function LoginPage() {
  const router = useRouter();
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: FieldErrors = {};
    const demoLogin = isDemoLogin(nationalId, phone);
    if (!demoLogin && !isIsraeliId(nationalId)) next.nationalId = "תעודת הזהות אינה תקינה.";
    if (!demoLogin && !/^05\d{8}$/.test(phone)) next.phone = "מספר הטלפון חייב להיות מספר נייד ישראלי בן 10 ספרות.";
    setErrors(next);
    if (Object.values(next).some(Boolean)) { toast.error("יש לתקן את השדות המסומנים באדום."); return; }

    setLoading(true);
    try {
      const response = await fetch("/api/backend/api/auth/prototype-login", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ nationalId, phone }), cache: "no-store" });
      if (!response.ok) { toast.error(response.status === 401 ? "תעודת הזהות או מספר הטלפון אינם תואמים" : "לא ניתן להתחבר כרגע. נסו שוב בעוד רגע."); return; }
      const result = await response.json() as { accessToken: string; userId: string; platformAdmin: boolean; displayName: string; };
      setSession({ mode: "oidc", accessToken: result.accessToken, userId: result.userId, platformAdmin: result.platformAdmin, displayName: result.displayName });
      toast.success("התחברת בהצלחה");
      router.push("/dashboard");
    } catch { toast.error("לא ניתן להתחבר כרגע. נסו שוב בעוד רגע."); }
    finally { setLoading(false); }
  }

  return <main className="auth-page"><AuthBrand /><section className="auth-form-wrap"><div className="auth-card"><h2>כניסה למערכת</h2><p>התחברו כדי להמשיך לסביבת העבודה שלכם</p><form className="form" onSubmit={submit} noValidate><Field label="תעודת זהות *" error={errors.nationalId}><input aria-invalid={Boolean(errors.nationalId)} id="national-id" inputMode="numeric" autoComplete="username" dir="ltr" value={nationalId} onChange={(e) => { setNationalId(e.target.value.replace(/\D/g, "").slice(0, 9)); setErrors((current) => ({ ...current, nationalId: undefined })); }} required maxLength={9} /></Field><Field label="מספר טלפון *" error={errors.phone}><input aria-invalid={Boolean(errors.phone)} id="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErrors((current) => ({ ...current, phone: undefined })); }} required maxLength={10} /></Field><button className="btn btn-primary btn-lg wide" disabled={loading} type="submit">{loading ? "מתחבר..." : "כניסה למערכת"}<ArrowLeft size={18} /></button></form><div className="auth-footer">צריכים ליצור משתמש? <Link href="/register">להרשמה</Link></div></div></section></main>;
}
