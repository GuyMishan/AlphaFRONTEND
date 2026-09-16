"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Eye, FileClock, Plus, RefreshCw, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getEmployerSelection } from "@/lib/session";
import { reportFeedbackApi, type ReportFeedbackDetails, type ReportFeedbackRow, type ReportFeedbackStatus } from "@/lib/report-feedback-api";

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
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });
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

export default function ReportsPage() {
  const [scope, setScope] = useState<{ organizationId: string; employerId: string } | null>(null);
  const [filter, setFilter] = useState<ReportFeedbackStatus>("all");
  const [rows, setRows] = useState<ReportFeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ReportFeedbackDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  async function load(nextScope = scope, nextFilter = filter) {
    if (!nextScope) return;
    setLoading(true);
    setError("");
    try {
      const result = await reportFeedbackApi.list(nextScope.organizationId, nextScope.employerId, nextFilter, 0, 100);
      setRows(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת הדיווחים נכשלה");
      setRows([]);
    } finally {
      setLoading(false);
    }
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

  return <AppShell title="דיווחים">
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
      {loading ? <div className="empty">טוען דיווחים...</div> : rows.length === 0 ? <div className="empty">לא נמצאו דיווחים בהתאם לסינון.</div> : <div className="table-scroll"><table className="report-feedback-table"><thead><tr><th>חודש</th><th>סוג דיווח</th><th>עובדים</th><th>סטטוס משוב</th><th>שגיאות</th><th>שידור אחרון</th><th></th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{formatMonth(row.reportingMonth)}</strong></td><td>{kindLabel(row.reportKind)}</td><td>{row.employeeCount}</td><td><StatusBadge status={row.feedbackStatus} /></td><td>{row.issueCount > 0 ? <span className="report-feedback-error-count">{row.issueCount}</span> : "—"}</td><td>{row.lastTransmission ? <div className="report-feedback-transmission"><span>{row.lastTransmission.provider}</span><small>{formatDate(row.lastTransmission.completedAt ?? row.lastTransmission.sentAt ?? row.lastTransmission.startedAt)}</small></div> : "—"}</td><td><button type="button" className="btn btn-secondary btn-sm" onClick={() => void openFeedback(row)} disabled={loadingDetails}><Eye size={15} />{row.feedbackStatus === "error" ? "צפייה במשוב" : "פרטים"}</button></td></tr>)}</tbody></table></div>}
    </div>

    {selected ? <div className="report-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><div className="report-modal report-feedback-modal" role="dialog" aria-modal="true" aria-label="משוב דיווח"><div className="report-modal-header"><div><h2>משוב דיווח {formatMonth(selected.report.reportingMonth)}</h2><span>{kindLabel(selected.report.reportKind)} · {selected.issueCount ? `${selected.issueCount} שגיאות/הערות` : "ללא שגיאות"}</span></div><button className="icon-button" type="button" aria-label="סגירה" onClick={() => setSelected(null)}><X size={18} /></button></div><div className="report-modal-body"><div style={{ marginBottom: 18 }}><StatusBadge status={selected.feedbackStatus} /></div>{selected.issues.length === 0 ? <div className="notice notice-info">לא נמצאו שגיאות בדיווח הזה.</div> : <div className="report-feedback-issues">{selected.issues.map((issue, index) => <div className="report-feedback-issue" key={`${issue.code}-${index}`}><div className="report-feedback-issue-head"><strong>{issue.employeeName || issue.productName || "שגיאה כללית בדיווח"}</strong><span>{issue.code}</span></div>{issue.productName && issue.employeeName ? <small>מוצר: {issue.productName}</small> : null}<p>{issue.description}</p><div className="report-feedback-action">פעולה מומלצת: {issue.actionType === "EditReport" ? "עריכת הדיווח" : issue.actionType === "RetryTransmission" ? "בדיקה ושליחה מחדש" : issue.actionType}</div></div>)}</div>}{selected.transmissions.length > 0 ? <div className="report-feedback-history"><h3>היסטוריית שידורים</h3>{selected.transmissions.map((tx) => <div key={tx.id}><span>ניסיון {tx.attemptNumber} · {tx.provider}</span><small>{formatDate(tx.completedAt ?? tx.sentAt ?? tx.startedAt)}</small></div>)}</div> : null}</div><div className="report-modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>סגירה</button></div></div></div> : null}
  </AppShell>;
}
