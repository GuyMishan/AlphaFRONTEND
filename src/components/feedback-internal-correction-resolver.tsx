"use client";

import { useState } from "react";
import { ArrowLeft, FilePenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  reportFeedbackApi,
  type FeedbackResolutionGroup,
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
  const [error, setError] = useState("");
  const problem = group.problems[0];
  const config = resolverConfig[group.resolverType];

  if (!problem || !config) return null;

  const reportPairIssues = group.resolverType === "reportCorrection" && group.problems.every(item => item.code === 100 || item.code === 101);
  const documentGroup = group.resolverType === "documents";
  const reportDeclarations = documentGroup && group.problems.every(item => [102, 103, 111, 112].includes(item.code));
  const employeeDeclarations = documentGroup && group.problems.every(item => [109, 110].includes(item.code));
  const otherDocumentIssues = documentGroup && !reportDeclarations && !employeeDeclarations;


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

  return <section className="feedback-employee-resolver" aria-label={config.title}>
    <div className="feedback-resolution-section-head">
      <div>
        <h3>{config.title}</h3>
        <p>{config.description}</p>
      </div>
    </div>

    {reportPairIssues ? <div className="notice notice-info" role="status">
      <strong>{group.problems.every(item => item.code === 100) ? "חסר דיווח שלילי לתיקון" : group.problems.every(item => item.code === 101) ? "חסר דיווח שוטף מתקן" : "רצף תיקון דיווחים לא הושלם"}</strong>
      <p>{group.problems.every(item => item.code === 100) ? "נשלח דיווח מתקן (פעולה 2 או 3), אך חסרה פעולת ביטול תואמת (6) בדיווח השלילי." : group.problems.every(item => item.code === 101) ? "דווחה פעולת ביטול (6) בממשק השלילי, אך חסרה פעולת תיקון תואמת (2 או 3) בדיווח השוטף." : "יש להתאים בין פעולות הביטול והתיקון בשני הדיווחים."}</p>
      <p><strong>כך מטפלים:</strong> בודקים בהיסטוריית הדיווחים ששתי הפעולות התואמות (ביטול 6 ותיקון 2 או 3) קיימות ונקלטו עבור אותן רשומות.</p>
      <ul>
        <li><strong>חסרה אחת הפעולות:</strong> משלימים את רצף התיקון ברמת הדיווח, בלי לערוך הפקדה רגילה.</li>
        <li><strong>פעולה נשלחה אך נדחתה:</strong> בודקים את המשוב ומטפלים בדחייה לפני שליחה נוספת.</li>
        <li><strong>שתיהן נקלטו:</strong> בודקים התאמה בין מזהי הרשומות והפעולות. אם הכול תואם, פונים לגוף המוסדי לבירור.</li>
      </ul>
      <small>אין ליצור ביטול כפול בלי לוודא מה כבר נקלט. לאחר הטיפול יש להמתין למשוב מעודכן.</small>
      <a className="btn btn-primary" href="/reports">פתיחת היסטוריית הדיווחים <ArrowLeft size={16} aria-hidden="true" /></a>
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

    {reportDeclarations ? <div className="notice notice-info" role="status">
      <strong>תצהיר מעסיק חסר או לא תקין</strong>
      <p>קודים {Array.from(new Set(group.problems.map(item => item.code))).join(", ")} — {group.problems.some(item => [102, 103].includes(item.code)) ? "תצהיר מעסיק בקשר להסכם קיבוצי" : "תצהיר מעסיק"}.</p>
      <p>{group.problems.some(item => [102, 103].includes(item.code))
        ? "לקוד הזה נדרש מסמך מסוג 6 (הצהרת מעסיק להסכם קיבוצי), המשויך למוצר הפנסיוני בדיווח. תצהיר מעסיק כללי מסוג 3 אינו מחליף אותו. בדקו את ההצהרה של העובד והמוצר הרלוונטיים, וצרפו אותה מחדש לגרסת הדיווח הנכונה."
        : "נדרש תצהיר מעסיק כללי מסוג 3. בדקו אם הועלה מסמך תקין בפרופיל המעסיק וצרפו אותו לגרסת הדיווח הרלוונטית. אין צורך בהעלאה נפרדת לכל הפקדה."}</p>
      {group.problems.some(item => [102, 103].includes(item.code)
          && item.feedbackValues.negativeCorrectionSourceReportId
          && item.feedbackValues.negativeCorrectionSourceProductId)
        ? <a className="btn btn-primary"
            href={`/reports/new?sourceReportId=${encodeURIComponent(group.problems.find(item => item.feedbackValues.negativeCorrectionSourceReportId)?.feedbackValues.negativeCorrectionSourceReportId ?? "")}&sourceProductId=${encodeURIComponent(group.problems.find(item => item.feedbackValues.negativeCorrectionSourceProductId)?.feedbackValues.negativeCorrectionSourceProductId ?? "")}&sourceKind=1&sourceMonth=${encodeURIComponent(group.problems.find(item => item.feedbackValues.negativeCorrectionSourceMonth)?.feedbackValues.negativeCorrectionSourceMonth ?? "")}`}>
            פתיחת דיווח שלילי לתיקון המסמך <ArrowLeft size={16} aria-hidden="true" />
          </a> : null}
      {group.problems.some(item => [102, 103].includes(item.code)) ? <small>
        הקישור פותח דיווח שלילי חדש על בסיס הדיווח השוטף המקורי והמוצר הרלוונטי. יש לבדוק את נתוני התנועה והאסמכתאות לפני שליחה כדי להימנע מביטול או החזר כפול.
      </small> : null}
      {group.problems.some(item => [102, 103].includes(item.code))
        ? Array.from(new Set(group.problems.map(item => item.employmentId).filter((id): id is string => Boolean(id))))
            .map(id => <a key={id} className="btn btn-secondary"
              href={`/employees/${id}?organizationId=${encodeURIComponent(organizationId)}&employerId=${encodeURIComponent(employerId)}&tab=mix`}>
              פתיחת מסמכי המוצר של העובד <ArrowLeft size={16} aria-hidden="true" />
            </a>)
        : <a className="btn btn-secondary" href={`/employers/${employerId}?organizationId=${encodeURIComponent(organizationId)}&tab=documents`}>פתיחת מסמכי המעסיק <ArrowLeft size={16} aria-hidden="true" /></a>}
      <small>עדכון המסמך בפרופיל אינו משנה קבצים שכבר נשלחו. יש לבדוק את משוב הקופה לפני דיווח חוזר.</small>
    </div> : null}

    {employeeDeclarations ? <div className="notice notice-info" role="status">
      <strong>תצהיר עובד חסר או לא תקין</strong>
      <p>יש לבדוק את תצהיר העובד המשויך למוצר הפנסיוני, לתקן אותו בפרטי המוצר ולצרף את הגרסה התקינה לדיווח המתאים. אין צורך לצרף את אותו מסמך לכל רכיב הפרשה.</p>
      {Array.from(new Set(group.problems.map(item => item.employmentId).filter((id): id is string => Boolean(id))))
        .map(id => <a key={id} className="btn btn-secondary"
          href={`/employees/${id}?organizationId=${encodeURIComponent(organizationId)}&employerId=${encodeURIComponent(employerId)}&tab=mix`}>
          פתיחת מסמכי המוצר של העובד <ArrowLeft size={16} aria-hidden="true" />
        </a>)}
    </div> : null}

    {otherDocumentIssues ? <div className="notice notice-info" role="status">
      <strong>{group.problems.some(item => [69, 70].includes(item.code)) ? "תצהיר חסר או לא תקין לצורך החזר כספים" : "חסרים מסמכים לקליטת הפקדה או שינוי פוליסה"}</strong>
      <p>{group.problems.some(item => [69, 70].includes(item.code))
        ? "בדקו את התצהיר שנדרש לבקשת החזר הכספים ואת סיבת הדחייה. יש לתקן את התצהיר ולצרף אותו לבקשת ההחזר המתאימה, ולא לשלוח מסמך עבור כל רכיב הפקדה."
        : "בדקו במשוב אילו מסמכים נדרשים לקליטת ההפקדה או לשינוי בפוליסה. השלימו אותם עבור המוצר והעובד הרלוונטיים."}</p>
      <small>העלאת PDF לתיק משוב בלבד אינה מהווה שליחת המסמך ליצרן ואינה מסיימת את הטיפול.</small>
      {Array.from(new Set(group.problems.map(item => item.employmentId).filter((id): id is string => Boolean(id))))
        .map(id => <a key={id} className="btn btn-secondary"
          href={`/employees/${id}?organizationId=${encodeURIComponent(organizationId)}&employerId=${encodeURIComponent(employerId)}&tab=mix`}>
          פתיחת מוצרי העובד <ArrowLeft size={16} aria-hidden="true" />
        </a>)}
    </div> : null}

    {canPrepareWorkspace && !reportPairIssues ? <button
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
