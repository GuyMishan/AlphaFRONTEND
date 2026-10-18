"use client";

import { useEffect, useState } from "react";
import { UiCheckbox } from "@/components/ui/ui-controls";
import { userPreferencesApi } from "@/features/settings/api";
import { Monitor, Moon, Sun } from "lucide-react";
import { notify } from "@/components/ui/notifications";
import { errorMessage } from "@/lib/api/error-messages";
import { AppShell } from "@/features/shell/components/app-shell";
import { useAppearance } from "@/features/settings/components/theme-provider";
import type { AppearancePreference } from "@/features/settings/api";
import { PageHeader } from "@/components/layout/page-header";

const options: Array<{ value: AppearancePreference; title: string; description: string; icon: typeof Sun }> = [
  { value: "light", title: "מצב בהיר", description: "תצוגה בהירה קבועה", icon: Sun },
  { value: "dark", title: "מצב כהה", description: "תצוגה כהה קבועה", icon: Moon },
  { value: "system", title: "לפי המערכת", description: "מתאים את התצוגה להגדרת המכשיר", icon: Monitor },
];

export default function SettingsPage() {
  const { appearance, resolvedTheme, loading, saving, setAppearance } = useAppearance();
  const [marketing, setMarketing] = useState(false);
  const [marketingLoading, setMarketingLoading] = useState(true);
  const [marketingSaving, setMarketingSaving] = useState(false);
  useEffect(() => {
    let active = true;
    userPreferencesApi.get().then(value => { if (active) setMarketing(value.marketingEmailOptIn); })
      .catch(() => notify.error("טעינת העדפות הדיוור נכשלה"))
      .finally(() => { if (active) setMarketingLoading(false); });
    return () => { active = false; };
  }, []);
  async function updateMarketing(value: boolean) {
    setMarketingSaving(true);
    try { await userPreferencesApi.setMarketing(value); setMarketing(value); notify.success("העדפת הדיוור עודכנה"); }
    catch { notify.error("שמירת העדפת הדיוור נכשלה"); }
    finally { setMarketingSaving(false); }
  }

  async function choose(value: AppearancePreference) {
    if (value === appearance || saving) return;
    try {
      await setAppearance(value);
      notify.success("הגדרת התצוגה נשמרה למשתמש");
    } catch (error) {
      // The provider has already restored the last saved theme.
      const reason = errorMessage(error, "");
      notify.error("שמירת הגדרת התצוגה נכשלה. התצוגה הוחזרה להגדרה הקודמת.", reason ? { description: reason } : undefined);
    }
  }

  return <AppShell title="הגדרות" hideScopeController>
    <PageHeader title="הגדרות" description="העדפות אישיות של המשתמש" />
    <div className="card settings-card">
      <div className="card-head"><div><h2>תצוגה</h2><span style={{ color: "var(--color-text-muted)" }}>ההגדרה נשמרת לחשבון שלך ותיטען בכל התחברות.</span></div></div>
      <div className="appearance-options" aria-busy={loading || saving}>
        {options.map((option) => {
          const Icon = option.icon;
          const selected = appearance === option.value;
          return <button key={option.value} type="button" className={`appearance-option${selected ? " selected" : ""}`} aria-pressed={selected} disabled={loading || saving} onClick={() => void choose(option.value)}>
            <span className="appearance-option-icon"><Icon size={22} aria-hidden="true" /></span>
            <span><b>{option.title}</b><small>{option.description}</small></span>
            <span className="appearance-radio" aria-hidden="true">{selected ? "✓" : ""}</span>
          </button>;
        })}
      </div>
      <div className="settings-current-theme">מצב פעיל כרגע: <b>{resolvedTheme === "dark" ? "כהה" : "בהיר"}</b>{appearance === "system" ? " · לפי המערכת" : ""}</div>
    </div>
    <div className="card settings-card">
      <div className="card-head"><div><h2>העדפות תקשורת</h2><span>ניתן לשנות את הבחירה בכל עת.</span></div></div>
      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <UiCheckbox checked={marketing} disabled={marketingLoading || marketingSaving}
          onChange={(event) => void updateMarketing(event.target.checked)} />
        <span>אני מסכים/ה לקבל עדכונים והודעות שיווקיות בדוא״ל מ־ALPHA.</span>
      </label>
      <p>הודעות תפעוליות והודעות אבטחה יישלחו גם ללא הסכמה שיווקית.</p>
    </div>
  </AppShell>;
}
