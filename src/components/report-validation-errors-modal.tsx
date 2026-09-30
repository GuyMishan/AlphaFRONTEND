"use client";

import { Download, AlertCircle } from "lucide-react";
import { AppModal } from "@/components/app-modal";
import type { ReportValidationIssue, ReportValidationResult } from "@/lib/report-validation-api";

type FriendlyIssue = { key: string; category: string; title: string; guidance: string; original: string; code: string };

function explain(issue: ReportValidationIssue, key: string): FriendlyIssue {
  const message = issue.message || "";
  const code = issue.code || "VALIDATION";
  const base = { key, original: message, code };
  if (/TA-DOAR|postal.box|post.office.box/i.test(message)) return {
    ...base, category: "פרטי עובדים", title: "תא הדואר של אחד העובדים אינו תקין",
    guidance: "פתחו את כרטיס העובד ובדקו את תא הדואר. אם יש כתובת רחוב מלאה ואין תא דואר, אפשר להשאיר אותו ריק. לאחר השמירה חזרו לדיווח ובצעו בדיקה חוזרת.",
  };
  if (/MIKUD|postal.code/i.test(message)) return {
    ...base, category: "פרטי עובדים", title: "המיקוד של אחד העובדים אינו תקין",
    guidance: "בדקו את המיקוד בכרטיס העובד. בממשק 006 הוא יכול להכיל עד שבע ספרות.",
  };
  if (/SUG-HAFRASHA.*(5-8|codes)/i.test(message)) return {
    ...base, category: "הפקדות", title: "נבחר רכיב הפקדה שאינו מתאים לסוג הקופה",
    guidance: "בדקו בנתוני המוצרים של העובד אם הוזנו רכיבי אובדן כושר עבודה או רכיבים אחרים לקרן פנסיה או לקופת גמל. ניתן לדווח בהן רק על רכיבים המותרים לפי ממשק 006.",
  };
  if (/SHIUR-HAFRASHA/i.test(message)) return {
    ...base, category: "הפקדות", title: "חסר אחוז הפרשה ברכיב שיש בו הפקדה",
    guidance: "פתחו את המוצר המתאים בשלב רשימת העובדים והשלימו את אחוז ההפרשה בכל רכיב מדווח שנדרש בו אחוז.",
  };
  if (code === "SALARY_PAYMENT_DATE_REQUIRED") return {
    ...base, category: "פרטי הדיווח", title: "לא הוזן תאריך תשלום שכר",
    guidance: "חזרו לפרטי הדיווח והזינו את תאריך תשלום השכר.",
  };
  if (code === "PAYMENT_REQUIRED" || code === "PAYMENT_VALIDATION") return {
    ...base, category: "פרטי תשלום", title: "יש להשלים או לתקן פרטי תשלום",
    guidance: message.startsWith("חסרים") ? message : `בדקו את פרטי התשלום בנתוני ההפקדות. ${message}`,
  };
  if (code === "PENSION_PRODUCT_REQUIRED") return {
    ...base, category: "פרטי עובדים", title: "לעובד חסר מוצר פנסיוני",
    guidance: message,
  };
  if (code === "EMPLOYEE_REQUIRED") return {
    ...base, category: "רשימת עובדים", title: "לא נבחרו עובדים לדיווח",
    guidance: message,
  };
  if (code === "FUND_REQUIRED") return {
    ...base, category: "פרטי עובדים", title: "לא נבחרה קופה למוצר",
    guidance: message,
  };
  const looksHebrew = /[\u0590-\u05ff]/.test(message);
  const fieldMatch = message.match(/The '([^']+)' element is invalid/i);
  if (fieldMatch) return {
    ...base, category: "מבנה הדיווח", title: `יש ערך שאינו מתאים לדרישות ממשק 006 (שדה ${fieldMatch[1]})`,
    guidance: "בדקו את הנתון המתאים בדיווח. פרטי השגיאה הטכנית מופיעים למטה וייכללו גם בקובץ להורדה.",
  };
  if (looksHebrew) return {
    ...base,
    category: issue.scope === "Payment" ? "פרטי תשלום" : issue.scope === "Employee" ? "פרטי עובדים" :
      issue.scope === "Product" || issue.scope === "Contribution" ? "הפקדות" : "בדיקות הדיווח",
    title: "נמצא נתון שדורש תיקון",
    guidance: message,
  };
  return {
    ...base, category: "בדיקות ממשק 006", title: "נמצא נתון שדורש בדיקה",
    guidance: "הדיווח לא נשלח. אפשר לראות את ההודעה המקורית בפרטים הטכניים שלמטה או להוריד את כל השגיאות ולבדוק את השדות הרלוונטיים.",
  };
}

function csvCell(value: string): string {
  // Prevent spreadsheet formula injection while retaining a readable UTF-8 CSV.
  const safe = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function ReportValidationErrorsModal({ result, onClose, reportMonth }: {
  result: ReportValidationResult; onClose: () => void; reportMonth: string;
}) {
  const issues: ReportValidationIssue[] = result.issues?.length ? result.issues :
    (result.errors ?? []).map((message) => ({ code: "VALIDATION", message, scope: "Report" }));
  // The backend may return one message in several scopes; display each unique finding once.
  const findings = issues.filter((issue, index, all) =>
    all.findIndex((other) => other.code === issue.code && other.message === issue.message) === index)
    .map((issue, index) => explain(issue, String(index)));

  function download() {
    const header = ["מספר", "תחום", "מה צריך לתקן", "איך מתקנים", "קוד טכני", "הודעה מקורית"];
    const rows = findings.map((item, index) => [
      String(index + 1), item.category, item.title, item.guidance, item.code, item.original,
    ]);
    const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `alpha-report-errors-${reportMonth || "report"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <AppModal title="נמצאו שגיאות בדיווח"
    subtitle={`לא ניתן להשלים את הדיווח לפני תיקון ${findings.length} ${findings.length === 1 ? "שגיאה" : "שגיאות"}.`}
    width="lg" className="report-validation-modal" onClose={onClose}
    actions={<>
      <button type="button" className="btn btn-secondary" onClick={onClose}>סגירה וחזרה לדיווח</button>
      <button type="button" className="btn btn-primary" onClick={download}><Download size={17} /> הורדת דוח השגיאות</button>
    </>}>
    <p className="report-validation-intro">תקנו את הנתונים ברשימה ולאחר מכן הפעילו שוב את בדיקת הדיווח. פירוט טכני זמין לכל שגיאה ולצוות התמיכה.</p>
    <div className="report-validation-findings">
      {findings.map((item, index) => <section className="report-validation-finding" key={item.key}>
        <div className="report-validation-finding-heading">
          <AlertCircle size={20} aria-hidden="true" />
          <div><span className="report-validation-category">{item.category} · שגיאה {index + 1}</span><h3>{item.title}</h3></div>
        </div>
        <p>{item.guidance}</p>
        <details><summary>פרטים טכניים</summary><div className="report-validation-technical">
          <span>קוד: <b dir="ltr">{item.code}</b></span>
          <p dir="auto">{item.original}</p>
        </div></details>
      </section>)}
    </div>
  </AppModal>;
}
