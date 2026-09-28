"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/brand";

export default function SessionTimeoutPage() {
  return (
    <main className="session-timeout-page" dir="rtl">
      <div className="session-timeout-brand"><Brand /></div>
      <div className="session-timeout-orb session-timeout-orb-top" aria-hidden="true" />
      <div className="session-timeout-orb session-timeout-orb-bottom" aria-hidden="true" />

      <section className="session-timeout-card" aria-labelledby="session-timeout-title">
        <div className="session-timeout-icon" aria-hidden="true">
          <Clock3 size={43} strokeWidth={1.8} />
          <span><LockKeyhole size={18} strokeWidth={2.2} /></span>
        </div>

        <h1 id="session-timeout-title">תוקף ההתחברות פג</h1>
        <p>נותקת מהמערכת לאחר 30 דקות ללא פעילות. מטעמי אבטחה, יש להתחבר מחדש כדי להמשיך לעבוד ב־ALPHA.</p>

        <Link className="btn btn-primary btn-lg session-timeout-login" href="/login">
          חזרה לדף ההתחברות
          <ArrowLeft size={18} />
        </Link>

        <div className="session-timeout-security">
          <LockKeyhole size={14} />
          <span>ההתנתקות האוטומטית מסייעת לשמור על המידע שלך מאובטח.</span>
        </div>
      </section>
    </main>
  );
}
