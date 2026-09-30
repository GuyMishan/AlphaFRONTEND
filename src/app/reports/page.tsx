"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Eye, FileClock, Pencil, Plus, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppModal } from "@/components/app-modal";
import { DataTable } from "@/components/data-table";
import { DepositPaymentEditor } from "@/components/manual-deposit-data";
import { manualDepositsApi, type ManualDepositRow } from "@/lib/manual-deposits-api";
import { getEmployerSelection } from "@/lib/session";
import { reportFeedbackApi, type ReportFeedbackDetails, type ReportFeedbackRow, type ReportFeedbackStatus } from "@/lib/report-feedback-api";
import { formatDateTimeDDMMYYYY } from "@/lib/date-format";

const filters: Array<{ value: ReportFeedbackStatus; label: string }> = [
  { value: "all", label: "הכל" },
  { value: "success", label: "הצליח" },
  { value: "error", label: "שגיאה" },
  { value: "pending", label: "ממתין למשוב" },
  { value: "not-sent", label: "לא נשלח" },
];

function formatMonth(value: string) {
  const [year, month] = value.slice(0, 7).split("-");
  return year && month ? `${month}/${year}` : value;
}

function formatDate(value: string | null | undefined) {
  return formatDateTimeDDMMYYYY(value, "—");
}

function kindLabel(value: string | number) {
  if (value === 2 || value === "2" || value === "Differences") return "הפרשים";
  if (value === 3 || value === "3" || value === "Negative") return "שלילי";
  return "שוטף";
}

function feedbackLabel(status: ReportFeedbackRow["feedbackStatus"]) {
  switch (status) {
    case "success": return "הושלם בהצלחה";
    case "error": return "הסתיים עם שגיאה";
    case "pending": return "ממתין למשוב";
    default: return "לא נשלח";
  }
}

function StatusBadge({ status }: { status: ReportFeedbackRow["feedbackStatus"] }) {
  const icon = status === "success" ? <CheckCircle2 size={15} /> : status === "error" ? <AlertTriangle size={15} /> : status === "pending" ? <Clock3 size={15} /> : <FileClock size={15} />;
  return <span className={`report-feedback-badge ${status}`}>{icon}{feedbackLabel(status)}</span>;
}

type ExpandedReportContent = {
  deposits: ManualDepositRow[];
  hasMore: boolean;
  feedback: ReportFeedbackDetails;
};

function editableReport(status: string | number): boolean {
  return [1, 2, 9, "1", "2", "9", "Draft", "ReadyForValidation", "Error"].includes(status);
}

