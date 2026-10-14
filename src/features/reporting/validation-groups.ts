import type { ReportValidationIssue, ReportValidationResult } from "@/features/reporting/validation-api";

export type ValidationGroup = { code: string; title: string; description: string; issues: ReportValidationIssue[]; employeeCount: number };
export const validationIssues = (result: ReportValidationResult): ReportValidationIssue[] =>
  result.issues?.length ? result.issues : (result.errors ?? []).map(message => ({ code: "VALIDATION", message, scope: "Report" }));

export function validationGroups(issues: ReportValidationIssue[]): ValidationGroup[] {
  const byCode = new Map<string, ReportValidationIssue[]>();
  for (const issue of issues) {
    const code = issue.code || "VALIDATION";
    const rows = byCode.get(code) ?? [];
    rows.push(issue);
    byCode.set(code, rows);
  }
  return [...byCode.entries()].map(([code, rows]) => {
    const title = validationTitle(code, rows[0].message);
    return { code, title, description: validationDescription(code, rows[0].message),
      issues: rows, employeeCount: new Set(rows.map(row => row.employeeId).filter(Boolean)).size };
  }).sort((a, b) => b.issues.length - a.issues.length || a.code.localeCompare(b.code, "he", { numeric: true }));
}

export function validationStage(issue: ReportValidationIssue): 1 | 2 | 3 {
  if (issue.code === "SALARY_PAYMENT_DATE_REQUIRED" || issue.scope === "Report") return 1;
  if (issue.scope === "Payment" || issue.code.startsWith("PAYMENT_")) return 3;
  return 2;
}

function validationTitle(code: string, message: string): string {
  const titles: Record<string, string> = {
    SUG_SHGIHA_16: "חסרים תגמולי מעסיק",
    SUG_SHGIHA_17: "חסרים תגמולי עובד",
    SUG_SHGIHA_23: "פיצויים ללא רכיבי תגמולים נדרשים",
    SUG_SHGIHA_28: "חודש השכר כבר דווח עבור המוצר",
    SUG_SHGIHA_43: "נמצאה תנועה זהה לדיווח קודם",
    SUG_SHGIHA_53: "סכום ההפקדה אינו תואם לשכר ולאחוז",
    SUG_SHGIHA_71: "שיעורי תגמולים אינם תקינים",
    SUG_SHGIHA_72: "חריגה מתקרת שיעור ההפקדה",
    SUG_SHGIHA_75: "חסר שכר מדווח",
    PAYMENT_REQUIRED: "חסרים פרטי תשלום",
    PAYMENT_VALIDATION: "פרטי תשלום לא תקינים",
    EMPLOYEE_REQUIRED: "לא נבחרו עובדים",
    PENSION_PRODUCT_REQUIRED: "חסר מוצר פנסיוני",
    FUND_REQUIRED: "לא נבחרה קופה למוצר",
    SALARY_PAYMENT_DATE_REQUIRED: "חסר תאריך תשלום שכר",
  };
  if (titles[code]) return titles[code];
  if (/TA-DOAR|postal.box/i.test(message)) return "תא דואר לא תקין";
  if (/MIKUD|postal.code/i.test(message)) return "מיקוד לא תקין";
  if (/SHIUR-HAFRASHA/i.test(message)) return "חסר שיעור הפרשה";
  if (/SUG-HAFRASHA/i.test(message)) return "רכיב הפרשה אינו מתאים לסוג הקופה";
  return code === "EMPLOYER_INTERFACE_006" ? "נתון אינו תואם לדרישות ממשק 006" : "שגיאה בבדיקת הדיווח";
}

function validationDescription(code: string, message: string): string {
  if (code === "SUG_SHGIHA_28" || code === "SUG_SHGIHA_43")
    return "הנתון כבר מופיע בדיווח קודם. יש לבדוק את היסטוריית הדיווחים לפני ניסיון שידור נוסף.";
  if (code.startsWith("PAYMENT_")) return "יש לבדוק את נתוני אמצעי התשלום של ההפקדות המושפעות.";
  if (code === "SUG_SHGIHA_72") return "יש לבדוק את שיעורי תגמולי המעסיק ואובדן כושר העבודה מול התקרה המותרת.";
  if (code === "SUG_SHGIHA_53") return "בדקו את השכר, אחוז ההפרשה וסכום ההפקדה במוצרים המושפעים.";
  if (code === "SALARY_PAYMENT_DATE_REQUIRED") return "יש להזין תאריך תשלום שכר בפרטי הדיווח.";
  if (code === "PENSION_PRODUCT_REQUIRED" || code === "FUND_REQUIRED") return "יש להשלים את נתוני המוצר הפנסיוני של העובד.";
  return /[\u0590-\u05ff]/.test(message) ? "לכל עובד ומוצר מוצג פירוט השגיאה המקורית כדי לאפשר תיקון מדויק." : "ניתן לראות את פירוט השגיאה הטכנית בכל רשומה.";
}
