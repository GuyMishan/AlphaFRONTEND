"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { notify } from "@/components/notifications";
import { useAppearance } from "@/components/theme-provider";
import type { AppearancePreference } from "@/lib/user-preferences-api";

const options: Array<{ value: AppearancePreference; title: string; description: string; icon: typeof Sun }> = [
  { value: "light", title: "מצב בהיר", description: "תצוגה בהירה קבועה", icon: Sun },
  { value: "dark", title: "מצב כהה", description: "תצוגה כהה קבועה", icon: Moon },
  { value: "system", title: "לפי המערכת", description: "מתאים את התצוגה להגדרת המכשיר", icon: Monitor },
];

export default function SettingsPage() {
  const { appearance, resolvedTheme, loading, saving, setAppearance } = useAppearance();

  async function choose(value: AppearancePreference) {
    if (value === appearance || saving) return;
    try {
      await setAppearance(value);
      notify.success("הגדרת התצוגה נשמרה למשתמש");
    } catch {
      notify.error("שמירת הגדרת התצוגה נכשלה");
    }
  }

  return <>
    <div className="page-head">
      <div><h1>הגדרות</h1><p>העדפות אישיות של המשתמש</p></div>
    </div>
    <div className="card settings-card">
      <div className="card-head"><div><h2>תצוגה</h2><span style={{ color: "var(--muted)" }}>ההגדרה נשמרת לחשבון שלך ותיטען בכל התחברות.</span></div></div>
      <div className="appearance-options" aria-busy={loading || saving}>
        {options.map((option) => {
          const Icon = option.icon;
          const selected = appearance === option.value;
          return <button key={option.value} type="button" className={`appearance-option${selected ? " selected" : ""}`} disabled={loading || saving} onClick={() => void choose(option.value)}>
            <span className="appearance-option-icon"><Icon size={22} /></span>
            <span><b>{option.title}</b><small>{option.description}</small></span>
            <span className="appearance-radio" aria-hidden="true">{selected ? "✓" : ""}</span>
          </button>;
        })}
      </div>
      <div className="settings-current-theme">מצב פעיל כרגע: <b>{resolvedTheme === "dark" ? "כהה" : "בהיר"}</b>{appearance === "system" ? " · לפי המערכת" : ""}</div>
    </div>
  </>;
}
