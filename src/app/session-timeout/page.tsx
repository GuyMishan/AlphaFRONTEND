"use client";
import Link from "next/link";
export default function SessionTimeoutPage() {
  return <main className="auth-page"><section className="auth-form-wrap"><div className="auth-card"><h2>החיבור פג</h2><p>נותקת מהמערכת לאחר 30 דקות ללא פעילות. מטעמי אבטחה יש להתחבר מחדש כדי להמשיך.</p><Link className="btn btn-primary btn-lg wide" href="/login">התחברות מחדש</Link></div></section></main>;
}
