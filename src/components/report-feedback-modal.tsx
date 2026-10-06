"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, FileText } from "lucide-react";
import { AppModal } from "@/components/app-modal";
import { FeedbackResolveButton } from "@/components/feedback-resolve-button";
import { ReportDepositFeedbackModal } from "@/components/report-deposit-feedback-modal";
import {
  reportFeedbackApi,
  type EmployerFeedbackContext,
  type ReportFeedbackContext,
  type ReportFeedbackContextIssue,
} from "@/lib/report-feedback-api";
import { formatDateTimeDDMMYYYY } from "@/lib/date-format";

export type ReportFeedbackModalMode = "employer" | "report" | "deposit";

function money(value: number | null | undefined) {
  return value == null ? "—" : `₪${Number(value).toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
}

function formatMonth(value: string) {
  const parts = value?.slice(0, 7).split("-");
  return parts?.length === 2 ? `${parts[1]}/${parts[0]}` : value || "—";
}

function reportKindLabel(value: number | string) {
  if (value === 2 || value === "2" || value === "Differences") return "הפרשים";
  if (value === 3 || value === "3" || value === "Negative") return "שלילי";
  return "שוטף";
}

function scopeLabel(scope: string) {
  switch (scope) {
    case "report": return "דיווח";
    case "money":
    case "employer": return "מעסיק";
    default: return "אחר";
  }
}

function IssueGroups({ issues, order }: { issues: ReportFeedbackContextIssue[]; order: string[] }) {
  const groups = useMemo(() => order
    .map(scope => ({
      scope,
      items: issues.filter(item => item.scope === scope || (scope === "employer" && item.scope === "money")),
    }))
    .filter(group => group.items.length > 0), [issues, order]);

  if (!groups.length) return <div className="notice notice-info">לא נמצאו תקלות פתוחות בהקשר הזה.</div>;

  return <div className="feedback-error-groups" role="list">
    <div className="feedback-error-groups-title">
      <AlertTriangle size={16} />
      <strong>תקלות שדורשות טיפול</strong>
    </div>
    {groups.map(group => <section className="feedback-error-group" key={group.scope} role="listitem">
      <div className="feedback-error-group-head">
        <strong>{scopeLabel(group.scope)}</strong>
        <span>{group.items.length} {group.items.length === 1 ? "תקלה" : "תקלות"}</span>
      </div>
      <div className="feedback-error-group-list">
        {group.items.map((item, index) => <div className="feedback-error-action-row" key={`${item.code}:${item.reportId}:${index}`}>
          <div className="feedback-error-copy">
            <b>{item.code > 0 ? `קוד ${item.code}` : "תקלה"}</b>
            <span>{item.description}</span>
          </div>
          <FeedbackResolveButton compact />
        </div>)}
      </div>
    </section>)}
  </div>;
}

export function ReportFeedbackModal({
  mode,
  organizationId,
  employerId,
  reportId,
  reportProductId,
  hasFeedback = false,
  onClose,
}: {
  mode: ReportFeedbackModalMode;
  organizationId: string;
  employerId: string;
  reportId?: string;
  reportProductId?: string;
  hasFeedback?: boolean;
  onClose: () => void;
}) {
  const [employerContext, setEmployerContext] = useState<EmployerFeedbackContext | null>(null);
  const [reportContext, setReportContext] = useState<ReportFeedbackContext | null>(null);
  const [loading, setLoading] = useState(mode !== "deposit");
  const [error, setError] = useState("");

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

  if (mode === "deposit") {
    if (!reportId || !reportProductId) return null;
    return <ReportDepositFeedbackModal
      organizationId={organizationId}
      employerId={employerId}
      reportId={reportId}
      reportProductId={reportProductId}
      hasFeedback={hasFeedback}
      onClose={onClose}
    />;
  }

  const employer = mode === "employer" ? employerContext?.employer : reportContext?.employer;
  const issues = mode === "employer" ? employerContext?.issues ?? [] : reportContext?.issues ?? [];
  const title = mode === "employer"
    ? (employer ? `פרטי מעסיק ומשוב · ${employer.legalName}` : "פרטי מעסיק ומשוב")
    : (reportContext ? `פרטי דיווח ומשוב · ${formatMonth(reportContext.report.reportingMonth)}` : "פרטי דיווח ומשוב");

  return <AppModal
    width="xl"
    className="report-deposit-feedback-modal report-context-feedback-modal"
    title={title}
    subtitle={mode === "employer" ? "תקלות ברמת המעסיק" : "תקלות הדיווח ותקלות המעסיק שמשפיעות עליו"}
    onClose={onClose}
    actions={<button type="button" className="btn btn-secondary" onClick={onClose}>סגירה</button>}
  >
    {loading ? <div className="empty">טוען פרטים ומשוב...</div> : null}
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
        <IssueGroups issues={issues} order={["employer"]} />
      </section>
    </> : null}

    {!loading && !error && mode === "report" && reportContext ? <>
      <section className="feedback-modal-summary" aria-label="פרטי דיווח">
        <div><span>מעסיק</span><b>{reportContext.employer.legalName}</b></div>
        <div><span>חודש דיווח</span><b>{formatMonth(reportContext.report.reportingMonth)}</b></div>
        <div><span>סוג דיווח</span><b>{reportKindLabel(reportContext.report.reportKind)}</b></div>
        <div><span>סטטוס</span><b>{String(reportContext.report.status)}</b></div>
        <div><span>עובדים</span><b>{reportContext.report.employeeCount}</b></div>
        <div><span>סכום דיווח</span><b>{money(reportContext.report.totalAmount)}</b></div>
        <div><span>תאריך תשלום שכר</span><b>{reportContext.report.salaryPaymentDate ? formatDateTimeDDMMYYYY(reportContext.report.salaryPaymentDate, "—") : "—"}</b></div>
        <div><span>עודכן</span><b>{formatDateTimeDDMMYYYY(reportContext.report.updatedAt, "—")}</b></div>
      </section>
      <section className="feedback-modal-section">
        <div className="feedback-modal-section-head">
          <div><h3><FileText size={17} aria-hidden="true" /> תקלות בדיווח</h3><p>קודם תקלות ברמת הדיווח, אחריהן תקלות מעסיק שמשפיעות על הדיווח.</p></div>
        </div>
        <IssueGroups issues={issues} order={["report", "employer"]} />
      </section>
    </> : null}
  </AppModal>;
}
