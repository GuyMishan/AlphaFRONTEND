"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Mail, ShieldCheck } from "lucide-react";
import { AuthBrand } from "@/components/auth-brand";
import { alphaApi } from "@/lib/api";
import type { PublicInvitation } from "@/lib/types";
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from "@/lib/date-format";

export default function InvitationPage() {
  const [token, setToken] = useState("");
  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
    setToken(value);
    if (!value) {
      setError("קישור ההזמנה אינו תקין.");
      setLoading(false);
      return;
    }
    alphaApi.publicInvitation(value)
      .then(setInvitation)
      .catch(() => setError("ההזמנה לא נמצאה או שאינה זמינה יותר."))
      .finally(() => setLoading(false));
  }, []);

  return <main className="auth-page">
    <AuthBrand />
    <section className="auth-form-wrap">
      <div className="auth-card">
        {loading ? <div className="empty">טוען הזמנה...</div> : error || !invitation ? <>
          <h2>לא ניתן לפתוח את ההזמנה</h2>
          <div className="notice notice-error">{error || "ההזמנה אינה זמינה."}</div>
          <div className="auth-footer"><Link href="/login">חזרה להתחברות</Link></div>
        </> : !invitation.usable ? <>
          <h2>ההזמנה אינה פעילה</h2>
          <div className="notice notice-info">
            {invitation.status === 2 ? "ההזמנה כבר נוצלה." : invitation.status === 4 ? "ההזמנה בוטלה." : "תוקף ההזמנה פג."}
          </div>
          <div className="auth-footer"><Link href="/login">חזרה להתחברות</Link></div>
        </> : <>
          <div className="upgrade-icon"><ShieldCheck size={24} /></div>
          <h2>הוזמנת ל־{invitation.organizationName}</h2>
          <p>השלימו הרשמה ואימות חד־פעמי כדי לקבל את ההרשאות שהוגדרו עבורכם.</p>

          <div className="employer-profile-stack" style={{ margin: "22px 0" }}>
            <div className="notice notice-info"><Mail size={17} /> {invitation.email}</div>
            <div className="notice notice-info"><Building2 size={17} /> {invitation.employerName ? `${invitation.organizationName} · ${invitation.employerName}` : invitation.organizationName}</div>
          </div>

          <Link className="btn btn-primary btn-lg wide" href={`/register?invitation=${encodeURIComponent(token)}`}>
            המשך להרשמה ואימות <ArrowLeft size={18} />
          </Link>
          <div className="auth-footer">הקישור אישי וחד־פעמי ותוקפו עד {formatDateDDMMYYYY(invitation.expiresAt, "—")}.</div>
        </>}
      </div>
    </section>
  </main>;
}
