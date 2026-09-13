"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, UserPlus } from "lucide-react";
import { AuthBrand } from "@/components/auth-brand";
import { alphaApi } from "@/lib/api";
import { setSession } from "@/lib/session";

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
    setLoading(true);
    setError("");
    setSession({ mode: "development", userId: adminId, platformAdmin: true, displayName: "Platform Admin" });
    try {
      await alphaApi.createUser({ displayName, email, externalSubject });
      setCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "יצירת המשתמש נכשלה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <AuthBrand />
      <section className="auth-form-wrap">
        <div className="auth-card">
          <h2>יצירת משתמש</h2>
          <p>רישום משתמש חדש באמצעות מנהל הפלטפורמה</p>
          {created ? (
            <div className="notice notice-info" style={{ textAlign: "center", padding: 28 }}>
              <CheckCircle2 size={36} color="var(--teal)" />
              <h3>המשתמש נוצר בהצלחה</h3>
              <Link className="btn btn-primary" href="/login">חזרה להתחברות</Link>
            </div>
          ) : (
            <form className="form" onSubmit={submit}>
              <div className="notice notice-warning">זהו endpoint ניהולי קיים ולא הרשמה עצמית. השרת עדיין אינו כולל API להרשמה עם סיסמה.</div>
              <div className="field"><label htmlFor="name">שם מלא</label><input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /></div>
              <div className="field"><label htmlFor="email">אימייל</label><input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div className="field"><label htmlFor="subject">מזהה חיצוני ב־OIDC</label><input id="subject" dir="ltr" value={externalSubject} onChange={(e) => setExternalSubject(e.target.value)} required /></div>
              <div className="field"><label htmlFor="admin-id">UUID של מנהל הפלטפורמה</label><input id="admin-id" dir="ltr" value={adminId} onChange={(e) => setAdminId(e.target.value)} required /></div>
              {error ? <div className="notice notice-error">{error}</div> : null}
              <button className="btn btn-primary btn-lg wide" disabled={loading}><UserPlus size={18} />{loading ? "יוצר משתמש..." : "יצירת משתמש"}</button>
            </form>
          )}
          <div className="auth-footer">כבר יש לך משתמש? <Link href="/login">להתחברות</Link></div>
        </div>
      </section>
    </main>
  );
}
