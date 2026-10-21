"use client";

import { useState } from "react";
import { ArrowLeft, FilePenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  reportFeedbackApi,
  type FeedbackResolutionGroup,
} from "@/features/feedback/api";
import { errorMessage } from "@/lib/api/error-messages";

type FieldSpec = readonly [key: string, label: string, source?: "reported" | "current" | "feedback"];

const resolverConfig: Record<string, {
  title: string;
  description: string;
  button: string;
  fields: readonly FieldSpec[];
}> = {
  contribution: {
    title: "תיקון הפרשות",
    description: "מוצגים רק נתוני ההפרשה הקשורים לשגיאות בקבוצה. העריכה עצמה תתבצע בסביבת תיקון של הדיווח.",
    button: "פתיחת תיקון ההפרשות",
    fields: [
      ["contributionAmount", "סכום הפרשה"],
      ["contributionPercentage", "אחוז הפרשה"],
      ["exemptPayments", "תשלומים פטורים"],
      ["calculatedSalary", "שכר מחושב", "feedback"],
      ["contributionRate", "שיעור לפי היצרן", "feedback"],
      ["recordIdentifier", "מזהה רשומה"],
    ],
  },
  productPolicy: {
    title: "תיקון מוצר ופוליסה",
    description: "ההשוואה מתמקדת בזיהוי המוצר והפוליסה. התיקון ייעשה בסביבת תיקון ולא על הדיווח שנשלח.",
    button: "פתיחת תיקון המוצר",
    fields: [
      ["productType", "סוג מוצר"],
      ["fundName", "שם קופה"],
      ["fundCompanyName", "יצרן"],
      ["fundCode", "קוד קופה"],
      ["policyNumber", "מספר פוליסה"],
      ["salary", "שכר מבוטח"],
      ["reportingType", "סוג תקבול"],
      ["section14Code", "סעיף 14"],
    ],
  },
  employmentStatus: {
    title: "תיקון סטטוס העסקה",
    description: "מוצגים נתוני סטטוס ההעסקה הרלוונטיים למשוב. השינוי יירשם בגרסת התיקון של הדיווח.",
    button: "פתיחת תיקון סטטוס העסקה",
    fields: [
      ["employeeStatus", "סטטוס עובד"],
      ["statusStartDate", "תאריך תחילת סטטוס"],
      ["employmentStartDate", "תחילת העסקה"],
      ["employmentPercentage", "אחוז משרה"],
      ["workDaysInMonth", "ימי עבודה בחודש"],
      ["monthlySalary", "שכר חודשי"],
    ],
  },
  payment: {
    title: "תיקון פרטי תשלום",
    description: "מוצגים פרטי התשלום והחשבון הרלוונטיים בלבד. שינוי רשמי ייעשה דרך עורך ההפקדה בסביבת התיקון.",
    button: "פתיחת תיקון התשלום",
    fields: [
      ["paymentMethodCode", "קוד אמצעי תשלום"],
      ["paymentMethod", "אמצעי תשלום"],
      ["referenceNumber", "אסמכתא"],
      ["valueDate", "תאריך ערך"],
      ["actualDepositAmount", "סכום הפקדה בפועל"],
      ["employerBankCode", "בנק מעסיק"],
      ["employerBranch", "סניף מעסיק"],
      ["employerAccount", "חשבון מעסיק"],
      ["currentPaymentBankId", "בנק נוכחי", "current"],
      ["currentPaymentBranchId", "סניף נוכחי", "current"],
      ["currentPaymentAccountNumber", "חשבון נוכחי", "current"],
      ["reportedDepositAmount", "דווח שהופקד", "feedback"],
      ["actualReceivedAmount", "נקלט בפועל", "feedback"],
    ],
  },
  documents: {
    title: "תיקון מסמכים",
    description: "המשוב דורש מסמך או פרטי מסמך. סביבת התיקון מרכזת את המסמכים והאסמכתאות בלי לשנות את הראיה ההיסטורית שנשלחה.",
    button: "פתיחת טיפול במסמכים",
    fields: [
      ["sourceFileName", "קובץ משוב", "feedback"],
      ["policyNumber", "פוליסה"],
      ["fundName", "מוצר"],
      ["fundCompanyName", "יצרן"],
      ["recordIdentifier", "מזהה רשומה", "feedback"],
      ["errorDate", "תאריך שגיאה", "feedback"],
    ],
  },
  refund: {
    title: "תיקון החזר / תנועה מקורית",
    description: "המשוב דורש תיקון שמבוסס על התנועה המקורית. ALPHA שומרת את הקשר לתקלה ופותחת סביבת תיקון שממנה ניתן להפיק את התנועה השלילית הנדרשת.",
    button: "פתיחת תיקון החזר",
    fields: [
      ["previousRecordIdentifier", "מזהה תנועה מקורית"],
      ["recordIdentifier", "מזהה רשומה"],
      ["contributionAmount", "סכום"],
      ["contributionPercentage", "אחוז"],
      ["refundAmount", "סכום החזר", "feedback"],
      ["policyNumber", "מספר פוליסה"],
      ["fundName", "מוצר"],
      ["fundCompanyName", "יצרן"],
    ],
  },
  reportCorrection: {
    title: "תיקון הדיווח",
    description: "המשוב מחייב תיקון ברמת הדיווח. נפתח או נמשיך סביבת תיקון של הדיווח המקורי.",
    button: "פתיחת תיקון הדיווח",
    fields: [
      ["reportingMonth", "חודש דיווח"],
      ["reportKind", "סוג דיווח"],
      ["salaryPaymentDate", "תאריך תשלום שכר"],
      ["operationCode", "קוד פעולה"],
      ["depositStatus", "סטטוס הפקדה"],
      ["salaryMonth", "חודש שכר"],
      ["recordIdentifier", "מזהה רשומה"],
      ["previousRecordIdentifier", "מזהה תנועה קודמת"],
    ],
  },
};

