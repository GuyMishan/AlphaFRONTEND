"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, FilePenLine, ListChecks } from "lucide-react";
import { AppModal } from "@/components/app-modal";
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

function filterProblems(
  context: FeedbackResolutionContext,
  selector?: FeedbackResolutionProblemSelector | null,
) {
  if (!selector) return context.problems;
  if (selector.contributionId) {
    return context.problems.filter(problem =>
      problem.code === selector.code
      && problem.contributionId === selector.contributionId);
  }
  return context.problems.filter(problem => problem.code === selector.code);
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
}: {
  contextType: FeedbackResolutionContextType;
  organizationId: string;
  employerId: string;
  reportId?: string;
  reportProductId?: string;
  selector?: FeedbackResolutionProblemSelector | null;
  onBack: () => void;
  onClose: () => void;
}) {
  const [context, setContext] = useState<FeedbackResolutionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

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
  }, [contextType, organizationId, employerId, reportId, reportProductId, selector?.code, selector?.contributionId]);

  const problems = useMemo(
    () => context ? filterProblems(context, selector) : [],
    [context, selector],
  );
  const active = problems[Math.min(activeIndex, Math.max(problems.length - 1, 0))];

  return <AppModal
    width="xl"
    className="report-deposit-feedback-modal feedback-resolution-modal"
    title="מצב פתרון בעיות"
    subtitle={active
      ? `בעיה ${Math.min(activeIndex + 1, problems.length)} מתוך ${problems.length} · קוד ${active.code}`
      : "טעינת תהליך הטיפול"}
    onClose={onClose}
    actions={<>
      <button type="button" className="btn btn-secondary" onClick={onBack}>
        <ArrowRight size={16} aria-hidden="true" />חזרה לצפייה
      </button>
      {problems.length > 1 ? <button
        type="button"
        className="btn btn-primary"
        disabled={activeIndex >= problems.length - 1}
        onClick={() => setActiveIndex(index => Math.min(index + 1, problems.length - 1))}
      >
        לבעיה הבאה
      </button> : null}
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

    {!loading && !error && context && problems.length === 0
      ? <div className="notice notice-info">
          <CheckCircle2 size={16} aria-hidden="true" />לא נמצאו תקלות פעילות שמתאימות לטיפול שנבחר.
        </div>
      : null}

    {!loading && !error && active ? <>
      <section className="feedback-resolution-progress" aria-label="התקדמות בטיפול">
        <div>
          <span>בעיה נוכחית</span>
          <strong>{activeIndex + 1} / {problems.length}</strong>
        </div>
        <div className="feedback-resolution-progress-track" aria-hidden="true">
          <span style={{ width: `${((activeIndex + 1) / problems.length) * 100}%` }} />
        </div>
      </section>

      <section className="feedback-resolution-problem-card">
        <div className="feedback-resolution-problem-head">
          <span className={`feedback-resolution-type ${active.resolutionType}`}>
            {resolutionIcon(active.resolutionType)}
            {resolutionTypeLabel(active.resolutionType)}
          </span>
          <span className="feedback-resolution-scope">{scopeLabel(active.scope)}</span>
        </div>
        <div className="feedback-resolution-problem-copy">
          <div><b>קוד {active.code}</b><span>{active.description}</span></div>
          {active.employeeName ? <small>עובד: {active.employeeName}</small> : null}
          {active.fundCompanyName || active.productName
            ? <small>מוצר: {active.fundCompanyName || active.productName}{active.policyNumber ? ` · פוליסה ${active.policyNumber}` : ""}</small>
            : null}
        </div>
      </section>

      <section className="feedback-resolution-placeholder">
        <AlertTriangle size={20} aria-hidden="true" />
        <div>
          <strong>תשתית מצב הפתרון מחוברת.</strong>
          <p>
            Resolver מסוג <b dir="ltr">{active.resolverType}</b> נטען עבור התקלה הזאת.
            מסך העריכה/ההחלטה עצמו ייכנס בשלבים הבאים; בשלב זה לא מתבצע שינוי בנתונים.
          </p>
        </div>
      </section>
    </> : null}
  </AppModal>;
}
