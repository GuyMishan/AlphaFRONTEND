"use client";

import { useEffect, useState } from "react";
import { Building2, FileText } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { FeedbackIssueGroups } from "@/features/feedback/components/feedback-issue-groups";
import { FeedbackResolutionMode } from "@/features/feedback/components/feedback-resolution-mode";
import { ReportDepositFeedbackModal } from "@/features/feedback/components/report-deposit-feedback-modal";
import {
  reportFeedbackApi,
  type EmployerFeedbackContext,
  type FeedbackResolutionProblemSelector,
  type ReportFeedbackContext,
} from "@/features/feedback/api";
import { formatDateTimeDDMMYYYY } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/number";
import { formatReportingMonth } from "@/lib/format/date";
import { reportKindLabel } from "@/features/reporting/labels";
import { LoadingState } from "@/components/loading/loading-state";

export type ReportFeedbackModalMode = "employer" | "report" | "deposit";

export function ReportFeedbackModal({
  mode,
  organizationId,
  employerId,
  reportId,
  reportProductId,
  hasFeedback = false,
  onClose,
  onEditDeposit,
  depositView = "details",
  resolveOnOpen = false,
}: {
  mode: ReportFeedbackModalMode;
  organizationId: string;
  employerId: string;
  reportId?: string;
  reportProductId?: string;
  hasFeedback?: boolean;
  onClose: () => void;
  onEditDeposit?: (problemIds?: string[]) => void;
  depositView?: "details" | "errors";
  resolveOnOpen?: boolean;
}) {
  const [employerContext, setEmployerContext] = useState<EmployerFeedbackContext | null>(null);
  const [reportContext, setReportContext] = useState<ReportFeedbackContext | null>(null);
  const [linkedReportId, setLinkedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode !== "deposit");
  const [error, setError] = useState("");
  const [resolutionSelector, setResolutionSelector] = useState<FeedbackResolutionProblemSelector | null | undefined>(
    resolveOnOpen ? null : undefined,
  );

  useEffect(() => {
    if (mode === "deposit") return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        if (mode === "employer") {
          const result = await reportFeedbackApi.employerContext(organizationId, employerId);
          if (!cancelled) setEmployerContext(result);
        } else {
          if (!reportId) throw new Error("לא נבחר דיווח.");
          const result = await reportFeedbackApi.reportContext(organizationId, employerId, reportId);
          if (!cancelled) setReportContext(result);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "טעינת המשוב נכשלה.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [mode, organizationId, employerId, reportId]);

  if (linkedReportId) {
    return <ReportFeedbackModal mode="report" organizationId={organizationId}
      employerId={employerId} reportId={linkedReportId}
      onClose={() => setLinkedReportId(null)} />;
  }

  if (resolutionSelector !== undefined) {
    return <FeedbackResolutionMode
      contextType={mode}
      organizationId={organizationId}
      employerId={employerId}
      reportId={reportId}
      reportProductId={reportProductId}
      selector={resolutionSelector}
      onBack={() => setResolutionSelector(undefined)}
      onClose={onClose}
      onEditDeposit={(problemIds) => onEditDeposit?.(problemIds)}
    />;
  }

  if (mode === "deposit") {
    if (!reportId || !reportProductId) return null;
    return <ReportDepositFeedbackModal
      organizationId={organizationId}
      employerId={employerId}
      reportId={reportId}
      reportProductId={reportProductId}
      hasFeedback={hasFeedback}
      onClose={onClose}
      onEdit={depositView === "details" && onEditDeposit ? () => onEditDeposit([]) : undefined}
      onResolveOne={(selector) => setResolutionSelector(selector)}
      onResolveAll={() => setResolutionSelector(null)}
      viewMode={depositView}
    />;
  }

  const employer = mode === "employer" ? employerContext?.employer : reportContext?.employer;
  const issues = mode === "employer" ? employerContext?.issues ?? [] : reportContext?.issues ?? [];
  const title = mode === "employer"
    ? (employer ? `פרטי מעסיק ומשוב · ${employer.legalName}` : "פרטי מעסיק ומשוב")
    : (reportContext ? `פרטי דיווח ומשוב · ${formatReportingMonth(reportContext.report.reportingMonth, "—")}` : "פרטי דיווח ומשוב");

  return <AppModal
    width="xl"
    className="report-deposit-feedback-modal report-context-feedback-modal"
    title={title}
    subtitle={mode === "employer" ? "תקלות ברמת המעסיק" : "תקלות ברמת הדיווח"}
    onClose={onClose}
    actions={<button type="button" className="btn btn-secondary" onClick={onClose}>סגירה</button>}
  >
    {loading ? <LoadingState label="טוען פרטים ומשוב..." /> : null}
    {error ? <div className="notice notice-error">{error}</div> : null}

    {!loading && !error && mode === "employer" && employerContext ? <>
      <section className="feedback-modal-summary" aria-label="פרטי מעסיק">
        <div><span>מעסיק</span><b>{employerContext.employer.legalName}</b></div>
        <div><span>ח.פ / מזהה</span><b dir="ltr">{employerContext.employer.registrationNumber || "—"}</b></div>
        <div><span>תיק ניכויים</span><b dir="ltr">{employerContext.employer.withholdingFileNumber || "—"}</b></div>
        <div><span>סטטוס</span><b>{employerContext.employer.status}</b></div>
      </section>
      <section className="feedback-modal-section">
        <div className="feedback-modal-section-head">
          <div><h3><Building2 size={17} aria-hidden="true" /> פרטי קשר</h3><p>פרטי המעסיק המשמשים את ממשק המעסיקים.</p></div>
        </div>
        <div className="money-feedback-grid">
          <div><span>איש קשר</span><b>{employerContext.employer.contactName || "—"}</b></div>
          <div><span>טלפון</span><b dir="ltr">{employerContext.employer.contactPhone || employerContext.employer.contactMobile || "—"}</b></div>
          <div><span>דוא״ל</span><b dir="ltr">{employerContext.employer.contactEmail || "—"}</b></div>
        </div>
      </section>
      <section className="feedback-modal-section">
        <div className="feedback-modal-section-head">
          <div><h3>תקלות מעסיק</h3><p>תקלות רוחב ברמת המעסיק והעברת הכספים.</p></div>
        </div>
        <FeedbackIssueGroups
          issues={issues}
          order={["employer"]}
          onResolveOne={(selector) => setResolutionSelector(selector)}
          onResolveAll={() => setResolutionSelector(null)}
          onOpenReport={mode === "employer" ? setLinkedReportId : undefined}
        />
      </section>
    </> : null}

    {!loading && !error && mode === "report" && reportContext ? <>
      <section className="feedback-modal-summary" aria-label="פרטי דיווח">
        <div><span>מעסיק</span><b>{reportContext.employer.legalName}</b></div>
        <div><span>חודש דיווח</span><b>{formatReportingMonth(reportContext.report.reportingMonth, "—")}</b></div>
        <div><span>סוג דיווח</span><b>{reportKindLabel(reportContext.report.reportKind)}</b></div>
        <div><span>סטטוס</span><b>{String(reportContext.report.status)}</b></div>
        <div><span>עובדים</span><b>{reportContext.report.employeeCount}</b></div>
        <div><span>סכום דיווח</span><b>{formatMoney(reportContext.report.totalAmount)}</b></div>
        <div><span>תאריך תשלום שכר</span><b>{reportContext.report.salaryPaymentDate ? formatDateTimeDDMMYYYY(reportContext.report.salaryPaymentDate, "—") : "—"}</b></div>
        <div><span>עודכן</span><b>{formatDateTimeDDMMYYYY(reportContext.report.updatedAt, "—")}</b></div>
      </section>
      <section className="feedback-modal-section">
        <div className="feedback-modal-section-head">
          <div><h3><FileText size={17} aria-hidden="true" /> תקלות בדיווח</h3><p>תקלות ששייכות לדיווח עצמו בלבד.</p></div>
        </div>
        <FeedbackIssueGroups
          issues={issues}
          order={["report"]}
          onResolveOne={(selector) => setResolutionSelector(selector)}
          onResolveAll={() => setResolutionSelector(null)}
        />
      </section>
    </> : null}
  </AppModal>;
}
