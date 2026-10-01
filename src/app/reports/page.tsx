"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Columns3,
  Download,
  Eye,
  FileClock,
  Filter,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { DepositPaymentEditor } from "@/components/manual-deposit-data";
import { ReportDepositFeedbackModal } from "@/components/report-deposit-feedback-modal";
import { UiCheckbox, UiDateInput, UiInput, UiSelect } from "@/components/ui-controls";
import { manualDepositsApi, type ManualDepositRow } from "@/lib/manual-deposits-api";
import { getEmployerSelection } from "@/lib/session";
import {
  reportFeedbackApi,
  type ReportFeedbackDepositRow,
  type ReportFeedbackFilters,
  type ReportFeedbackRow,
  type ReportFeedbackStatus,
  type TreatmentStatusOption,
} from "@/lib/report-feedback-api";
import { formatDateTimeDDMMYYYY } from "@/lib/date-format";
import { referenceOptionsApi, type ReferenceOption } from "@/lib/reference-options-api";
import "./reports.css";

const statusFilters: Array<{ value: ReportFeedbackStatus; label: string }> = [
  { value: "all", label: "הכל" },
  { value: "completed", label: "הושלם" },
  { value: "attention", label: "דורש טיפול" },
  { value: "partial", label: "משוב חלקי" },
  { value: "pending", label: "ממתין למשוב" },
  { value: "not-sent", label: "לא נשלח" },
];

type ExtraFilterKey = "kind" | "product" | "treatment" | "attention";
type ColumnKey = "month" | "kind" | "employees" | "total" | "status" | "attention" | "payoff" | "transmission" | "actions";

const columnOptions: Array<{ key: ColumnKey; label: string; defaultVisible: boolean }> = [
  { key: "month", label: "חודש", defaultVisible: true },
  { key: "kind", label: "סוג דיווח", defaultVisible: true },
  { key: "employees", label: "עובדים", defaultVisible: false },
  { key: "total", label: "סכום דיווח", defaultVisible: true },
  { key: "status", label: "מצב דיווח", defaultVisible: true },
  { key: "attention", label: "דורש טיפול", defaultVisible: true },
  { key: "payoff", label: "שיעור פירעון", defaultVisible: true },
  { key: "transmission", label: "שידור אחרון", defaultVisible: true },
  { key: "actions", label: "פעולות", defaultVisible: true },
];

function formatMonth(value: string) {
  const [year, month] = value.slice(0, 7).split("-");
  return year && month ? `${month}/${year}` : value;
}

function formatDate(value: string | null | undefined) {
  return formatDateTimeDDMMYYYY(value, "—");
}

