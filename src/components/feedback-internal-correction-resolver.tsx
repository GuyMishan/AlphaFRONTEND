"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, FilePenLine, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { UiFileUpload } from "@/components/ui-file-upload";
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

function displayValue(value: string | null | undefined) {
  return value == null || value === "" ? "—" : value;
}

export function FeedbackInternalCorrectionResolver({
  organizationId,
  employerId,
  group,
  onEditDeposit,
  onChanged,
}: {
  organizationId: string;
  employerId: string;
  group: FeedbackResolutionGroup;
  onEditDeposit?: (problemIds: string[]) => void;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [preparing, setPreparing] = useState(false);
  const [uploadingProblemId, setUploadingProblemId] = useState("");
  const [error, setError] = useState("");
  const problem = group.problems[0];
  const config = resolverConfig[group.resolverType];

  const rows = useMemo(() => {
    if (!config) return [];
    return group.problems.flatMap(item =>
      config.fields
        .map(([key, label, source]) => {
          const reported = item.reportedValues[key] ?? null;
          const current = item.currentValues[key] ?? null;
          const feedback = item.feedbackValues[key] ?? null;
          return {
            key: `${item.problemId}:${key}`,
            label: group.problems.length > 1 ? `${label} · קוד ${item.code}` : label,
            reported,
            current,
            feedback,
            source,
          };
        })
        .filter(row => row.reported != null || row.current != null || row.feedback != null),
    );
  }, [group.problems, config]);

  if (!problem || !config) return null;

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
      setError(err instanceof Error ? err.message : "פתיחת סביבת התיקון נכשלה.");
    } finally {
      setPreparing(false);
    }
  }

  async function uploadDocument(problemId: string, file: File) {
    setUploadingProblemId(problemId);
    setError("");
    try {
      await reportFeedbackApi.uploadResolutionDocument(
        organizationId,
        employerId,
        problem.reportId,
        problemId,
        file,
      );
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "העלאת המסמך נכשלה.");
    } finally {
      setUploadingProblemId("");
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
      <span>{canPrepareWorkspace
        ? "הדיווח המקורי לא ישתנה. ALPHA יוצר או ממשיך סביבת תיקון ומרכז בה את כל השינויים לפני דיווח חוזר."
        : nonWorkspaceMessage}</span>
    </div>

    {error ? <div className="notice notice-error">{error}</div> : null}

    {group.resolverType === "payment" ? <button
      type="button"
      className="btn btn-primary feedback-resolution-open-workspace"
      disabled={!group.canExecute || !onEditDeposit}
      onClick={() => onEditDeposit?.(group.problems.map(item => item.problemId))}
    >
      עריכת פרטי ההפקדה
      <ArrowLeft size={16} aria-hidden="true" />
    </button> : null}

    {group.resolverType === "documents" ? <div className="feedback-resolution-document-list">
      {group.problems.map(item => <div className="feedback-resolution-document-item" key={item.problemId}>
        <div>
          <strong>קוד {item.code}</strong>
          <small>{item.description}</small>
        </div>
        <UiFileUpload
          label="העלאת מסמך PDF"
          accept=".pdf,application/pdf"
          maxBytes={10_000_000}
          busy={uploadingProblemId === item.problemId}
          disabled={!group.canExecute || Boolean(uploadingProblemId)}
          onFileSelected={(file) => void uploadDocument(item.problemId, file)}
          onInvalid={(message) => setError(message)}
        />
      </div>)}
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