function DepositFeedbackPanel({ report, content, onEdit, onLoadMore, loadingMore, onReportFeedback }: {
  report: ReportFeedbackRow; content: ExpandedReportContent;
  onEdit: (deposit: ManualDepositRow) => void;
  onLoadMore: () => void;
  loadingMore: boolean;
  onReportFeedback: () => void;
}) {
  const byProduct = new Map((content.feedback.depositFeedback ?? []).map(item => [item.reportProductId, item]));
  const editable = editableReport(report.status);
  return <div className="report-deposits-panel">
    <div className="report-deposits-heading">
      <div><b>הפקדות בדיווח</b><small>{editable ? "ניתן לערוך כל הפקדה באמצעות חלונית נתוני ההפקדות" : "דיווח שכבר הועבר נשאר ללא שינוי; ניתן לצפות בפרטי כל הפקדה"}</small></div>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onReportFeedback}><Eye size={15} />משוב הדיווח המלא</button>
    </div>
    {content.deposits.length === 0
      ? <div className="notice notice-info">לא נמצאו הפקדות משויכות לדיווח.</div>
      : <div className="report-deposits-grid" role="table" aria-label="נתוני הפקדות ומשוב לפי עובד ומוצר">
        <div className="report-deposits-header" role="row">
          <span role="columnheader">עובד</span><span role="columnheader">יצרן / מוצר</span>
          <span role="columnheader">סכום</span><span role="columnheader">משוב למסלקה</span><span role="columnheader">פעולה</span>
        </div>
        {content.deposits.map(deposit => {
          const feedback = byProduct.get(deposit.id);
          const records = feedback?.records ?? [];
          const errors = records.filter(record => record.errorCode != null && record.errorCode !== 1);
          return <div className="report-deposits-item" role="row" key={deposit.id}>
            <div role="cell"><b>{deposit.employeeName}</b></div>
            <div role="cell"><b>{deposit.providerName || deposit.fundCompanyName || deposit.fundName || "מוצר פנסיוני"}</b>
              <small>{deposit.policyNumber || "ללא מספר פוליסה"}</small></div>
            <div role="cell" className="report-deposits-money">₪{Number(deposit.totalDeposit).toLocaleString("he-IL")}</div>
            <div role="cell" className="report-deposits-feedback">
              {records.length ? <details><summary className={errors.length ? "report-deposits-has-issues" : ""}>
                {errors.length ? `${errors.length} הערות / שגיאות` : "התקבל משוב פרטני"} · הצגת פירוט
              </summary><div className="report-deposits-records">
                {records.map(record => <div key={record.recordIdentifier}>
                  <span>{record.description}</span>
                  {record.intakeStatus != null ? <small>סטטוס קליטת רשומה: קוד {record.intakeStatus}</small> : null}
                  {record.errorCode != null ? <small>קוד שגיאה: {record.errorCode}</small> : null}
                  {record.sourceFileName ? <small>מקור: {record.sourceFileName}</small> : null}
                </div>)}
              </div></details> : <span className="report-deposits-unmatched">
                {content.feedback.officialFeedback?.length
                  ? "קיים משוב לקובץ, ללא התאמה חד־משמעית לשורה"
                  : "טרם התקבל משוב פרטני"}
              </span>}
            </div>
            <div role="cell"><button type="button" className="btn btn-secondary btn-sm"
              onClick={() => onEdit(deposit)} aria-label={`${editable ? "עריכת" : "צפייה ב"} הפקדה של ${deposit.employeeName}`}>
              {editable ? <Pencil size={15} /> : <Eye size={15} />}{editable ? "עריכה" : "צפייה"}
            </button></div>
          </div>;
        })}
      </div>}
    {content.hasMore ? <button className="btn btn-secondary btn-sm report-deposits-load-more"
      disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? "טוען..." : "טעינת הפקדות נוספות"}</button> : null}
    {!editable ? <p className="report-deposits-immutable">שינוי נתונים בדיווח שכבר נשלח מתבצע באמצעות תהליך דיווח מתקן, ולא בעריכת הדיווח המקורי.</p> : null}
  </div>;
}

