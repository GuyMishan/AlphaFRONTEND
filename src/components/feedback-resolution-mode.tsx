"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, FilePenLine, ListChecks } from "lucide-react";
import { AppModal } from "@/components/app-modal";
import { FeedbackEmployeeResolver } from "@/components/feedback-employee-resolver";
import { FeedbackInternalCorrectionResolver } from "@/components/feedback-internal-correction-resolver";
import {
  reportFeedbackApi,
  type FeedbackResolutionContext,
  type FeedbackResolutionContextType,
  type FeedbackResolutionProblem,
  type FeedbackResolutionProblemSelector,
} from "@/lib/report-feedback-api";

function resolutionTypeLabel(value: FeedbackResolutionProblem["resolutionType"]) {
  switch (value) {
    case "edit": return "תיקון נתונים";
    case "decision": return "בדיקה והחלטה";
    case "external": return "טיפול חיצוני";
    default: return "מידע";
  }
}

function resolutionIcon(value: FeedbackResolutionProblem["resolutionType"]) {
  if (value === "external") return <ExternalLink size={16} aria-hidden="true" />;
  if (value === "decision") return <ListChecks size={16} aria-hidden="true" />;
  return <FilePenLine size={16} aria-hidden="true" />;
}

function scopeLabel(value: string) {
  switch (value) {
    case "employer":
    case "money": return "מעסיק";
    case "report": return "דיווח";
    case "employee": return "עובד";
    case "deposit": return "הפקדה";
    case "contribution": return "רכיב הפרשה";
    default: return value;
  }
}

