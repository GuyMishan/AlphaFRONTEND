"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { AuthBrand } from "@/components/auth-brand";
import { alphaApi } from "@/lib/api";
import { setSession } from "@/lib/session";

const DEFAULT_DEV_USER = "00000000-0000-0000-0000-000000000001";

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(DEFAULT_DEV_USER);
  const [displayName, setDisplayName] = useState("מנהל מערכת");
  const [platformAdmin, setPlatformAdmin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSession({ mode: "development", userId, platformAdmin, displayName });
    try {
      await alphaApi.organizations();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ההתחברות נכשלה");
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <AuthBrand />
      <section className="auth-form-wrap">
        <div className="auth-card">
          <h2>כניסה למערכת</h2>
          <p>התחברו כדי להמשיך לסביבת העבודה שלכם</p>
          <div className="notice notice-info" style={{ marginBottom: 20 }}>
            <LockKeyhole size={15} style={{ verticalAlign: "middle", marginLeft: 6 }} />
            ה־Backend משתמש כרגע באימות Development Header. המסך יוחלף ב־OIDC כאשר יוגדר ספק הזהויות.
          </div>
          <form className="form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="display-name">שם לתצוגה</label>
              <input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="user-id">מזהה משתמש (UUID)</label>
              <input id="user-id" dir="ltr" value={userId} onChange={(e) => setUserId(e.target.value)} pattern="[0-9a-fA-F-]{36}" required />
              <small>נשלח לשרת כ־X-User-Id, בהתאם לחוזה האימות הקיים.</small>
            </div>
            <label className="check-row">
              <input type="checkbox" checked={platformAdmin} onChange={(e) => setPlatformAdmin(e.target.checked)} />
              כניסה כמנהל פלטפורמה בסביבת הפיתוח
            </label>
            {error ? <div className="notice notice-error">{error}</div> : null}
            <button className="btn btn-primary btn-lg wide" disabled={loading}>
              {loading ? "מתחבר..." : "כניסה למערכת"}<ArrowLeft size={18} />
            </button>
          </form>
          <div className="auth-footer">צריכים ליצור משתמש? <Link href="/register">להרשמה</Link></div>
        </div>
      </section>
    </main>
  );
}
