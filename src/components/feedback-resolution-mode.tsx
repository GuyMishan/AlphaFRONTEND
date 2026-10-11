"use client";
import { FeedbackErrorDetails } from "@/components/feedback-error-details";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { AppModal } from "@/components/app-modal";
import { UiAutocomplete } from "@/components/ui-controls";
import { FeedbackEmployeeResolver } from "@/components/feedback-employee-resolver";
import { FeedbackDecisionResolver } from "@/components/feedback-decision-resolver";
import { FeedbackExternalCaseResolver } from "@/components/feedback-external-case-resolver";
import { FeedbackInternalCorrectionResolver } from "@/components/feedback-internal-correction-resolver";
import { FeedbackCode18ProductEditor } from "@/components/feedback-code18-product-editor";
import { FeedbackCode18DepositEditor } from "@/components/feedback-code18-deposit-editor";
import { FeedbackCode18EmployerEditor } from "@/components/feedback-code18-employer-editor";
import {
  reportFeedbackApi,
  type FeedbackResolutionContext,
  type FeedbackResolutionContextType,
  type FeedbackResolutionProblemSelector,
} from "@/lib/report-feedback-api";

function loadContext(
  contextType: FeedbackResolutionContextType,
  organizationId: string,
  employerId: string,
  reportId?: string,
  reportProductId?: string,
) {
  if (contextType === "employer")
    return reportFeedbackApi.employerResolutionContext(organizationId, employerId);
  if (contextType === "report") {
    if (!reportId) throw new Error("לא נבחר דיווח.");
    return reportFeedbackApi.reportResolutionContext(organizationId, employerId, reportId);
  }
  if (!reportId || !reportProductId) throw new Error("לא נבחרה הפקדה.");
  return reportFeedbackApi.depositResolutionContext(
    organizationId, employerId, reportId, reportProductId,
  );
}

function filterGroups(
  context: FeedbackResolutionContext,
  selector?: FeedbackResolutionProblemSelector | null,
  contextType?: FeedbackResolutionContextType,
) {
  // Context endpoints already restrict the level (employer/report/deposit).
  // A single-error action must also restrict the actual problems passed to
  // all resolvers, rather than merely choosing a containing group.
  if (!selector) return context.groups;

  return context.groups.flatMap(group => {
    const problems = group.problems.filter(problem =>
      problem.code === selector.code
      && (contextType !== "deposit" || !selector.contributionId || problem.contributionId === selector.contributionId));
    return problems.length ? [{ ...group, problems }] : [];
  });
}