function money(value: number | null | undefined) {
  return value == null ? "—" : `₪${Number(value).toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
}

function kindLabel(value: string | number) {
  if (value === 2 || value === "2" || value === "Differences") return "הפרשים";
  if (value === 3 || value === "3" || value === "Negative") return "שלילי";
  return "שוטף";
}

function feedbackLabel(status: ReportFeedbackRow["feedbackStatus"]) {
  switch (status) {
    case "completed": return "הושלם";
    case "attention": return "דורש טיפול";
    case "partial": return "משוב חלקי";
    case "pending": return "ממתין למשוב";
    default: return "לא נשלח";
  }
}

function StatusBadge({ status }: { status: ReportFeedbackRow["feedbackStatus"] }) {
  const icon = status === "completed"
    ? <CheckCircle2 size={15} />
    : status === "attention"
      ? <AlertTriangle size={15} />
      : status === "partial" || status === "pending"
        ? <Clock3 size={15} />
        : <FileClock size={15} />;
  return <span className={`report-feedback-badge ${status}`}>{icon}{feedbackLabel(status)}</span>;
}

type ExpandedReportContent = {
  deposits: ReportFeedbackDepositRow[];
  hasMore: boolean;
};

function DepositStatusBadge({ value, label }: { value: string; label: string }) {
  return <span className={`feedback-state ${value}`}>{label}</span>;
}

function DepositFeedbackPanel({
  report,
  content,
  onOpen,
  onLoadMore,
  loadingMore,
  onExport,
  exporting,
  onStartCorrection,
}: {
  report: ReportFeedbackRow;
  content: ExpandedReportContent;
  onOpen: (deposit: ReportFeedbackDepositRow) => void;
  onLoadMore: () => void;
  loadingMore: boolean;
  onExport: (type: "contributions" | "deposits" | "feedback") => void;
  exporting: boolean;
  onStartCorrection: () => void;
}) {
  return <div className="report-deposits-panel">
    <div className="report-deposits-heading">
      <div>
        <b>הפקדות בדיווח</b>
        <small>כל שורה מייצגת עובד + מוצר. המשוב, מצב הכספים והטיפול נשארים מחוברים לאותה הפקדה.</small>
      </div>
      <div className="report-expanded-actions">
        {["6", "8", "Sent", "Completed"].includes(String(report.status))
          ? <button type="button" className="btn btn-secondary btn-sm" onClick={onStartCorrection}><RefreshCw size={15} />יצירת דיווח מתקן</button>
          : null}
        <details className="report-control-menu">
          <summary className="btn btn-secondary btn-sm"><Download size={15} />ייצוא</summary>
          <div className="report-control-menu-panel">
            <button type="button" disabled={exporting} onClick={() => onExport("contributions")}>פירוט עובדים והפרשות</button>
            <button type="button" disabled={exporting} onClick={() => onExport("deposits")}>סיכום הפקדות</button>
            <button type="button" disabled={exporting} onClick={() => onExport("feedback")}>משוב קופות</button>
          </div>
        </details>
      </div>
    </div>
    {content.deposits.length === 0
      ? <div className="notice notice-info">לא נמצאו הפקדות משויכות לדיווח.</div>
      : <div className="report-deposits-grid" role="table" aria-label="הפקדות ומשובים לפי עובד ומוצר">
        <div className="report-deposits-header" role="row">
          <span role="columnheader">עובד</span>
          <span role="columnheader">יצרן / מוצר</span>
          <span role="columnheader">סכום</span>
          <span role="columnheader">משוב</span>
          <span role="columnheader">מצב כספים</span>
          <span role="columnheader">סטטוס טיפול</span>
          <span role="columnheader">עודכן</span>
          <span role="columnheader">פעולה</span>
        </div>
        {content.deposits.map((deposit) => <div className="report-deposits-item" role="row" key={deposit.id}>
          <div role="cell"><b>{deposit.employeeName}</b></div>
          <div role="cell">
            <b>{deposit.fundCompanyName || deposit.fundName || "מוצר פנסיוני"}</b>
            <small>{deposit.fundName && deposit.fundCompanyName ? deposit.fundName : deposit.policyNumber || "ללא מספר פוליסה"}</small>
          </div>
          <div role="cell" className="report-deposits-money">{money(deposit.totalAmount)}</div>
          <div role="cell"><DepositStatusBadge value={deposit.feedbackStatus} label={deposit.feedbackLabel} /></div>
          <div role="cell"><DepositStatusBadge value={deposit.moneyStatus} label={deposit.moneyStatusLabel} /></div>
          <div role="cell">
            {deposit.treatmentStatusLabel
              ? <span className="report-treatment-label">{deposit.treatmentStatusLabel}</span>
              : <span className="muted-inline">לא עודכן</span>}
          </div>
          <div role="cell" className="muted-inline">{formatDate(deposit.updatedAt)}</div>
          <div role="cell">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpen(deposit)}>
              <Eye size={15} />פרטים
            </button>
          </div>
        </div>)}
      </div>}
    {content.hasMore ? <button className="btn btn-secondary btn-sm report-deposits-load-more" disabled={loadingMore} onClick={onLoadMore}>
      {loadingMore ? "טוען..." : "טעינת הפקדות נוספות"}
    </button> : null}
  </div>;
}

export default function ReportsPage() {
  const router = useRouter();
  const [scope, setScope] = useState<{ organizationId: string; employerId: string } | null>(null);
  const [filters, setFilters] = useState<ReportFeedbackFilters>({ status: "all" });
  const [extraFilters, setExtraFilters] = useState<ExtraFilterKey[]>([]);
  const [treatmentStatuses, setTreatmentStatuses] = useState<TreatmentStatusOption[]>([]);
  const [reportKindOptions, setReportKindOptions] = useState<ReferenceOption[]>([]);
  const [rows, setRows] = useState<ReportFeedbackRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMoreReports, setHasMoreReports] = useState(false);
  const [loadingMoreReports, setLoadingMoreReports] = useState(false);
  const [error, setError] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());
  const [expandedContent, setExpandedContent] = useState<Record<string, ExpandedReportContent>>({});
  const [expandedLoading, setExpandedLoading] = useState<Record<string, boolean>>({});
  const [expandedErrors, setExpandedErrors] = useState<Record<string, string>>({});
  const [expandedMoreLoading, setExpandedMoreLoading] = useState<Record<string, boolean>>({});
  const expandedRequests = useRef(new Set<string>());
  const [selectedDeposit, setSelectedDeposit] = useState<{ report: ReportFeedbackRow; deposit: ReportFeedbackDepositRow } | null>(null);
  const [editingDeposit, setEditingDeposit] = useState<{ report: ReportFeedbackRow; deposit: ManualDepositRow } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => columnOptions.filter((item) => item.defaultVisible).map((item) => item.key));
  const [exportingReportId, setExportingReportId] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("alpha:reports:columns");
      if (!stored) return;
      const parsed = JSON.parse(stored) as ColumnKey[];
      const allowed = new Set(columnOptions.map((item) => item.key));
      const next = parsed.filter((item) => allowed.has(item));
      if (next.includes("actions") && next.length > 1) setVisibleColumns(next);
    } catch { /* keep defaults */ }
  }, []);

  function persistColumns(next: ColumnKey[]) {
    const normalized = Array.from(new Set([...next.filter((item) => item !== "actions"), "actions"])) as ColumnKey[];
    setVisibleColumns(normalized);
    try { window.localStorage.setItem("alpha:reports:columns", JSON.stringify(normalized)); } catch { /* ignore */ }
  }

  async function loadExpanded(report: ReportFeedbackRow, force = false) {
    if (!scope || expandedRequests.current.has(report.id) || (!force && expandedContent[report.id])) return;
    expandedRequests.current.add(report.id);
    setExpandedLoading((previous) => ({ ...previous, [report.id]: true }));
    setExpandedErrors((previous) => ({ ...previous, [report.id]: "" }));
    try {
      const deposits = await reportFeedbackApi.deposits(scope.organizationId, scope.employerId, report.id, "", 0, 100);
      setExpandedContent((previous) => ({ ...previous, [report.id]: { deposits: deposits.items, hasMore: deposits.hasMore } }));
    } catch (err) {
      setExpandedErrors((previous) => ({ ...previous, [report.id]: err instanceof Error ? err.message : "טעינת ההפקדות נכשלה" }));
    } finally {
      expandedRequests.current.delete(report.id);
      setExpandedLoading((previous) => ({ ...previous, [report.id]: false }));
    }
  }

  async function loadMoreDeposits(report: ReportFeedbackRow) {
    if (!scope || expandedMoreLoading[report.id] || !expandedContent[report.id]?.hasMore) return;
    setExpandedMoreLoading((previous) => ({ ...previous, [report.id]: true }));
    try {
      const current = expandedContent[report.id];
      const next = await reportFeedbackApi.deposits(
        scope.organizationId, scope.employerId, report.id, "", current.deposits.length, 100,
      );
      setExpandedContent((previous) => ({
        ...previous,
        [report.id]: {
          deposits: [...previous[report.id].deposits, ...next.items],
          hasMore: next.hasMore,
        },
      }));
    } catch (err) {
      setExpandedErrors((previous) => ({ ...previous, [report.id]: err instanceof Error ? err.message : "טעינת הפקדות נוספות נכשלה" }));
    } finally {
      setExpandedMoreLoading((previous) => ({ ...previous, [report.id]: false }));
    }
  }

  async function load(nextScope = scope, nextFilters = filters) {
    if (!nextScope) return;
    setLoading(true);
    setError("");
    try {
      const result = await reportFeedbackApi.list(nextScope.organizationId, nextScope.employerId, nextFilters, 0, 100);
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
      const page = await reportFeedbackApi.list(scope.organizationId, scope.employerId, filters, rows.length, 100);
      setRows((previous) => {
        const seen = new Set(previous.map((row) => row.id));
        return [...previous, ...page.items.filter((row) => !seen.has(row.id))];
      });
      setHasMoreReports(page.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת דיווחים נוספים נכשלה");
    } finally {
      setLoadingMoreReports(false);
    }
  }

  useEffect(() => {
    const initial = getEmployerSelection();
    if (initial) setScope(initial);
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId: string; employerId?: string }>).detail;
      if (!detail.employerId) return;
      setScope({ organizationId: detail.organizationId, employerId: detail.employerId });
      setFilters({ status: "all" });
      setExtraFilters([]);
      setSelectedDeposit(null);
      setEditingDeposit(null);
      setExpandedKeys(new Set());
      setExpandedContent({});
      setExpandedErrors({});
      expandedRequests.current.clear();
    };
    window.addEventListener("alpha:scope-change", handler);
    return () => window.removeEventListener("alpha:scope-change", handler);
  }, []);

  useEffect(() => {
    if (!scope) return;
    void Promise.all([
      reportFeedbackApi.treatmentStatuses(scope.organizationId, scope.employerId),
      referenceOptionsApi.list("manual-report-kind"),
    ]).then(([treatments, kinds]) => {
      setTreatmentStatuses(treatments);
      setReportKindOptions(kinds);
    }).catch(() => {
      setTreatmentStatuses([]);
      setReportKindOptions([]);
    });
  }, [scope?.organizationId, scope?.employerId]);

  useEffect(() => {
    if (!scope) return;
    const timer = window.setTimeout(() => void load(scope, filters), filters.search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [
    scope?.organizationId,
    scope?.employerId,
    filters.status,
    filters.month,
    filters.reportKind,
    filters.search,
    filters.product,
    filters.treatmentStatus,
    filters.requiresAttention,
  ]);

  const counts = useMemo(() => ({
    total: rows.length,
    completed: rows.filter((row) => row.feedbackStatus === "completed").length,
    attention: rows.reduce((sum, row) => sum + Number(row.requiresAttentionCount || 0), 0),
    pending: rows.filter((row) => row.feedbackStatus === "pending" || row.feedbackStatus === "partial").length,
  }), [rows]);

  function addFilter(key: ExtraFilterKey) {
    setExtraFilters((current) => current.includes(key) ? current : [...current, key]);
  }

  function removeFilter(key: ExtraFilterKey) {
    setExtraFilters((current) => current.filter((item) => item !== key));
    if (key === "kind") setFilters((current) => ({ ...current, reportKind: "" }));
    if (key === "product") setFilters((current) => ({ ...current, product: "" }));
    if (key === "treatment") setFilters((current) => ({ ...current, treatmentStatus: "" }));
    if (key === "attention") setFilters((current) => ({ ...current, requiresAttention: false }));
  }

  async function exportReport(report: ReportFeedbackRow, type: "contributions" | "deposits" | "feedback") {
    if (!scope || exportingReportId) return;
    setExportingReportId(report.id);
    setError("");
    try {
      const blob = await reportFeedbackApi.exportReport(scope.organizationId, scope.employerId, report.id, type);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const suffix = type === "contributions" ? "contributions" : type === "deposits" ? "deposits" : "feedback";
      anchor.href = url;
      anchor.download = `alpha-${report.reportingMonth.slice(0, 7)}-${suffix}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ייצוא הדוח נכשל");
    } finally {
      setExportingReportId("");
    }
  }

  async function editDepositFromFeedback(report: ReportFeedbackRow, reportProductId: string, employeeName: string) {
    if (!scope) return;
    setError("");
    try {
      const page = await manualDepositsApi.list(scope.organizationId, scope.employerId, report.id, employeeName, 0, 100);
      const deposit = page.items.find((item) => item.id === reportProductId);
      if (!deposit) throw new Error("לא ניתן היה לטעון את פרטי ההפקדה לעריכה.");
      setSelectedDeposit(null);
      setEditingDeposit({ report, deposit });
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת פרטי ההפקדה לעריכה נכשלה");
    }
  }

  const allColumns = useMemo<Record<ColumnKey, { column: DataTableColumn; render: (row: ReportFeedbackRow) => ReactNode }>>(() => ({
    month: { column: { key: "month", label: "חודש", width: "110px" }, render: (row) => <strong>{formatMonth(row.reportingMonth)}</strong> },
    kind: { column: { key: "kind", label: "סוג דיווח", width: "110px" }, render: (row) => kindLabel(row.reportKind) },
    employees: { column: { key: "employees", label: "עובדים", width: "90px" }, render: (row) => row.employeeCount },
    total: { column: { key: "total", label: "סכום דיווח", width: "130px" }, render: (row) => <span className="report-money">{money(row.totalAmount)}</span> },
    status: { column: { key: "status", label: "מצב דיווח", width: "165px" }, render: (row) => <StatusBadge status={row.feedbackStatus} /> },
    attention: { column: { key: "attention", label: "דורש טיפול", width: "115px" }, render: (row) => row.requiresAttentionCount > 0 ? <span className="report-feedback-error-count">{row.requiresAttentionCount}</span> : "—" },
    payoff: { column: { key: "payoff", label: "שיעור פירעון", width: "120px" }, render: (row) => row.payoffRate == null ? "—" : <strong>{row.payoffRate.toLocaleString("he-IL", { maximumFractionDigits: 2 })}%</strong> },
    transmission: { column: { key: "transmission", label: "שידור אחרון", width: "180px" }, render: (row) => row.lastTransmission
      ? <div className="report-feedback-transmission"><span>{row.lastTransmission.provider}</span><small>{formatDate(row.lastTransmission.completedAt ?? row.lastTransmission.sentAt ?? row.lastTransmission.startedAt)}</small></div>
      : "—" },
    actions: { column: { key: "actions", label: "", width: "110px" }, render: (row) => <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
      setExpandedKeys((previous) => {
        const next = new Set(previous);
        if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
        return next;
      });
      if (!expandedContent[row.id]) void loadExpanded(row);
    }}><Eye size={15} />פרטים</button> },
  }), [expandedContent, scope]);

  const activeColumns = visibleColumns.map((key) => allColumns[key].column);

  return <AppShell title="דיווחים ומשובים">
    <div className="page-head">
      <div>
        <h1>דיווחים ומשובים</h1>
        <p>מעקב, משוב, מצב כספים וטיפול ידני — במקום אחד.</p>
      </div>
      <div className="report-page-actions">
        <button className="btn btn-secondary" type="button" onClick={() => void load()} disabled={!scope || loading}>
          <RefreshCw size={16} />רענון
        </button>
        <Link className="btn btn-primary" href="/reports/new"><Plus size={16} />דיווח חדש</Link>
      </div>
    </div>

    {!scope ? <div className="notice notice-info">יש לבחור ארגון ומעסיק בבורר העליון כדי לצפות בדיווחים.</div> : null}
    {error ? <div className="notice notice-error report-page-error">{error}</div> : null}

    <div className="report-feedback-summary">
      <div className="card"><strong>{counts.total}</strong><span>דיווחים בתצוגה</span></div>
      <div className="card"><strong>{counts.completed}</strong><span>הושלמו</span></div>
      <div className="card"><strong>{counts.attention}</strong><span>שורות דורשות טיפול</span></div>
      <div className="card"><strong>{counts.pending}</strong><span>ממתינים למשוב</span></div>
    </div>

    <section className="report-filter-shell" aria-label="סינון דיווחים">
      <div className="report-filter-main">
        <label className="report-filter-field month-filter"><span>חודש</span>
          <UiDateInput mode="month" value={filters.month ?? ""} onValueChange={(value) => setFilters((current) => ({ ...current, month: value }))} />
        </label>
        <label className="report-filter-field status-filter"><span>סטטוס</span>
          <UiSelect value={filters.status ?? "all"} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ReportFeedbackStatus }))}>
            {statusFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </UiSelect>
        </label>
        <label className="report-filter-field search-filter"><span>חיפוש</span>
          <div className="report-search-control"><Search size={16} /><UiInput value={filters.search ?? ""} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="עובד, ת״ז, מוצר או פוליסה" maxLength={100} /></div>
        </label>

        {extraFilters.includes("kind") ? <label className="report-filter-field removable"><span>סוג דיווח<button type="button" onClick={() => removeFilter("kind")} aria-label="הסרת פילטר סוג דיווח"><X size={13} /></button></span>
          <UiSelect value={filters.reportKind ?? ""} onChange={(event) => setFilters((current) => ({ ...current, reportKind: event.target.value }))}>
            <option value="">הכל</option>
            {reportKindOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </UiSelect>
        </label> : null}

        {extraFilters.includes("product") ? <label className="report-filter-field removable"><span>יצרן / מוצר<button type="button" onClick={() => removeFilter("product")} aria-label="הסרת פילטר מוצר"><X size={13} /></button></span>
          <UiInput value={filters.product ?? ""} onChange={(event) => setFilters((current) => ({ ...current, product: event.target.value }))} placeholder="שם יצרן או מוצר" maxLength={100} />
        </label> : null}

        {extraFilters.includes("treatment") ? <label className="report-filter-field removable"><span>סטטוס טיפול<button type="button" onClick={() => removeFilter("treatment")} aria-label="הסרת פילטר סטטוס טיפול"><X size={13} /></button></span>
          <UiSelect value={filters.treatmentStatus ?? ""} onChange={(event) => setFilters((current) => ({ ...current, treatmentStatus: event.target.value }))}>
            <option value="">הכל</option>
            {treatmentStatuses.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </UiSelect>
        </label> : null}

        {extraFilters.includes("attention") ? <label className="report-attention-filter removable">
          <span>דורש טיפול<button type="button" onClick={() => removeFilter("attention")} aria-label="הסרת פילטר דורש טיפול"><X size={13} /></button></span>
          <span className="report-checkbox-line"><UiCheckbox checked={Boolean(filters.requiresAttention)} onChange={(event) => setFilters((current) => ({ ...current, requiresAttention: event.target.checked }))} />רק דיווחים עם חריגות</span>
        </label> : null}
      </div>

      <div className="report-view-controls">
        <details className="report-control-menu">
          <summary className="btn btn-secondary"><Filter size={15} />הוסף פילטר</summary>
          <div className="report-control-menu-panel">
            {([
              ["kind", "סוג דיווח"],
              ["product", "יצרן / מוצר"],
              ["treatment", "סטטוס טיפול"],
              ["attention", "דורש טיפול"],
            ] as Array<[ExtraFilterKey, string]>).map(([key, label]) =>
              <button type="button" key={key} disabled={extraFilters.includes(key)} onClick={() => addFilter(key)}>{label}</button>)}
          </div>
        </details>

        <details className="report-control-menu">
          <summary className="btn btn-secondary"><Columns3 size={15} />עמודות</summary>
          <div className="report-control-menu-panel column-menu">
            {columnOptions.map((item) => <label key={item.key}>
              <UiCheckbox
                checked={visibleColumns.includes(item.key)}
                disabled={item.key === "actions"}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...visibleColumns, item.key]
                    : visibleColumns.filter((key) => key !== item.key);
                  persistColumns(next);
                }}
              />
              {item.label}
            </label>)}
          </div>
        </details>
      </div>
    </section>

    <div className="card report-table-card">
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
        expandToggleColumnKey="actions"
        expandedRowKeys={expandedKeys}
        expandedRowComponentSize={430}
        onExpandedRowChange={(key, expanded, report) => {
          setExpandedKeys((previous) => {
            const next = new Set(previous);
            if (expanded) next.add(key); else next.delete(key);
            return next;
          });
          if (expanded) void loadExpanded(report);
        }}
        expandedRowComponent={(report) => <div className="report-deposits-expanded">
          {expandedLoading[report.id] ? <div className="empty">טוען הפקדות ומשובים...</div> : null}
          {expandedErrors[report.id] ? <div className="notice notice-error">
            {expandedErrors[report.id]}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void loadExpanded(report, true)}>נסה שוב</button>
          </div> : null}
          {expandedContent[report.id] ? <DepositFeedbackPanel
            report={report}
            content={expandedContent[report.id]}
            onOpen={(deposit) => setSelectedDeposit({ report, deposit })}
            loadingMore={Boolean(expandedMoreLoading[report.id])}
            onLoadMore={() => void loadMoreDeposits(report)}
            onExport={(type) => void exportReport(report, type)}
            exporting={exportingReportId === report.id}
            onStartCorrection={() => router.push(`/reports/new?sourceReportId=${report.id}&sourceMonth=${report.reportingMonth.slice(0, 7)}`)}
          /> : null}
        </div>}
        columns={activeColumns}
        renderCells={(row) => visibleColumns.map((key) => <span key={key} className="report-cell-content">{allColumns[key].render(row)}</span>)}
      />
    </div>

    {selectedDeposit && scope ? <ReportDepositFeedbackModal
      organizationId={scope.organizationId}
      employerId={scope.employerId}
      reportId={selectedDeposit.report.id}
      reportProductId={selectedDeposit.deposit.id}
      onClose={() => setSelectedDeposit(null)}
      onTreatmentSaved={() => {
        setExpandedContent((current) => {
          const next = { ...current };
          delete next[selectedDeposit.report.id];
          return next;
        });
        void loadExpanded(selectedDeposit.report, true);
        void load();
      }}
      onEditDeposit={(details) => void editDepositFromFeedback(selectedDeposit.report, details.product.id, details.employee.name)}
      onStartCorrection={(details) => {
        setSelectedDeposit(null);
        router.push(`/reports/new?sourceReportId=${details.report.id}&sourceProductId=${details.product.id}&sourceMonth=${details.report.reportingMonth.slice(0, 7)}`);
      }}
    /> : null}

    {editingDeposit && scope ? <DepositPaymentEditor
      key={editingDeposit.deposit.id}
      employer={null}
      organizationId={scope.organizationId}
      employerId={scope.employerId}
      reportId={editingDeposit.report.id}
      row={editingDeposit.deposit}
      readOnly={false}
      onEvidenceChanged={() => {}}
      onClose={() => setEditingDeposit(null)}
      onSaved={(updated) => {
        setEditingDeposit(null);
        setExpandedContent((current) => {
          const next = { ...current };
          delete next[editingDeposit.report.id];
          return next;
        });
        void loadExpanded(editingDeposit.report, true);
        void load();
      }}
    /> : null}
  </AppShell>;
}