export function FeedbackInternalCorrectionResolver({
  organizationId,
  employerId,
  group,
  onEditDeposit,
}: {
  organizationId: string;
  employerId: string;
  group: FeedbackResolutionGroup;
  onEditDeposit?: (problemIds: string[]) => void;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const problem = group.problems[0];
  const config = resolverConfig[group.resolverType];

  if (!problem || !config) return null;

  const documentGroup = group.resolverType === "documents";
  const documentType = (() => {
    try {
      const parsed = JSON.parse(problem.correctionFields ?? "[]") as { documentTypeCode?: unknown };
      return [3, 4, 5, 6].includes(Number(parsed?.documentTypeCode)) ? Number(parsed.documentTypeCode) : null;
    } catch { return null; }
  })();

  const canPrepareWorkspace = group.problems.every(item =>
    item.resolutionType === "edit"
    && item.correctionBehavior === "correctionWorkspace"
    && (item.availableActions.includes("prepareCorrection")
      || item.availableActions.includes("prepareNegative")));

  const nonWorkspaceMessage = group.problems.every(item => item.correctionBehavior === "externalFollowUp")
    ? "הטיפול דורש השלמת מסמכים/מעקב חיצוני ואינו יוצר דיווח הפרשים. הפעולה המתאימה תישאר חסומה עד מסלול המסמכים הייעודי."
    : group.problems.every(item => item.correctionBehavior === "revalidateOnly")
      ? "הטיפול דורש תיקון או אימות מחדש של הנתונים ולא יצירת דיווח מתקן. אין לפתוח עבורו Correction Workspace."
      : group.problems.some(item => item.correctionBehavior === "dynamic")
        ? "מסלול הטיפול תלוי בהחלטה עסקית ולכן לא נפתח Correction Workspace אוטומטית."
        : "";

  async function prepare() {
    setPreparing(true);
    setError("");
    try {
      const result = await reportFeedbackApi.prepareInternalResolution(
        organizationId,
        employerId,
        problem.reportId,
        group.groupKey,
        group.resolverType,
        problem.reportProductId,
        group.problems.map(item => item.problemId),
      );
      const product = result.workspaceReportProductId
        ? `&focusReportProductId=${encodeURIComponent(result.workspaceReportProductId)}`
        : "";
      const resolver = `&resolutionResolver=${encodeURIComponent(group.resolverType)}`;
      const employee = result.workspaceReportEmployeeId
        ? `&focusReportEmployeeId=${encodeURIComponent(result.workspaceReportEmployeeId)}`
        : "";
      const sourceReport = `&resolutionSourceReportId=${encodeURIComponent(problem.reportId)}`;
      const problems = `&resolutionProblemIds=${encodeURIComponent(group.problems.map(item => item.problemId).join(","))}`;
      router.push(`/reports/new?resumeReportId=${result.workspaceReportId}&correctionWorkspace=1${product}${employee}${resolver}${sourceReport}${problems}`);
    } catch (err) {
      setError(errorMessage(err, "פתיחת סביבת התיקון נכשלה."));
    } finally {
      setPreparing(false);
    }
  }

  return <section className="feedback-employee-resolver" aria-label={config.title}>
    <div className="feedback-resolution-section-head">
      <div>
        <h3>{config.title}</h3>
        <p>{config.description}</p>
      </div>
    </div>

    {group.resolverType === "reportCorrection" ? <div className="notice notice-info" role="status">
      <strong>בדיקת רצף תיקון דיווח</strong>
      <p>לפני יצירת דיווח נוסף יש לוודא בהיסטוריית הדיווחים אילו פעולות תיקון וביטול כבר נקלטו. אל תיצרו תנועת ביטול כפולה.</p>
      <a className="btn btn-secondary" href="/reports">פתיחת היסטוריית הדיווחים <ArrowLeft size={16} aria-hidden="true" /></a>
    </div> : null}
    {!canPrepareWorkspace && nonWorkspaceMessage ? <div className="feedback-resolution-internal-note">
      <FilePenLine size={18} aria-hidden="true" />
      <span>{nonWorkspaceMessage}</span>
    </div> : null}

    {error ? <div className="notice notice-error">{error}</div> : null}

    {group.resolverType === "payment" && group.problems.some(item => item.targetScope === "deposit") ? <button
      type="button"
      className="btn btn-primary feedback-resolution-open-workspace"
      disabled={!group.canExecute || !onEditDeposit}
      onClick={() => onEditDeposit?.(group.problems.filter(item => item.targetScope === "deposit").map(item => item.problemId))}
    >
      עריכת פרטי ההפקדה
      <ArrowLeft size={16} aria-hidden="true" />
    </button> : null}

    {documentGroup ? <div className="notice notice-info" role="status">
      <strong>{documentType ? `מסמך מסוג ${documentType}` : "מסמכים נדרשים לטיפול"}</strong>
      <p>{documentType
        ? "סוג המסמך שנדרש מגיע מהגדרות הטיפול במסד הנתונים. יש לצרף אותו לדיווח ולעובד/מוצר הרלוונטיים באמצעות העורך הקיים."
        : "המשוב אינו מציין סוג מסמך חד־משמעי. יש לבדוק איזה אישור דורש הגוף המוסדי לפני הצירוף."}</p>
      <small>צירוף מסמך לספרייה בלבד אינו מעדכן דיווח שנשלח, והשגיאה תיסגר רק לאחר קבלת משוב מאשר.</small>
    </div> : null}

    {canPrepareWorkspace ? <button
      type="button"
      className="btn btn-primary feedback-resolution-open-workspace"
      disabled={preparing || !group.canExecute}
      onClick={() => void prepare()}
    >
      {preparing ? "פותח סביבת תיקון..." : config.button}
      {!preparing ? <ArrowLeft size={16} aria-hidden="true" /> : null}
    </button> : null}
  </section>;
}