export function FeedbackResolutionMode({
  contextType,
  organizationId,
  employerId,
  reportId,
  reportProductId,
  selector,
  onBack,
  onClose,
  onEditDeposit,
}: {
  contextType: FeedbackResolutionContextType;
  organizationId: string;
  employerId: string;
  reportId?: string;
  reportProductId?: string;
  selector?: FeedbackResolutionProblemSelector | null;
  onBack: () => void;
  onClose: () => void;
  onEditDeposit?: (problemIds: string[]) => void;
}) {
  const footerTargetId = useId();
  const [context, setContext] = useState<FeedbackResolutionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [issueSearch, setIssueSearch] = useState("");
  const [initialIssueCodes, setInitialIssueCodes] = useState<Set<number> | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setContext(null);
    setActiveIndex(0);
    Promise.resolve()
      .then(() => loadContext(contextType, organizationId, employerId, reportId, reportProductId))
      .then(result => {
        if (!cancelled) {
          setInitialIssueCodes(previous => previous ?? new Set(filterGroups(result, selector, contextType)
            .flatMap(group => group.problems.map(problem => problem.code))));
          setContext(result);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינת תהליך הפתרון נכשלה.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [contextType, organizationId, employerId, reportId, reportProductId, refreshToken]);

  const groups = useMemo(() => {
    if (!context) return [];
    // Unsupported codes outside the selected error must not block its resolver.
    if (context.unsupportedCodes.length && !selector) return [];
    return filterGroups(context, selector, contextType);
  }, [context, selector, contextType]);
  const issueOptions = useMemo(() => groups.map(group => {
    const first = group.problems[0];
    return { value: group.groupKey, label: `קוד ${first.code} — ${first.description}` };
  }), [groups]);
  const activeCodes = new Set(groups.flatMap(group => group.problems.map(problem => problem.code)));
  const totalIssues = initialIssueCodes?.size ?? activeCodes.size;
  const resolvedIssues = [...(initialIssueCodes ?? activeCodes)]
    .filter(code => !activeCodes.has(code)).length;
  const safeIndex = Math.min(activeIndex, Math.max(groups.length - 1, 0));
  const activeGroup = groups[safeIndex];
  useEffect(() => {
    setIssueSearch(issueOptions[safeIndex]?.label ?? "");
  }, [safeIndex, issueOptions]);
  const primaryProblem = activeGroup?.problems[0];
  const editableProblems = activeGroup?.problems.filter(problem => problem.resolutionType === "edit") ?? [];

  const editableGroup = activeGroup && editableProblems.length
    ? { ...activeGroup, problems: editableProblems }
    : null;

  useEffect(() => {
    if (activeIndex !== safeIndex) setActiveIndex(safeIndex);
  }, [activeIndex, safeIndex]);

  return <AppModal
    width="xl"
    className="report-deposit-feedback-modal feedback-resolution-modal"
    title="פתרון בעיות"
    subtitle={contextType === "employer" ? "תקלות במעסיק" : contextType === "report" ? "תקלות בדיווח" : "תקלות בהפקדה"}
    onClose={onClose}
    actions={<>
      <div id={footerTargetId} data-modal-side="positive" />
      <button type="button" className="btn btn-secondary" onClick={onBack}>
        <ArrowRight size={16} aria-hidden="true" />חזרה לצפייה
      </button>
      {groups.length > 1 ? <>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={safeIndex === 0}
          onClick={() => setActiveIndex(index => Math.max(index - 1, 0))}
        >
          <ArrowRight size={16} aria-hidden="true" />התקלה הקודמת
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={safeIndex >= groups.length - 1}
          onClick={() => setActiveIndex(index => Math.min(index + 1, groups.length - 1))}
        >
          התקלה הבאה<ArrowLeft size={16} aria-hidden="true" />
        </button>
      </> : null}
    </>}
  >
    {loading ? <div className="empty">טוען את נתוני הפתרון...</div> : null}
    {error ? <div className="notice notice-error">{error}</div> : null}

    {!loading && !error && context?.unsupportedCodes.length && !selector ? <div className="notice notice-error">
      <strong>לא ניתן להתחיל טיפול אוטומטי.</strong>
      <span> נמצאו קודי משוב שעדיין אינם נתמכים ב־ALPHA: {context.unsupportedCodes.join(", ")}.</span>
    </div> : null}

    {!loading && !error && context && context.problems.length > 0 && !context.canResolve && context.unsupportedCodes.length === 0
      ? <div className="notice notice-error">אין לך הרשאה לבצע פעולות פתרון בהקשר הזה.</div>
      : null}

    {!loading && !error && context && context.problems.length === 0
      ? <div className="notice notice-info"><CheckCircle2 size={16} aria-hidden="true" />לא נמצאו תקלות פעילות לטיפול בהקשר הזה.</div>
      : null}

    {!loading && !error && context?.canResolve && groups.length === 0
      ? <div className="notice notice-info">
          <CheckCircle2 size={16} aria-hidden="true" />לא נמצאו תקלות פעילות שמתאימות לטיפול שנבחר.
        </div>
      : null}

    {!loading && !error && groups.length > 1 ? <section className="feedback-resolution-issue-picker" aria-label="בחירת בעיה לטיפול">
      <strong>בחרו בעיה לטיפול</strong>
      <UiAutocomplete
        value={issueSearch}
        onValueChange={value => {
          setIssueSearch(value);
          const selected = issueOptions.findIndex(option => option.label === value);
          if (selected >= 0) setActiveIndex(selected);
        }}
        options={issueOptions}
        placeholder="חפשו לפי קוד או תיאור התקלה"
        ariaLabel="בחירת בעיה לטיפול"
      />
    </section> : null}

    {!loading && !error && context && totalIssues > 1 ? <>
      <section className="feedback-resolution-progress" aria-label="התקדמות בטיפול בתקלות">
        <div>
          <span>בעיות שטופלו</span>
          <strong dir="ltr">{resolvedIssues}/{totalIssues}</strong>
        </div>
        <div className="feedback-resolution-progress-track" aria-hidden="true">
          <span style={{ width: `${totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0}%` }} />
        </div>
      </section>

    </> : null}

    {!loading && !error && activeGroup && primaryProblem ? <>
      <section className="feedback-resolution-problem-card" aria-label="הבעיה שנבחרה">
        <div className="feedback-resolution-problem-head">
          <strong>קוד {primaryProblem.code} — {primaryProblem.description}</strong>
          {primaryProblem.code === 18
            ? <section className="feedback-missing-fields" aria-label="השדות החסרים במשוב">
                <strong>שדות חסרים שדורשים בדיקה</strong>
                <p>לפי קוד 18, פירוט הסכום במשוב מכיל את מספר השדה החסר. המיפוי מוצג לפי סוג הדיווח המקורי.</p>
                <div className="feedback-missing-fields-list">
                  {[...new Map(activeGroup.problems.map(problem => {
                    const number = problem.feedbackValues.missingFieldNumber;
                    const tag = problem.feedbackValues.missingFieldXmlTag;
                    const key = [number ?? "unknown", problem.targetScope, problem.targetScope === "employer" || problem.targetScope === "report" ? "" : problem.employmentId ?? problem.reportEmployeeId ?? "", problem.targetScope === "deposit" ? problem.reportProductId ?? "" : ""].join(":");
                    return [key, problem] as const;
                  })).values()].map(problem => <div key={problem.problemId} className="feedback-missing-field-row">
                    <div>
                      <b>{problem.feedbackValues.missingFieldMapped === "true" && problem.feedbackValues.missingFieldName
                        ? problem.feedbackValues.missingFieldName : "שדה שלא זוהה"}</b>
                      <small>מספר שדה: <span dir="ltr">{problem.feedbackValues.missingFieldNumber ?? "לא תקין או חסר"}</span></small>
                      {problem.feedbackValues.missingFieldXmlTag ? <small>XML: <code dir="ltr">{problem.feedbackValues.missingFieldXmlTag}</code></small> : null}
                    </div>
                    {problem.targetScope === "employee" || problem.targetScope === "deposit"
                      ? <div>
                          {problem.employeeName ? <small>עובד: {problem.employeeName}</small> : null}
                          {problem.targetScope === "deposit" && (problem.fundCompanyName || problem.productName)
                            ? <small>מוצר: {problem.fundCompanyName || problem.productName}</small> : null}
                        </div> : null}
                    {problem.feedbackValues.missingFieldMapped !== "true"
                      ? <small>לא ניתן לשייך אוטומטית לשדה. נדרשת בדיקה ידנית.</small> : null}
                  </div>)}
                </div>
              </section>
            : <FeedbackErrorDetails allDetails={activeGroup.problems.map(problem => ({ errorAmount: problem.feedbackValues.errorAmount, errorDate: problem.feedbackValues.errorDate }))} />}
        </div>
        {primaryProblem.targetScope === "deposit" || primaryProblem.targetScope === "employee"
          ? <div className="feedback-resolution-problem-copy">
              {primaryProblem.employeeName ? <small>עובד: {primaryProblem.employeeName}</small> : null}
              {primaryProblem.fundCompanyName || primaryProblem.productName
                ? <small>מוצר: {primaryProblem.fundCompanyName || primaryProblem.productName}</small>
                : null}
            </div> : null}
        {activeGroup.problems.some(problem => problem.feedbackValues.resolutionWorkflowStatus === "feedback-returned-needs-review")
          ? <small role="alert">התקבל משוב חוזר — התיקון טרם אושר ונדרשת בדיקה נוספת.</small>
          : activeGroup.problems.some(problem => problem.feedbackValues.resolutionWorkflowStatus === "transmitted-awaiting-feedback")
            ? <small role="status">הטיפול שודר וממתין למשוב חוזר.</small>
            : activeGroup.problems.some(problem => problem.feedbackValues.resolutionWorkflowStatus === "correction-in-progress")
              ? <small role="status">תיקון נשמר אך טרם אושר במשוב.</small>
              : null}
      </section>

      {activeGroup.problems.some(problem => problem.code === 56 && problem.targetScope === "employer")
        ? <section className="notice notice-info">
            <strong>מקור התקלה: חשבון התשלום הכללי של המעסיק</strong>
            <p>יש לתקן את חשבון התשלום הפנסיוני בהגדרות המעסיק. עדכון החשבון לא סוגר משוב על דיווח שכבר נשלח.</p>
            <Link
              className="btn btn-secondary"
              href={`/employers/${employerId}?organizationId=${encodeURIComponent(organizationId)}&tab=pension-payment`}
            >פתיחת אמצעי התשלום הפנסיוני</Link>
          </section> : null}

      {activeGroup.problems.some(problem => problem.code === 18) ? <section className="notice notice-info" aria-label="טיפול בשדה חסר">
        <strong>תיקון השדה החסר</strong>
        <p>יש לתקן את השדות המופיעים למעלה ולשמור את השינויים. דיווח מתקן ייווצר רק אחרי השלמת הטיפול בכל שגיאות הדיווח, ולא אחרי כל שדה.</p>

        {activeGroup.problems.some(problem => problem.code === 18 && problem.targetScope === "report")
          ? <small>השדה שייך לדיווח. יש לתקן אותו בסביבת התיקון של הדיווח כולו.</small> : null}
        {activeGroup.problems.some(problem => problem.code === 18 && problem.targetScope === "employer")
          ? <small>השדה שייך לפרטי המעסיק או לאיש הקשר שלו. יש לתקן את נתוני המעסיק ולא את שורת ההפקדה.</small> : null}
      </section> : null}

      {primaryProblem.code === 18 && primaryProblem.targetScope === "employer"
        ? <FeedbackCode18EmployerEditor
            key={primaryProblem.problemId}
            organizationId={organizationId}
            employerId={employerId}
            problem={primaryProblem}
            canEdit={activeGroup.canExecute}
            onSaved={() => setRefreshToken(value => value + 1)}
          /> : null}
      {primaryProblem.code === 18
        && primaryProblem.targetScope === "deposit"
        && ["depositEmployeeStatus", "depositProduct", "reportTransfer"].includes(primaryProblem.feedbackValues.missingFieldEditSurface ?? "")
        && ["60", "71", "74", "75", "76", "77", "35", "37", "38", "40", "41", "42", "44", "45", "46", "49", "50", "51", "52", "53"].includes(primaryProblem.feedbackValues.missingFieldNumber ?? "")
        ? <FeedbackCode18DepositEditor
            key={activeGroup.groupKey}
            organizationId={organizationId}
            employerId={employerId}
            group={activeGroup}
            footerTargetId={footerTargetId}
          /> : null}

      {primaryProblem.code === 18 && ["57", "58"].includes(primaryProblem.feedbackValues.missingFieldNumber ?? "") ?
        <div className="notice notice-info">
          שדות 57–58 מתארים את קובץ המסמך הרשמי וסוגו. המסמך מנוהל במאגר מסמכי המעסיק.
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <a className="btn btn-secondary" href={`/employers/${employerId}?organizationId=${organizationId}&tab=documents`}>מסמכי המעסיק</a>
            {primaryProblem.employmentId ? <a className="btn btn-secondary"
              href={`/employees/${primaryProblem.employmentId}?organizationId=${organizationId}&employerId=${employerId}&tab=mix`}>
              מסמכי המוצר בתמהיל העובד
            </a> : null}
          </div>
          <small>לתיקון דיווח שכבר נשלח יש לצרף את הגרסה הנכונה בסביבת התיקון; שינוי המאגר אינו משנה דיווח היסטורי.</small>
        </div> : null}

      {primaryProblem.code === 18
        && ["59", "70", "72", "73", "78", "79", "80", "81", "82"].includes(primaryProblem.feedbackValues.missingFieldNumber ?? "")
        && primaryProblem.feedbackValues.missingFieldMapped === "true"
        ? <FeedbackCode18ProductEditor organizationId={organizationId} employerId={employerId} group={activeGroup} /> : null}
      {primaryProblem.code === 18
        && !["25","26","27","28","29","35","37","38","40","41","42","44","45","46","49","50","51","52","53","57","58","59","60","63","64","65","66","67","68","70","71","72","73","74","75","76","77","78","79","80","81","82"].includes(
          primaryProblem.feedbackValues.missingFieldNumber ?? "")
        ? <div className="notice notice-info" role="status">
            השדה זוהה במפרט, אך עדיין לא קיים עבורו עורך ייעודי ומאומת במסך פתרון בעיות.
            אין לבצע עריכה של שדה אחר כתחליף. יש לטפל בו דרך תהליך תיקון הדיווח המתאים.
          </div> : null}

      {activeGroup.problems.some(problem => problem.resolutionType === "decision" && problem.code !== 18) ? <FeedbackDecisionResolver
          organizationId={organizationId}
          employerId={employerId}
          group={activeGroup}
          onChanged={() => setRefreshToken(value => value + 1)}
          onEditDeposit={onEditDeposit}
        /> : null}

      {activeGroup.problems.some(problem =>
        !(problem.code === 56 && problem.targetScope === "employer") && (
        problem.resolutionType === "external"
        || Boolean(problem.externalCaseId)
        || (problem.resolutionType === "edit"
          && (problem.availableActions.includes("openExternalCase")
            || problem.availableActions.includes("reconcile")))))
        ? <FeedbackExternalCaseResolver
            organizationId={organizationId}
            employerId={employerId}
            group={activeGroup}
            onChanged={() => setRefreshToken(value => value + 1)}
          />
        : null}

      {activeGroup.resolverType === "employee"
        ? <FeedbackEmployeeResolver
            organizationId={organizationId}
            employerId={employerId}
            group={activeGroup}
            canEdit={Boolean(context?.canEditEmployee)}
            onChanged={() => setRefreshToken(value => value + 1)}
          />
        : editableGroup
          && ["contribution", "productPolicy", "employmentStatus", "payment", "documents", "reportCorrection", "refund"].includes(activeGroup.resolverType)
          ? <FeedbackInternalCorrectionResolver
              organizationId={organizationId}
              employerId={employerId}
              group={editableGroup}
              onEditDeposit={onEditDeposit}
              onChanged={() => setRefreshToken(value => value + 1)}
            />
          : activeGroup.problems.some(problem =>
              problem.code === 18
              || problem.resolutionType === "decision"
              || problem.resolutionType === "external")
            ? null
            : <section className="feedback-resolution-placeholder">
            <AlertTriangle size={20} aria-hidden="true" />
            <div>
              <strong>קבוצת הטיפול מוכנה ל־resolver.</strong>
              <p>
                {activeGroup.problems.length === 1
                  ? "מוצגת התקלה שנבחרה."
                  : "התקלה מופיעה בכמה שורות משוב ונדרשת לטיפול אחד."}
                {" "}Resolver מסוג <b dir="ltr">{activeGroup.resolverType}</b> ייכנס בשלבים הבאים.
              </p>
            </div>
          </section>}
    </> : null}
  </AppModal>;
}
