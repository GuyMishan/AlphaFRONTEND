"use client";

import { Mail, Sparkles } from "lucide-react";
import { AppModal } from "@/components/app-modal";
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

  const isBillingContact = detail.reason === "feature" && detail.feature === "billing_support";
  const title = isBillingContact
    ? "עדכון מסלול ויצירת קשר"
    : detail.reason === "feature"
      ? "האפשרות אינה כלולה במסלול הנוכחי"
      : `הגעתם למגבלת ${labelByReason[detail.reason]}`;

  return <AppModal title={title} onClose={onClose} width="sm" actions={<><a className="btn btn-primary btn-lg" href={mailHref}><Mail size={18} />יצירת קשר לשדרוג</a><button className="btn btn-secondary" type="button" onClick={onClose}>אולי אחר כך</button></>}>
    <div className="upgrade-icon"><Sparkles size={24} /></div>
    <p>{isBillingContact ? "רוצים לעדכן את המסלול או לדבר איתנו על התמחור? צרו קשר ונשמח לעזור." : detail.reason === "feature" ? `${featureLabels[detail.feature ?? ""] ?? "האפשרות הזו"} זמינה במסלול מתקדם יותר.` : "כדי להמשיך להרחיב את הפעילות במערכת, יש לשדרג את המסלול."}</p>
    {detail.reason !== "users" && detail.current !== undefined && detail.maximum !== undefined ? <div className="upgrade-usage"><span>שימוש במסלול</span><b>{detail.current}/{detail.maximum}</b></div> : null}
    {detail.planName ? <div className="upgrade-plan">מסלול נוכחי: <b>{detail.planName}</b></div> : null}
    <small>הפנייה תיפתח באפליקציית המייל ותישלח אל alphapensia@gmail.com.</small>
  </AppModal>;
}
