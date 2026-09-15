"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AuthBrand } from "@/components/auth-brand";
import { DEMO_CREDENTIALS } from "@/lib/demo-data";
import { setSession } from "@/lib/session";
import { isIsraeliId } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const isDemoCredentials = nationalId === DEMO_CREDENTIALS.nationalId && phone === DEMO_CREDENTIALS.phone;
    if (!isDemoCredentials && !isIsraeliId(nationalId)) { setError("תעודת הזהות אינה תקינה."); return; }
    if (!isDemoCredentials && !/^05\d{8}$/.test(phone)) { setError("מספר הטלפון חייב להיות מספר נייד ישראלי בן 10 ספרות."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/backend/api/auth/prototype-login", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ nationalId, phone }), cache: "no-store" });
      if (!response.ok) { setError(response.status === 401 ? "תעודת הזהות או מספר הטלפון אינם תואמים לפרטי ההדגמה" : "לא ניתן להתחבר כרגע. נסו שוב בעוד רגע."); return; }
      const result = await response.json() as { accessToken: string; userId: string; platformAdmin: boolean; displayName: string; };
      setSession({ mode: "oidc", accessToken: result.accessToken, userId: result.userId, platformAdmin: result.platformAdmin, displayName: result.displayName });
      router.push("/dashboard");
    } catch { setError("לא ניתן להתחבר כרגע. נסו שוב בעוד רגע."); }
    finally { setLoading(false); }
  }

  return <main className="auth-page"><AuthBrand /><section className="auth-form-wrap"><div className="auth-card"><h2>כניסה למערכת</h2><p>התחברו כדי להמשיך לסביבת העבודה שלכם</p><div className="notice notice-info" style={{ marginBottom: 20 }}><ShieldCheck size={15} style={{ verticalAlign: "middle", marginLeft: 6 }} />בעתיד יישלח קוד חד־פעמי למספר הטלפון לצורך אימות זהות.</div><form className="form" onSubmit={submit} noValidate><div className="field"><label htmlFor="national-id">תעודת זהות *</label><input id="national-id" inputMode="numeric" autoComplete="username" dir="ltr" value={nationalId} onChange={(e) => { setNationalId(e.target.value.replace(/\D/g, "").slice(0, 9)); setError(""); }} placeholder="9 ספרות" required maxLength={9} /></div><div className="field"><label htmlFor="phone">מספר טלפון *</label><input id="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }} placeholder="05XXXXXXXX" required maxLength={10} /></div><div className="notice notice-warning"><b>פרטי כניסה להדגמה</b><br />תעודת זהות: <span dir="ltr">{DEMO_CREDENTIALS.nationalId}</span><br />טלפון: <span dir="ltr">{DEMO_CREDENTIALS.phone}</span></div>{error ? <div className="notice notice-error">{error}</div> : null}<button className="btn btn-primary btn-lg wide" disabled={loading} type="submit">{loading ? "מתחבר..." : "כניסה למערכת"}<ArrowLeft size={18} /></button></form><div className="auth-footer">צריכים ליצור משתמש? <Link href="/register">להרשמה</Link></div></div></section></main>;
}
