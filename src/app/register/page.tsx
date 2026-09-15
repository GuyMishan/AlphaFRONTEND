"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, UserPlus } from "lucide-react";
import { AuthBrand } from "@/components/auth-brand";
import { isIsraeliId, isValidEmail } from "@/lib/validation";

const PLATFORM_ADMIN_ID = "00000000-0000-0000-0000-000000000001";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const name = displayName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedNationalId = nationalId.trim();
    const normalizedPhone = phone.trim();

    if (name.length < 2 || name.length > 120) { setError("שם מלא הוא שדה חובה ובאורך 2-120 תווים."); return; }
    if (!isValidEmail(normalizedEmail)) { setError("כתובת האימייל אינה תקינה."); return; }
    if (!isIsraeliId(normalizedNationalId)) { setError("תעודת הזהות אינה תקינה."); return; }
    if (!/^05\d{8}$/.test(normalizedPhone)) { setError("מספר הטלפון חייב להיות מספר נייד ישראלי בן 10 ספרות."); return; }

    setLoading(true);
    try {
      const response = await fetch("/api/backend/api/platform/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Alpha-User-Id": PLATFORM_ADMIN_ID,
          "X-Alpha-Platform-Admin": "true",
        },
        body: JSON.stringify({
          displayName: name,
          email: normalizedEmail,
          nationalId: normalizedNationalId,
          phone: normalizedPhone,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        let message = "יצירת המשתמש נכשלה";
        try {
          const problem = await response.json() as { detail?: string; error?: string; title?: string };
          message = problem.detail ?? problem.error ?? problem.title ?? message;
        } catch { /* empty response */ }
        throw new Error(message);
      }
      setCreated(true);
    } catch (err) { setError(err instanceof Error ? err.message : "יצירת המשתמש נכשלה"); }
    finally { setLoading(false); }
  }

  return <main className="auth-page"><AuthBrand /><section className="auth-form-wrap"><div className="auth-card"><h2>יצירת משתמש</h2><p>הזינו את פרטי המשתמש החדש</p>{created ? <div className="notice notice-info" style={{ textAlign: "center", padding: 28 }}><CheckCircle2 size={36} color="var(--teal)" /><h3>המשתמש נוצר בהצלחה</h3><Link className="btn btn-primary" href="/login">חזרה להתחברות</Link></div> : <form className="form" onSubmit={submit} noValidate><div className="field"><label htmlFor="name">שם מלא *</label><input id="name" maxLength={120} value={displayName} onChange={(e) => { setDisplayName(e.target.value); setError(""); }} required /></div><div className="field"><label htmlFor="national-id">תעודת זהות *</label><input id="national-id" inputMode="numeric" dir="ltr" maxLength={9} value={nationalId} onChange={(e) => { setNationalId(e.target.value.replace(/\D/g, "").slice(0, 9)); setError(""); }} placeholder="9 ספרות" required /></div><div className="field"><label htmlFor="phone">מספר טלפון *</label><input id="phone" type="tel" inputMode="tel" dir="ltr" maxLength={10} value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }} placeholder="05XXXXXXXX" required /></div><div className="field"><label htmlFor="email">אימייל *</label><input id="email" type="email" maxLength={254} dir="ltr" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} required /></div>{error ? <div className="notice notice-error">{error}</div> : null}<button className="btn btn-primary btn-lg wide" disabled={loading} type="submit"><UserPlus size={18} />{loading ? "יוצר משתמש..." : "יצירת משתמש"}</button></form>}<div className="auth-footer">כבר יש לך משתמש? <Link href="/login">להתחברות</Link></div></div></section></main>;
}