export default function ReportsPage() {
  const [scope, setScope] = useState<{ organizationId: string; employerId: string } | null>(null);
  const [filter, setFilter] = useState<ReportFeedbackStatus>("all");
  const [rows, setRows] = useState<ReportFeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreReports, setHasMoreReports] = useState(false);
  const [loadingMoreReports, setLoadingMoreReports] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ReportFeedbackDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());
  const [expandedContent, setExpandedContent] = useState<Record<string, ExpandedReportContent>>({});
  const [expandedLoading, setExpandedLoading] = useState<Record<string, boolean>>({});
  const [expandedErrors, setExpandedErrors] = useState<Record<string, string>>({});
  const [expandedMoreLoading, setExpandedMoreLoading] = useState<Record<string, boolean>>({});
  const expandedRequests = useRef(new Set<string>());
  const [editingDeposit, setEditingDeposit] = useState<{ report: ReportFeedbackRow; deposit: ManualDepositRow } | null>(null);

  async function loadExpanded(report: ReportFeedbackRow, force = false) {
    if (!scope || expandedRequests.current.has(report.id) || (!force && expandedContent[report.id])) return;
    expandedRequests.current.add(report.id);
    setExpandedLoading(previous => ({ ...previous, [report.id]: true }));
    setExpandedErrors(previous => ({ ...previous, [report.id]: "" }));
    try {
      const [deposits, feedback] = await Promise.all([
        manualDepositsApi.list(scope.organizationId, scope.employerId, report.id, "", 0, 100),
        reportFeedbackApi.details(scope.organizationId, scope.employerId, report.id),
      ]);
      setExpandedContent(previous => ({ ...previous, [report.id]: { deposits: deposits.items, hasMore: deposits.hasMore, feedback } }));
    } catch (err) {
      setExpandedErrors(previous => ({ ...previous, [report.id]: err instanceof Error ? err.message : "טעינת ההפקדות נכשלה" }));
    } finally {
      expandedRequests.current.delete(report.id);
      setExpandedLoading(previous => ({ ...previous, [report.id]: false }));
    }
  }

  async function loadMoreDeposits(report: ReportFeedbackRow) {
    if (!scope || expandedMoreLoading[report.id] || !expandedContent[report.id]?.hasMore) return;
    setExpandedMoreLoading(previous => ({ ...previous, [report.id]: true }));
    try {
      const current = expandedContent[report.id];
      const next = await manualDepositsApi.list(scope.organizationId, scope.employerId, report.id, "", current.deposits.length, 100);
      setExpandedContent(previous => ({
        ...previous,
        [report.id]: { ...previous[report.id], deposits: [...previous[report.id].deposits, ...next.items], hasMore: next.hasMore },
      }));
    } catch (err) {
      setExpandedErrors(previous => ({ ...previous, [report.id]: err instanceof Error ? err.message : "טעינת הפקדות נוספות נכשלה" }));
    } finally {
      setExpandedMoreLoading(previous => ({ ...previous, [report.id]: false }));
    }
  }

  async function load(nextScope = scope, nextFilter = filter) {
    if (!nextScope) return;
    setLoading(true);
    setError("");
    try {
      const result = await reportFeedbackApi.list(nextScope.organizationId, nextScope.employerId, nextFilter, 0, 100);
      setRows(result.items);
      setHasMoreReports(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת הדיווחים נכשלה");
      setRows([]);
      setHasMoreReports(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreReports() {
    if (!scope || !hasMoreReports || loading || loadingMoreReports) return;
    setLoadingMoreReports(true);
    try {
      const page = await reportFeedbackApi.list(scope.organizationId, scope.employerId, filter, rows.length, 100);
      setRows(previous => {
        const seen = new Set(previous.map(row => row.id));
        return [...previous, ...page.items.filter(row => !seen.has(row.id))];
      });
      setHasMoreReports(page.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת דיווחים נוספים נכשלה");
    } finally { setLoadingMoreReports(false); }
  }

  async function openFeedback(row: ReportFeedbackRow) {
    if (!scope) return;
    setLoadingDetails(true);
    setError("");
    try {
      setSelected(await reportFeedbackApi.details(scope.organizationId, scope.employerId, row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת המשוב נכשלה");
    } finally {
      setLoadingDetails(false);
    }
  }

  useEffect(() => {
    const initial = getEmployerSelection();
    if (initial) {
      setScope(initial);
      void load(initial, "all");
    }
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId: string; employerId?: string }>).detail;
      if (!detail.employerId) return;
      const next = { organizationId: detail.organizationId, employerId: detail.employerId };
      setScope(next);
      setFilter("all");
      setSelected(null);
      setEditingDeposit(null);
      setExpandedKeys(new Set());
      setExpandedContent({});
      setExpandedErrors({});
      expandedRequests.current.clear();
      void load(next, "all");
    };
    window.addEventListener("alpha:scope-change", handler);
    return () => window.removeEventListener("alpha:scope-change", handler);
  }, []);

  const counts = useMemo(() => ({
    total: rows.length,
    errors: rows.filter((row) => row.feedbackStatus === "error").length,
    success: rows.filter((row) => row.feedbackStatus === "success").length,
  }), [rows]);

  function changeFilter(value: ReportFeedbackStatus) {
    setFilter(value);
    void load(scope, value);
  }

  return <AppShell title="דיווחים ומשובים">
    <div className="page-head">
      <div><h1>דיווחים ומשובים</h1><p>מעקב אחרי כל הדיווחים, סטטוס השידור והמשוב שהתקבל.</p></div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-secondary" type="button" onClick={() => void load()} disabled={!scope || loading}><RefreshCw size={16} />רענון</button>
        <Link className="btn btn-primary" href="/reports/new"><Plus size={16} />דיווח חדש</Link>
      </div>
    </div>

    {!scope ? <div className="notice notice-info">יש לבחור ארגון ומעסיק בבורר העליון כדי לצפות בדיווחים.</div> : null}
    {error ? <div className="notice notice-error" style={{ marginBottom: 16 }}>{error}</div> : null}

    <div className="report-feedback-summary">
      <div className="card"><strong>{counts.total}</strong><span>דיווחים בתצוגה</span></div>
      <div className="card"><strong>{counts.success}</strong><span>הושלמו בהצלחה</span></div>
      <div className="card"><strong>{counts.errors}</strong><span>דורשים בדיקה</span></div>
    </div>

    <div className="report-feedback-filters" aria-label="סינון דיווחים">
      {filters.map((item) => <button key={item.value} type="button" className={filter === item.value ? "active" : ""} onClick={() => changeFilter(item.value)} disabled={!scope}>{item.label}</button>)}
    </div>

    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <DataTable
        items={rows}
        hasMore={hasMoreReports}
        onLoadMore={loadMoreReports}
        loadingMore={loadingMoreReports}
        loadingMoreLabel="טוען דיווחים נוספים..."
        loading={loading}
        loadingLabel="טוען דיווחים..."
        emptyState="לא נמצאו דיווחים בהתאם לסינון."
        rowKey={(row) => row.id}
        tableClassName="report-feedback-table"
        expandedRowKeys={expandedKeys}
        expandedRowComponentSize={380}
        onExpandedRowChange={(key, expanded, report) => {
          setExpandedKeys(previous => {
            const next = new Set(previous);
            if (expanded) next.add(key); else next.delete(key);
            return next;
          });
          if (expanded) void loadExpanded(report);
        }}
        expandedRowComponent={(report) => <div className="report-deposits-expanded">
          {expandedLoading[report.id] ? <div className="empty">טוען הפקדות ומשובים...</div> : null}
          {expandedErrors[report.id] ? <div className="notice notice-error">{expandedErrors[report.id]}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void loadExpanded(report, true)}>נסה שוב</button>
          </div> : null}
          {expandedContent[report.id] ? <DepositFeedbackPanel report={report} content={expandedContent[report.id]}
            onEdit={(deposit) => setEditingDeposit({ report, deposit })}
            onReportFeedback={() => void openFeedback(report)}
            loadingMore={Boolean(expandedMoreLoading[report.id])}
            onLoadMore={() => void loadMoreDeposits(report)} /> : null}
        </div>}
        columns={[
          { key: "month", label: "חודש" },
          { key: "kind", label: "סוג דיווח" },
          { key: "employees", label: "עובדים" },
          { key: "status", label: "סטטוס משוב" },
          { key: "issues", label: "שגיאות" },
          { key: "transmission", label: "שידור אחרון" },
          { key: "actions", label: "" },
        ]}
        renderCells={(row) => [
          <strong key="month">{formatMonth(row.reportingMonth)}</strong>,
          kindLabel(row.reportKind),
          row.employeeCount,
          <StatusBadge key="status" status={row.feedbackStatus} />,
          row.issueCount > 0 ? <span key="issues" className="report-feedback-error-count">{row.issueCount}</span> : "—",
          row.lastTransmission ? <div key="tx" className="report-feedback-transmission"><span>{row.lastTransmission.provider}</span><small>{formatDate(row.lastTransmission.completedAt ?? row.lastTransmission.sentAt ?? row.lastTransmission.startedAt)}</small></div> : "—",
          <button key="action" type="button" className="btn btn-secondary btn-sm" onClick={() => void openFeedback(row)} disabled={loadingDetails}><Eye size={15} />{row.feedbackStatus === "error" ? "צפייה במשוב" : "פרטים"}</button>,
        ]}
      />
    </div>

    {editingDeposit && scope ? <DepositPaymentEditor
      key={editingDeposit.deposit.id} employer={null}
      organizationId={scope.organizationId} employerId={scope.employerId}
      reportId={editingDeposit.report.id} row={editingDeposit.deposit}
      readOnly={!editableReport(editingDeposit.report.status)}
      onEvidenceChanged={() => {}}
      onClose={() => setEditingDeposit(null)}
      onSaved={(updated) => {
        setExpandedContent(previous => {
          const existing = previous[editingDeposit.report.id];
          return existing ? {
            ...previous,
            [editingDeposit.report.id]: {
              ...existing,
              deposits: existing.deposits.map(item => item.id === updated.id ? updated : item),
            },
          } : previous;
        });
        setEditingDeposit(null);
      }}
    /> : null}
    {selected ? <AppModal width="lg" className="report-feedback-modal"
      title={`משוב דיווח ${formatMonth(selected.report.reportingMonth)}`}
      subtitle={`${kindLabel(selected.report.reportKind)} · ${selected.issueCount ? `${selected.issueCount} שגיאות/הערות` : "ללא שגיאות"}`}
      onClose={() => setSelected(null)}
      actions={<button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>סגירה</button>}>
      <div style={{ marginBottom: 18 }}><StatusBadge status={selected.feedbackStatus} /></div>
      {selected.issues.length === 0
        ? <div className="notice notice-info">לא נמצאו שגיאות בדיווח הזה.</div>
        : <div className="report-feedback-issues">
          {selected.issues.map((issue, index) => <div className="report-feedback-issue" key={`${issue.code}-${index}`}>
            <div className="report-feedback-issue-head">
              <strong>{issue.employeeName || issue.productName || "שגיאה כללית בדיווח"}</strong>
              <span>{issue.code}</span>
            </div>
            {issue.productName && issue.employeeName ? <small>מוצר: {issue.productName}</small> : null}
            <p>{issue.description}</p>
            <div className="report-feedback-action">פעולה מומלצת: {issue.actionType === "EditReport"
              ? "עריכת הדיווח" : issue.actionType === "RetryTransmission" ? "בדיקה ושליחה מחדש" : issue.actionType}</div>
          </div>)}
        </div>}
      {selected.officialFeedback?.length > 0 ? <div className="report-feedback-history">
        <h3>משובים רשמיים מהמסלקה</h3>
        {selected.officialFeedback.map(feedback => <div key={feedback.id}>
          <span>{feedback.sourceFileName}{feedback.interfaceFileNumber ? ` · קובץ ${feedback.interfaceFileNumber}` : ""}</span>
          <small>{formatDate(feedback.receivedAt)}</small>
        </div>)}
      </div> : null}
      {selected.transmissions.length > 0 ? <div className="report-feedback-history">
        <h3>היסטוריית שידורים</h3>
        {selected.transmissions.map(tx => <div key={tx.id}>
          <span>ניסיון {tx.attemptNumber} · {tx.provider}</span>
          <small>{formatDate(tx.completedAt ?? tx.sentAt ?? tx.startedAt)}</small>
        </div>)}
      </div> : null}
    </AppModal> : null}
  </AppShell>;
}
