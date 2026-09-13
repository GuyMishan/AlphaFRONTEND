import { Brand } from "./brand";

export function AuthBrand() {
  return (
    <section className="auth-brand">
      <Brand />
      <div className="auth-copy">
        <h1>תפעול פנסיוני.<br />פשוט, ברור, מדויק.</h1>
        <p>מרכזים את המעסיקים, העובדים והדיווחים במקום אחד — עם בקרות, הרשאות ומעקב מלא אחר כל פעולה.</p>
      </div>
      <div className="auth-trust"><span>הרשאות מדויקות</span><span>תיעוד מלא</span><span>מידע מאובטח</span></div>
    </section>
  );
}
