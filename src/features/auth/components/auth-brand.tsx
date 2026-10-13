import { FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
import { AlphaSymbol } from "@/components/brand/alpha-logo";
import { Brand } from "@/components/brand/brand";

export function AuthBrand() {
  return (
    <section className="auth-brand">
      <AlphaSymbol className="auth-brand-watermark" />
      <Brand />
      <div className="auth-copy">
        <h1>תפעול פנסיוני.<br /><span className="auth-accent">פשוט, ברור, מדויק.</span></h1>
        <p>מרכזים את המעסיקים, העובדים והדיווחים במקום אחד — עם בקרות, הרשאות ומעקב מלא אחר כל פעולה.</p>
      </div>
      <div className="auth-trust">
        <span><ShieldCheck size={15} aria-hidden="true" />הרשאות מדויקות</span>
        <span><FileCheck2 size={15} aria-hidden="true" />תיעוד מלא</span>
        <span><LockKeyhole size={15} aria-hidden="true" />מידע מאובטח</span>
      </div>
    </section>
  );
}

/** The brand panel is hidden on narrow screens; forms show this compact lockup instead. */
export function AuthMobileBrand() {
  return <Brand className="auth-mobile-brand" />;
}
