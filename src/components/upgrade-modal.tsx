"use client";

import { Mail, Sparkles, X } from "lucide-react";
import type { UpgradeDialogDetail } from "@/lib/upgrade";

const labelByReason = {
  employers: "מעסיקים",
  active_employees: "עובדים פעילים",
  users: "משתמשים",
  feature: "האפשרות המבוקשת",
} as const;

const featureLabels: Record<string, string> = {
  report_transmission: "שליחת דיווחים",
};

export function UpgradeModal({ detail, onClose }: { detail: UpgradeDialogDetail | null; onClose: () => void }) {
  if (!detail) return null;

  const subject = encodeURIComponent("בקשה לשדרוג מסלול Alpha");
  const body = encodeURIComponent(
    [
      "שלום,",
      "אשמח לקבל פרטים על שדרוג המסלול ב-Alpha.",
      detail.planName ? `מסלול נוכחי: ${detail.planName}` : "",
      detail.reason === "feature" && detail.feature ? `אפשרות: ${featureLabels[detail.feature] ?? detail.feature}` : "",
      detail.current !== undefined && detail.maximum !== undefined ? `שימוש נוכחי: ${detail.current}/${detail.maximum} ${labelByReason[detail.reason]}` : "",
    ].filter(Boolean).join("\n"),
  );
  const mailHref = `mailto:alphapensia@gmail.com?subject=${subject}&body=${body}`;

  const title = detail.reason === "feature"
    ? "האפשרות אינה כלולה במסלול הנוכחי"
    : `הגעתם למגבלת ${labelByReason[detail.reason]}`;

  return <div className="upgrade-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="upgrade-close" type="button" aria-label="סגירה" onClick={onClose}><X size={19} /></button>
      <div className="upgrade-icon"><Sparkles size={24} /></div>
      <h2 id="upgrade-title">{title}</h2>
      <p>
        {detail.reason === "feature"
          ? `${featureLabels[detail.feature ?? ""] ?? "האפשרות הזו"} זמינה במסלול מתקדם יותר.`
          : "כדי להמשיך להרחיב את הפעילות במערכת, יש לשדרג את המסלול."}
      </p>
      {detail.current !== undefined && detail.maximum !== undefined
        ? <div className="upgrade-usage"><span>שימוש במסלול</span><b>{detail.current}/{detail.maximum}</b></div>
        : null}
      {detail.planName ? <div className="upgrade-plan">מסלול נוכחי: <b>{detail.planName}</b></div> : null}
      <div className="upgrade-actions">
        <a className="btn btn-primary btn-lg" href={mailHref}><Mail size={18} />יצירת קשר לשדרוג</a>
        <button className="btn btn-secondary" type="button" onClick={onClose}>אולי אחר כך</button>
      </div>
      <small>הפנייה תיפתח באפליקציית המייל ותישלח אל alphapensia@gmail.com.</small>
    </section>
  </div>;
}
