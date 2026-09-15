"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, UserPlus } from "lucide-react";
import { AuthBrand } from "@/components/auth-brand";
import { alphaApi } from "@/lib/api";
import { setSession } from "@/lib/session";
import { isUuid, isValidEmail } from "@/lib/validation";

export default function RegisterPage() {
  const [adminId, setAdminId] = useState("00000000-0000-0000-0000-000000000001");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [externalSubject, setExternalSubject] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const name = displayName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const subject = externalSubject.trim();
    if (name.length < 2 || name.length > 120) { setError("שם מלא הוא שדה חובה ובאורך 2-120 תווים."); return; }
    if (!isValidEmail(normalizedEmail)) { setError("כתובת האימייל אינה תקינה."); return; }
    if (!subject || subject.length > 200) { setError("מזהה OIDC הוא שדה חובה ועד 200 תווים."); return; }
    if (!isUuid(adminId)) { setError("UUID של מנהל הפלטפורמה אינו תקין."); return; }
    setLoading(true);
    setSession({ mode: "development", userId: adminId.trim(), platformAdmin: true, displayName: "Platform Admin" });
    try {
      await alphaApi.createUser({ displayName: name, email: normalizedEmail, externalSubject: subject });
      setCreated(true);
    } catch (err) { setError(err instanceof Error ? err.message : "יצירת המשתמש נכשלה"); }
    finally { setLoading(false); }
  }

  return <main className="auth-page"><AuthBrand /><section className="auth-form-wrap"><div className="auth-card"><h2>יצירת משתמש</h2><p>רישום משתמש חדש באמצעות מנהל הפלטפורמה</p>{created ? <div className="notice notice-info" style={{ textAlign: "center", padding: 28 }}><CheckCircle2 size={36} color="var(--teal)" /><h3>המשתמש נוצר בהצלחה</h3><Link className="btn btn-primary" href="/login">חזרה להתחברות</Link></div> : <form className="form" onSubmit={submit} noValidate><div className="notice notice-warning">זהו endpoint ניהולי קיים ולא הרשמה עצמית. השרת עדיין אינו כולל API להרשמה עם סיסמה.</div><div className="field"><label htmlFor="name">שם מלא *</label><input id="name" maxLength={120} value={displayName} onChange={(e) => { setDisplayName(e.target.value); setError(""); }} required /></div><div className="field"><label htmlFor="email">אימייל *</label><input id="email" type="email" maxLength={254} dir="ltr" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} required /></div><div className="field"><label htmlFor="subject">מזהה חיצוני ב־OIDC *</label><input id="subject" maxLength={200} dir="ltr" value={externalSubject} onChange={(e) => { setExternalSubject(e.target.value); setError(""); }} required /></div><div className="field"><label htmlFor="admin-id">UUID של מנהל הפלטפורמה *</label><input id="admin-id" maxLength={36} dir="ltr" value={adminId} onChange={(e) => { setAdminId(e.target.value); setError(""); }} required /></div>{error ? <div className="notice notice-error">{error}</div> : null}<button className="btn btn-primary btn-lg wide" disabled={loading} type="submit"><UserPlus size={18} />{loading ? "יוצר משתמש..." : "יצירת משתמש"}</button></form>}<div className="auth-footer">כבר יש לך משתמש? <Link href="/login">להתחברות</Link></div></div></section></main>;
}