function resolverLabel(value: string) {
  switch (value) {
    case "employee": return "פרטי עובד";
    case "employmentStatus": return "סטטוס העסקה";
    case "productPolicy": return "מוצר ופוליסה";
    case "contribution": return "הפרשות";
    case "reportCorrection": return "תיקון דיווח";
    case "payment": return "פרטי תשלום";
    case "refund": return "החזר כספים";
    case "documents": return "מסמכים";
    case "split": return "פיצול ושיוך";
    case "conditionalField": return "שדות דיווח";
    case "externalCase": return "טיפול מול גוף חיצוני";
    default: return value;
  }
}

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
) {
  if (!selector) return context.groups;

  return context.groups.filter(group => group.problems.some(problem =>
    problem.code === selector.code
    && (!selector.contributionId || problem.contributionId === selector.contributionId)));
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
  const [context, setContext] = useState<FeedbackResolutionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
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
        if (!cancelled) setContext(result);
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
    if (!context || context.unsupportedCodes.length) return [];
    return filterGroups(context, selector);
  }, [context, selector]);
  const safeIndex = Math.min(activeIndex, Math.max(groups.length - 1, 0));
  const activeGroup = groups[safeIndex];
  const primaryProblem = activeGroup?.problems[0];

  useEffect(() => {
    if (activeIndex !== safeIndex) setActiveIndex(safeIndex);
  }, [activeIndex, safeIndex]);

  return <AppModal
    width="xl"
    className="report-deposit-feedback-modal feedback-resolution-modal"
    title="מצב פתרון בעיות"
    subtitle={activeGroup
      ? `קבוצת טיפול ${safeIndex + 1} מתוך ${groups.length} · ${activeGroup.problems.length} ${activeGroup.problems.length === 1 ? "תקלה" : "תקלות"}`
      : "טעינת תהליך הטיפול"}
    onClose={onClose}
    actions={<>
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
          <ArrowRight size={16} aria-hidden="true" />הקבוצה הקודמת
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={safeIndex >= groups.length - 1}
          onClick={() => setActiveIndex(index => Math.min(index + 1, groups.length - 1))}
        >
          הקבוצה הבאה<ArrowLeft size={16} aria-hidden="true" />
        </button>
      </> : null}
    </>}
  >
    {loading ? <div className="empty">טוען את נתוני הפתרון...</div> : null}
    {error ? <div className="notice notice-error">{error}</div> : null}

    {!loading && !error && context?.unsupportedCodes.length ? <div className="notice notice-error">
      <strong>לא ניתן להתחיל טיפול אוטומטי.</strong>
      <span> נמצאו קודי משוב שעדיין אינם נתמכים ב־ALPHA: {context.unsupportedCodes.join(", ")}.</span>
    </div> : null}

    {!loading && !error && context && !context.canResolve && context.unsupportedCodes.length === 0
      ? <div className="notice notice-error">אין לך הרשאה לבצע פעולות פתרון בהקשר הזה.</div>
      : null}

    {!loading && !error && context?.canResolve && groups.length === 0
      ? <div className="notice notice-info">
          <CheckCircle2 size={16} aria-hidden="true" />לא נמצאו תקלות פעילות שמתאימות לטיפול שנבחר.
        </div>
      : null}

    {!loading && !error && activeGroup && primaryProblem ? <>
      <section className="feedback-resolution-progress" aria-label="התקדמות בתור הטיפול">
        <div>
          <span>קבוצת טיפול נוכחית</span>
          <strong>{safeIndex + 1} / {groups.length}</strong>
        </div>
        <div className="feedback-resolution-progress-track" aria-hidden="true">
          <span style={{ width: `${((safeIndex + 1) / groups.length) * 100}%` }} />
        </div>
      </section>

      <section className="feedback-resolution-problem-card">
        <div className="feedback-resolution-problem-head">
          <span className="feedback-resolution-resolver">
            <ListChecks size={16} aria-hidden="true" />
            {resolverLabel(activeGroup.resolverType)}
          </span>
          <span className="feedback-resolution-scope">
            {new Set(activeGroup.problems.map(problem => problem.scope)).size === 1
              ? scopeLabel(primaryProblem.scope)
              : "מספר תחומים"}
          </span>
        </div>

        <div className="feedback-resolution-problem-copy">
          {primaryProblem.employeeName ? <small>עובד: {primaryProblem.employeeName}</small> : null}
          {primaryProblem.fundCompanyName || primaryProblem.productName
            ? <small>מוצר: {primaryProblem.fundCompanyName || primaryProblem.productName}{primaryProblem.policyNumber ? ` · פוליסה ${primaryProblem.policyNumber}` : ""}</small>
            : null}
        </div>

        <div className="feedback-resolution-group-problems" role="list" aria-label="תקלות בקבוצת הטיפול">
          {activeGroup.problems.map(problem => <div key={problem.problemId} className="feedback-resolution-group-problem" role="listitem">
            <span className={`feedback-resolution-type ${problem.resolutionType}`}>
              {resolutionIcon(problem.resolutionType)}
              {resolutionTypeLabel(problem.resolutionType)}
            </span>
            <div>
              <b>קוד {problem.code}</b>
              <span>{problem.description}</span>
            </div>
          </div>)}
        </div>
      </section>

      {activeGroup.resolverType === "employee"
        ? <FeedbackEmployeeResolver
            organizationId={organizationId}
            employerId={employerId}
            group={activeGroup}
            canEdit={activeGroup.canExecute}
            onChanged={() => setRefreshToken(value => value + 1)}
          />
        : ["contribution", "productPolicy", "employmentStatus", "payment", "documents", "reportCorrection"].includes(activeGroup.resolverType)
          && activeGroup.problems.every(problem => problem.resolutionType === "edit")
          ? <FeedbackInternalCorrectionResolver
              organizationId={organizationId}
              employerId={employerId}
              group={activeGroup}
              onEditDeposit={onEditDeposit}
              onChanged={() => setRefreshToken(value => value + 1)}
            />
          : <section className="feedback-resolution-placeholder">
            <AlertTriangle size={20} aria-hidden="true" />
            <div>
              <strong>קבוצת הטיפול מוכנה ל־resolver.</strong>
              <p>
                {activeGroup.problems.length === 1
                  ? "התקלה תטופל כיחידה אחת."
                  : `${activeGroup.problems.length} התקלות בקבוצה דורשות אותו יעד טיפול ולכן ירוכזו יחד.`}
                {" "}Resolver מסוג <b dir="ltr">{activeGroup.resolverType}</b> ייכנס בשלבים הבאים.
              </p>
            </div>
          </section>}
    </> : null}
  </AppModal>;
}
