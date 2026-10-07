"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, FilePenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  reportFeedbackApi,
  type FeedbackResolutionGroup,
  type FeedbackResolutionProblem,
} from "@/lib/report-feedback-api";

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

function displayValue(value: string | null | undefined) {
  return value == null || value === "" ? "—" : value;
}

export function FeedbackInternalCorrectionResolver({
  organizationId,
  employerId,
  group,
}: {
  organizationId: string;
  employerId: string;
  group: FeedbackResolutionGroup;
}) {
  const router = useRouter();
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const problem = group.problems[0];
  const config = resolverConfig[group.resolverType];

  const rows = useMemo(() => {
    if (!problem || !config) return [];
    return config.fields
      .map(([key, label, source]) => {
        const reported = problem.reportedValues[key] ?? null;
        const current = problem.currentValues[key] ?? null;
        const feedback = problem.feedbackValues[key] ?? null;
        return { key, label, reported, current, feedback, source };
      })
      .filter(row => row.reported != null || row.current != null || row.feedback != null);
  }, [problem, config]);

  if (!problem || !config) return null;

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
      );
      const product = result.workspaceReportProductId
        ? `&focusReportProductId=${encodeURIComponent(result.workspaceReportProductId)}`
        : "";
      const resolver = `&resolutionResolver=${encodeURIComponent(group.resolverType)}`;
      router.push(`/reports/new?resumeReportId=${result.workspaceReportId}&correctionWorkspace=1${product}${resolver}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "פתיחת סביבת התיקון נכשלה.");
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

    {rows.length ? <div className="feedback-resolution-compare" role="table" aria-label="השוואת נתונים לתיקון">
      <div className="feedback-resolution-compare-head" role="row">
        <b role="columnheader">שדה</b>
        <b role="columnheader">בדיווח</b>
        <b role="columnheader">כיום / במשוב</b>
      </div>
      {rows.map(row => <div className="feedback-resolution-compare-row" role="row" key={row.key}>
        <span role="cell">{row.label}</span>
        <span role="cell" dir="auto">{displayValue(row.reported)}</span>
        <span role="cell" dir="auto">
          {displayValue(row.source === "feedback" ? row.feedback : row.current ?? row.feedback)}
        </span>
      </div>)}
    </div> : null}

    <div className="feedback-resolution-internal-note">
      <FilePenLine size={18} aria-hidden="true" />
      <span>הדיווח המקורי לא ישתנה. ALPHA יוצר או ממשיך סביבת תיקון ומרכז בה את כל השינויים לפני דיווח חוזר.</span>
    </div>

    {error ? <div className="notice notice-error">{error}</div> : null}

    <button
      type="button"
      className="btn btn-primary feedback-resolution-open-workspace"
      disabled={preparing || !group.canExecute}
      onClick={() => void prepare()}
    >
      {preparing ? "פותח סביבת תיקון..." : config.button}
      {!preparing ? <ArrowLeft size={16} aria-hidden="true" /> : null}
    </button>
  </section>;
}
