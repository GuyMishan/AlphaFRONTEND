"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Mail, ShieldCheck } from "lucide-react";
import { AuthBrand, AuthMobileBrand } from "@/features/auth/components/auth-brand";
import { LoadingState } from "@/components/loading/loading-state";
import { authApi } from "@/features/auth/api";
import { formatDateDDMMYYYY } from "@/lib/format/date";

function invitationToken() {
  return new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
}

export default function InvitationPage() {
  // null until mounted: the token is read from the URL on the client only.
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => setToken(invitationToken()), []);
  const invitationQuery = useQuery({
    queryKey: ["invitations", "public", token],
    queryFn: ({ signal }) => authApi.publicInvitation(token ?? "", signal),
    enabled: Boolean(token),
    retry: false,
  });
  const invitation = invitationQuery.data ?? null;
  const loading = token === null || (Boolean(token) && invitationQuery.isPending);
  const error = token === "" ? "קישור ההזמנה אינו תקין." : invitationQuery.isError ? "ההזמנה לא נמצאה או שאינה זמינה יותר." : "";

  return <main className="auth-page">
    <AuthBrand />
    <section className="auth-form-wrap">
      <div className="auth-card">
        <AuthMobileBrand />
        {loading ? <LoadingState label="טוען הזמנה..." /> : error || !invitation ? <>
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

          <Link className="btn btn-primary btn-lg wide" href={`/register?invitation=${encodeURIComponent(token ?? "")}`}>
            המשך להרשמה ואימות <ArrowLeft size={18} />
          </Link>
          <div className="auth-footer">הקישור אישי וחד־פעמי ותוקפו עד {formatDateDDMMYYYY(invitation.expiresAt, "—")}.</div>
        </>}
      </div>
    </section>
  </main>;
}
