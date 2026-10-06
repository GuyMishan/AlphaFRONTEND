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
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppModal } from "@/components/app-modal";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { DepositPaymentEditor } from "@/components/manual-deposit-data";
import { ReportFeedbackModal, type ReportFeedbackModalMode } from "@/components/report-feedback-modal";
import { FeedbackResolveButton } from "@/components/feedback-resolve-button";
import { Tooltip } from "@/components/tooltip";
import { UiActionMenu, UiAutocomplete, UiCheckbox, UiDateInput, UiInput, UiSelect } from "@/components/ui-controls";
import { manualDepositsApi, type ManualDepositContributionLimit, type ManualDepositRow } from "@/lib/manual-deposits-api";
import { derivedReportsApi } from "@/lib/derived-reports-api";
import { alphaApi } from "@/lib/api";
import { getEmployerSelection } from "@/lib/session";
import {
  reportFeedbackApi,
  type ReportFeedbackDepositRow,
  type ReportFeedbackFilters,
  type ReportFeedbackRow,
  type ReportFeedbackStatus,
  type ReportFeedbackSummary,
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
type ColumnKey = "employer" | "month" | "kind" | "employees" | "total" | "status" | "attention" | "payoff" | "transmission" | "actions";

const columnOptions: Array<{ key: ColumnKey; label: string; defaultVisible: boolean }> = [
  { key: "employer", label: "מעסיק", defaultVisible: true },
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

function pensionProductTypeLabel(value: string | number) {
  if (value === 1 || value === "1" || value === "PensionFund") return "פנסיה";
  if (value === 2 || value === "2" || value === "StudyFund") return "השתלמות";
  if (value === 3 || value === "3" || value === "ManagersInsurance") return "ביטוח מנהלים";
  if (value === 4 || value === "4" || value === "ProvidentFund") return "קופת גמל";
  return "אחר";
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
  manufacturers: string[];
};

function DepositStatusBadge({ value, label }: { value: string; label: string }) {
  return <span className={`feedback-state ${value}`}>{label}</span>;
}

function feedbackErrorScopeLabel(scope: keyof ReportFeedbackDepositRow["feedbackErrorSummary"]) {
  switch (scope) {
    case "deposit": return "ברמת הפקדה / מוצר";
    case "employee": return "ברמת עובד";
    case "money": return "ברמת מעסיק";
    case "report": return "ברמת דיווח";
    case "contribution": return "ברמת רכיב הפרשה";
  }
}

function feedbackErrorSummaryRows(deposit: ReportFeedbackDepositRow) {
  const order: Array<keyof ReportFeedbackDepositRow["feedbackErrorSummary"]> = [
    "deposit", "employee", "money", "report", "contribution",
  ];
  return order
    .map((scope) => ({ scope, count: deposit.feedbackErrorSummary?.[scope] ?? 0 }))
    .filter((item) => item.count > 0);
}

function DepositFeedbackPanel({
  report,
  content,
  onOpen,
  onEdit,
  onLoadMore,
  loading,
  loadingMore,
  manufacturerValue,
  onManufacturerValueChange,
}: {
  report: ReportFeedbackRow;
  content: ExpandedReportContent;
  onOpen: (deposit: ReportFeedbackDepositRow) => void;
  onEdit: (deposit: ReportFeedbackDepositRow) => void;
  onLoadMore: () => void;
  loading: boolean;
  loadingMore: boolean;
  manufacturerValue: string;
  onManufacturerValueChange: (value: string) => void;
}) {
  return <div className="report-deposits-panel">
    <div className="report-deposits-heading">
      <div>
        <b>הפקדות בדיווח</b>
        <small>כל שורה מייצגת עובד + מוצר. המשוב, מצב הכספים והטיפול נשארים מחוברים לאותה הפקדה.</small>
      </div>
      <label className="report-deposits-manufacturer-filter">
        <span>סינון לפי יצרן</span>
        <UiAutocomplete
          value={manufacturerValue}
          onValueChange={onManufacturerValueChange}
          options={content.manufacturers
            .filter((manufacturer) => !manufacturerValue || manufacturer.toLocaleLowerCase("he").includes(manufacturerValue.toLocaleLowerCase("he")))
            .map((manufacturer) => ({ value: manufacturer, label: manufacturer }))}
          placeholder="כל היצרנים"
          emptyText="לא נמצא יצרן בדיווח."
          ariaLabel="סינון ההפקדות לפי יצרן"
        />
      </label>
    </div>
    {loading
      ? <div className="empty">טוען הפקדות ומשובים...</div>
      : content.deposits.length === 0
        ? <div className="notice notice-info">לא נמצאו הפקדות משויכות לדיווח.</div>
        : <div className="report-deposits-grid" role="table" aria-label="הפקדות ומשובים לפי עובד ומוצר">
        <div className="report-deposits-header" role="row">
          <span role="columnheader">עובד</span>
          <span role="columnheader">סוג מוצר</span>
          <span role="columnheader">יצרן / מוצר</span>
          <span role="columnheader">סכום</span>
          <span role="columnheader">משוב</span>
          <span role="columnheader">מצב כספים</span>
          <span role="columnheader">סטטוס טיפול</span>
          <span role="columnheader">עודכן</span>
          <span role="columnheader">פעולות</span>
        </div>
        {content.deposits.map((deposit) => <div className="report-deposits-item" role="row" key={deposit.id}>
          <div role="cell"><b>{deposit.employeeName}</b></div>
          <div role="cell">{pensionProductTypeLabel(deposit.productType)}</div>
          <div role="cell">
            <b>{deposit.fundCompanyName || deposit.fundName || "מוצר פנסיוני"}</b>
            <small>{deposit.fundName && deposit.fundCompanyName ? deposit.fundName : deposit.policyNumber || "ללא מספר פוליסה"}</small>
          </div>
          <div role="cell" className="report-deposits-money">{money(deposit.totalAmount)}</div>
          <div role="cell" className="report-deposit-feedback-status-cell">
            <DepositStatusBadge value={deposit.feedbackStatus} label={deposit.feedbackLabel} />
            {deposit.feedbackStatus === "attention" && deposit.feedbackErrors?.length
              ? <Tooltip
                  className="report-deposit-feedback-info"
                  label="פירוט שגיאות במשוב"
                  content={deposit.feedbackErrors.length > 3
                    ? <span className="report-deposit-feedback-error-list">
                        {feedbackErrorSummaryRows(deposit).map(({ scope, count }) =>
                          <span key={scope}>{count} {count === 1 ? "שגיאה" : "שגיאות"} {feedbackErrorScopeLabel(scope)}</span>)}
                      </span>
                    : <span className="report-deposit-feedback-error-list">
                        {deposit.feedbackErrors.map((message, index) =>
                          <span key={`${index}:${message}`}>{message}</span>)}
                      </span>}
                />
              : null}
          </div>
          <div role="cell"><DepositStatusBadge value={deposit.moneyStatus} label={deposit.moneyStatusLabel} /></div>
          <div role="cell">
            {deposit.treatmentStatusLabel
              ? <span className="report-treatment-label">{deposit.treatmentStatusLabel}</span>
              : <span className="muted-inline">לא עודכן</span>}
          </div>
          <div role="cell" className="muted-inline">{formatDate(deposit.updatedAt)}</div>
          <div role="cell" className="report-deposit-row-actions">
            {deposit.feedbackStatus === "attention" ? <FeedbackResolveButton
              compact
              count={deposit.feedbackErrors?.length || undefined}
              label={deposit.feedbackErrors?.length ? `תקלות · ${deposit.feedbackErrors.length}` : "תקלות"}
              onClick={() => onOpen(deposit)}
            /> : null}
            <UiActionMenu
              ariaLabel={`פעולות עבור ${deposit.employeeName}`}
              items={[
                {
                  key: "view",
                  label: "צפייה",
                  icon: <Eye size={16} />,
                  onSelect: () => onOpen(deposit),
                },
                ...(report.canEdit || report.canStartCorrectionWorkspace ? [{
                  key: "edit",
                  label: report.canEdit ? "עריכה" : deposit.hasPendingCorrection ? "המשך תיקון הפקדה" : "תיקון הפקדה",
                  icon: <Pencil size={16} />,
                  onSelect: () => onEdit(deposit),
                }] : []),
              ]}
            />
          </div>
        </div>)}
      </div>}
    {!loading && content.hasMore ? <button className="btn btn-secondary btn-sm report-deposits-load-more" disabled={loadingMore} onClick={onLoadMore}>
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
  const [summary, setSummary] = useState<ReportFeedbackSummary>({ total: 0, completed: 0, attention: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [hasMoreReports, setHasMoreReports] = useState(false);
  const [loadingMoreReports, setLoadingMoreReports] = useState(false);
  const [error, setError] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());
  const [expandedContent, setExpandedContent] = useState<Record<string, ExpandedReportContent>>({});
  const [expandedLoading, setExpandedLoading] = useState<Record<string, boolean>>({});
  const [expandedErrors, setExpandedErrors] = useState<Record<string, string>>({});
  const [expandedMoreLoading, setExpandedMoreLoading] = useState<Record<string, boolean>>({});
  const [expandedManufacturerInput, setExpandedManufacturerInput] = useState<Record<string, string>>({});
  const [expandedManufacturerFilter, setExpandedManufacturerFilter] = useState<Record<string, string>>({});
  const expandedRequests = useRef(new Set<string>());
  const [feedbackModal, setFeedbackModal] = useState<{ mode: ReportFeedbackModalMode; report?: ReportFeedbackRow; deposit?: ReportFeedbackDepositRow } | null>(null);
  const [employerIssueCount, setEmployerIssueCount] = useState(0);
  const [editingDeposit, setEditingDeposit] = useState<{ report: ReportFeedbackRow; editReportId: string; deposit: ManualDepositRow; contributionLimits: ManualDepositContributionLimit[] } | null>(null);
  const [retransmitReport, setRetransmitReport] = useState<ReportFeedbackRow | null>(null);
  const [deleteReport, setDeleteReport] = useState<ReportFeedbackRow | null>(null);
  const [correctionBusyId, setCorrectionBusyId] = useState("");
  const [deletingReportId, setDeletingReportId] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => columnOptions.filter((item) => item.defaultVisible).map((item) => item.key));
  const [exportingReportId, setExportingReportId] = useState("");

  useEffect(() => {
    if (!scope) {
      setEmployerIssueCount(0);
      return;
    }
    let cancelled = false;
    reportFeedbackApi.employerContext(scope.organizationId, scope.employerId)
      .then((result) => { if (!cancelled) setEmployerIssueCount(result.issues.length); })
      .catch(() => { if (!cancelled) setEmployerIssueCount(0); });
    return () => { cancelled = true; };
  }, [scope]);

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

  async function loadExpanded(report: ReportFeedbackRow, force = false, manufacturerOverride?: string) {
    if (!scope || expandedRequests.current.has(report.id) || (!force && expandedContent[report.id])) return;
    expandedRequests.current.add(report.id);
    setExpandedLoading((previous) => ({ ...previous, [report.id]: true }));
    setExpandedErrors((previous) => ({ ...previous, [report.id]: "" }));
    try {
      const manufacturer = manufacturerOverride ?? expandedManufacturerFilter[report.id] ?? "";
      const deposits = await reportFeedbackApi.deposits(
        scope.organizationId, scope.employerId, report.id, "", 0, 100, manufacturer,
      );
      setExpandedContent((previous) => ({
        ...previous,
        [report.id]: {
          deposits: deposits.items,
          hasMore: deposits.hasMore,
          manufacturers: deposits.manufacturers,
        },
      }));
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
        scope.organizationId,
        scope.employerId,
        report.id,
        "",
        current.deposits.length,
        100,
        expandedManufacturerFilter[report.id] ?? "",
      );
      setExpandedContent((previous) => ({
        ...previous,
        [report.id]: {
          deposits: [...previous[report.id].deposits, ...next.items],
          hasMore: next.hasMore,
          manufacturers: next.manufacturers,
        },
      }));
    } catch (err) {
      setExpandedErrors((previous) => ({ ...previous, [report.id]: err instanceof Error ? err.message : "טעינת הפקדות נוספות נכשלה" }));
    } finally {
      setExpandedMoreLoading((previous) => ({ ...previous, [report.id]: false }));
    }
  }

  function changeExpandedManufacturer(report: ReportFeedbackRow, value: string) {
    setExpandedManufacturerInput((previous) => ({ ...previous, [report.id]: value }));

    const normalized = value.trim();
    const manufacturers = expandedContent[report.id]?.manufacturers ?? [];
    const isExactManufacturer = manufacturers.some(
      (manufacturer) => manufacturer.localeCompare(normalized, "he", { sensitivity: "base" }) === 0,
    );
    if (normalized && !isExactManufacturer) return;

    const nextFilter = isExactManufacturer
      ? manufacturers.find((manufacturer) =>
          manufacturer.localeCompare(normalized, "he", { sensitivity: "base" }) === 0) ?? normalized
      : "";
    if ((expandedManufacturerFilter[report.id] ?? "") === nextFilter) return;

    setExpandedManufacturerFilter((previous) => ({ ...previous, [report.id]: nextFilter }));
    void loadExpanded(report, true, nextFilter);
  }

  async function load(nextScope = scope, nextFilters = filters) {
    if (!nextScope) return;
    setLoading(true);
    setError("");
    try {
      const result = await reportFeedbackApi.list(nextScope.organizationId, nextScope.employerId, nextFilters, 0, 100);
      setRows(result.items);
      setSummary(result.summary);
      setHasMoreReports(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת הדיווחים נכשלה");
      setRows([]);
      setSummary({ total: 0, completed: 0, attention: 0, pending: 0 });
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
      setSummary(page.summary);
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
      setRetransmitReport(null);
      setDeleteReport(null);
      setExpandedKeys(new Set());
      setExpandedContent({});
      setExpandedErrors({});
      setExpandedManufacturerInput({});
      setExpandedManufacturerFilter({});
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
      const [year, month] = report.reportingMonth.slice(0, 7).split("-");
      const monthLabel = year && month ? `${month}-${year}` : report.reportingMonth.slice(0, 7);
      const fileLabel = type === "contributions"
        ? "פירוט עובדים והפרשות"
        : type === "deposits"
          ? "סיכום הפקדות"
          : "משוב קופות";
      anchor.href = url;
      anchor.download = `${fileLabel} - ${monthLabel}.xlsx`;
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

  async function editDepositFromFeedback(report: ReportFeedbackRow, reportProductId: string) {
    if (!scope || correctionBusyId) return;
    setError("");
    setCorrectionBusyId(report.id);
    try {
      let editReportId = report.id;
      let editProductId = reportProductId;

      if (!report.canEdit) {
        if (!report.canStartCorrectionWorkspace)
          throw new Error("הדיווח אינו פתוח לעריכה או לתיקון.");
        const workspace = await derivedReportsApi.ensureCorrectionWorkspace(
          scope.organizationId, scope.employerId, report.id, reportProductId,
        );
        if (!workspace.reportProductId)
          throw new Error("לא ניתן היה ליצור גרסת תיקון להפַקדה.");
        editReportId = workspace.reportId;
        editProductId = workspace.reportProductId;
      }

      const page = await manualDepositsApi.list(
        scope.organizationId, scope.employerId, editReportId, "", 0, 1, editProductId,
      );
      const deposit = page.items[0];
      if (!deposit) throw new Error("לא ניתן היה לטעון את פרטי ההפקדה לעריכה.");
      setSelectedDeposit(null);
      setEditingDeposit({ report, editReportId, deposit, contributionLimits: page.contributionLimits });
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת פרטי ההפקדה לעריכה נכשלה");
    } finally {
      setCorrectionBusyId("");
    }
  }

  async function openCorrectionWorkspace(report: ReportFeedbackRow) {
    if (!scope || correctionBusyId) return;
    setError("");
    setCorrectionBusyId(report.id);
    try {
      const workspace = await derivedReportsApi.ensureCorrectionWorkspace(
        scope.organizationId, scope.employerId, report.id,
      );
      router.push(`/reports/new?resumeReportId=${workspace.reportId}&correctionWorkspace=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "פתיחת תיקון הדיווח נכשלה");
    } finally {
      setCorrectionBusyId("");
    }
  }

  async function materializeCorrection() {
    if (!scope || !retransmitReport || !retransmitReport.correctionWorkspaceId || correctionBusyId) return;
    const report = retransmitReport;
    const workspaceId = retransmitReport.correctionWorkspaceId;
    setCorrectionBusyId(report.id);
    setError("");
    try {
      const result = await derivedReportsApi.materializeCorrection(
        scope.organizationId, scope.employerId, workspaceId,
      );
      setRetransmitReport(null);
      if (result.negativeReportId) {
        const followUp = result.currentReportId ? `&followUpReportId=${result.currentReportId}` : "";
        router.push(`/reports/new?resumeReportId=${result.negativeReportId}${followUp}&correctionStage=negative`);
      } else if (result.currentReportId) {
        router.push(`/reports/new?resumeReportId=${result.currentReportId}&correctionStage=current`);
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "יצירת הדיווח החוזר נכשלה");
    } finally {
      setCorrectionBusyId("");
    }
  }

  async function removeDraft(report: ReportFeedbackRow) {
    if (!scope || deletingReportId) return;
    setDeletingReportId(report.id);
    setError("");
    try {
      await alphaApi.deleteManualReport(scope.organizationId, scope.employerId, report.id);
      setDeleteReport(null);
      setExpandedKeys((current) => {
        const next = new Set(current);
        next.delete(report.id);
        return next;
      });
      setExpandedContent((current) => {
        const next = { ...current };
        delete next[report.id];
        return next;
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "מחיקת הטיוטה נכשלה");
    } finally {
      setDeletingReportId("");
    }
  }

  const allColumns = useMemo<Record<ColumnKey, { column: DataTableColumn; render: (row: ReportFeedbackRow) => ReactNode }>>(() => ({
    employer: { column: { key: "employer", label: "מעסיק", width: "170px" }, render: (row) => <strong>{row.employerName || "—"}</strong> },
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
    actions: { column: { key: "actions", label: "פעולות", width: "170px" }, render: (row) => <div className="report-row-actions">
      {row.requiresAttentionCount > 0 ? <FeedbackResolveButton
        compact
        label={`תקלות · ${row.requiresAttentionCount}`}
        onClick={() => setFeedbackModal({ mode: "report", report: row })}
      /> : null}
      <UiActionMenu
        ariaLabel={`פעולות לדיווח ${formatMonth(row.reportingMonth)}`}
        items={[
          ...(row.canEdit ? [{
            key: "edit",
            label: "עריכת הדיווח",
            icon: <Pencil size={16} />,
            onSelect: () => router.push(`/reports/new?resumeReportId=${row.id}`),
          }] : []),
          ...(row.canStartCorrectionWorkspace ? [{
            key: "correct-report",
            label: row.correctionWorkspaceId ? "המשך תיקון דיווח" : "תקן דיווח",
            icon: <Pencil size={16} />,
            disabled: correctionBusyId === row.id,
            onSelect: () => void openCorrectionWorkspace(row),
          }] : []),
          ...(row.pendingCorrectionCount > 0 && row.correctionWorkspaceId ? [{
            key: "retransmit",
            label: "דיווח חוזר",
            icon: <RefreshCw size={16} />,
            disabled: correctionBusyId === row.id,
            onSelect: () => setRetransmitReport(row),
          }] : []),
          ...(row.canCreateCorrection && !row.canStartCorrectionWorkspace ? [{
            key: "correction",
            label: "יצירת דיווח שוטף מתקן",
            icon: <RefreshCw size={16} />,
            onSelect: () => router.push(`/reports/new?sourceReportId=${row.id}&sourceMonth=${row.reportingMonth.slice(0, 7)}&sourceKind=${encodeURIComponent(String(row.reportKind))}`),
          }] : []),
          ...(row.canDelete ? [{
            key: "delete-draft",
            label: "מחיקת טיוטה",
            icon: <Trash2 size={16} />,
            onSelect: () => setDeleteReport(row),
          }] : []),
          {
            key: "export-contributions",
            label: "ייצוא פירוט עובדים והפרשות",
            icon: <Download size={16} />,
            disabled: exportingReportId === row.id,
            separatorBefore: row.canEdit || row.canCreateCorrection || row.canStartCorrectionWorkspace || row.canDelete,
            onSelect: () => void exportReport(row, "contributions"),
          },
          {
            key: "export-deposits",
            label: "ייצוא סיכום הפקדות",
            icon: <Download size={16} />,
            disabled: exportingReportId === row.id,
            onSelect: () => void exportReport(row, "deposits"),
          },
          {
            key: "export-feedback",
            label: "ייצוא משוב קופות",
            icon: <Download size={16} />,
            disabled: exportingReportId === row.id,
            onSelect: () => void exportReport(row, "feedback"),
          },
        ]}
      />
    </div> },
  }), [expandedContent, scope, exportingReportId, correctionBusyId, router]);

  const activeColumns = visibleColumns.map((key) => allColumns[key].column);

  return <AppShell title="דיווחים ומשובים">
    <div className="page-head">
      <div>
        <h1>דיווחים ומשובים</h1>
        <p>מעקב, משוב, מצב כספים וטיפול ידני — במקום אחד.</p>
      </div>
      <div className="report-page-actions">
        {scope ? <FeedbackResolveButton
          label={employerIssueCount > 0 ? `תקלות מעסיק · ${employerIssueCount}` : "משוב מעסיק"}
          onClick={() => setFeedbackModal({ mode: "employer" })}
        /> : null}
        <button className="btn btn-secondary" type="button" onClick={() => void load()} disabled={!scope || loading}>
          <RefreshCw size={16} />רענון
        </button>
        <Link className="btn btn-primary" href="/reports/new"><Plus size={16} />דיווח חדש</Link>
      </div>
    </div>

    {!scope ? <div className="notice notice-info">יש לבחור ארגון ומעסיק בבורר העליון כדי לצפות בדיווחים.</div> : null}
    {error ? <div className="notice notice-error report-page-error">{error}</div> : null}

    <div className="report-feedback-summary">
      <div className="card"><strong>{summary.total}</strong><span>דיווחים בתצוגה</span></div>
      <div className="card"><strong>{summary.completed}</strong><span>הושלמו</span></div>
      <div className="card"><strong>{summary.attention}</strong><span>שורות דורשות טיפול</span></div>
      <div className="card"><strong>{summary.pending}</strong><span>ממתינים למשוב</span></div>
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
        canExpandRow={(report) => report.feedbackStatus !== "not-sent"}
        expandedRowKeys={expandedKeys}
        expandedRowComponentSize={430}
        onExpandedRowChange={(key, expanded, report) => {
          if (report.feedbackStatus === "not-sent") return;
          setExpandedKeys((previous) => {
            const next = new Set(previous);
            if (expanded) next.add(key); else next.delete(key);
            return next;
          });
          if (expanded) void loadExpanded(report);
        }}
        expandedRowComponent={(report) => <div className="report-deposits-expanded">
          {expandedLoading[report.id] && !expandedContent[report.id] ? <div className="empty">טוען הפקדות ומשובים...</div> : null}
          {expandedErrors[report.id] ? <div className="notice notice-error">
            {expandedErrors[report.id]}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void loadExpanded(report, true)}>נסה שוב</button>
          </div> : null}
          {expandedContent[report.id] ? <DepositFeedbackPanel
            report={report}
            content={expandedContent[report.id]}
            onOpen={(deposit) => setFeedbackModal({ mode: "deposit", report, deposit })}
            onEdit={(deposit) => void editDepositFromFeedback(report, deposit.id)}
            loading={Boolean(expandedLoading[report.id])}
            loadingMore={Boolean(expandedMoreLoading[report.id])}
            onLoadMore={() => void loadMoreDeposits(report)}
            manufacturerValue={expandedManufacturerInput[report.id] ?? ""}
            onManufacturerValueChange={(value) => changeExpandedManufacturer(report, value)}
          /> : null}
        </div>}
        columns={activeColumns}
        renderCells={(row) => visibleColumns.map((key) => <span key={key} className="report-cell-content">{allColumns[key].render(row)}</span>)}
      />
    </div>

    {feedbackModal && scope ? <ReportFeedbackModal
      mode={feedbackModal.mode}
      organizationId={scope.organizationId}
      employerId={scope.employerId}
      reportId={feedbackModal.report?.id}
      reportProductId={feedbackModal.deposit?.id}
      hasFeedback={feedbackModal.deposit?.hasFeedback ?? false}
      onClose={() => setFeedbackModal(null)}
    /> : null}

    {editingDeposit && scope ? <DepositPaymentEditor
      key={editingDeposit.deposit.id}
      employer={null}
      organizationId={scope.organizationId}
      employerId={scope.employerId}
      reportId={editingDeposit.editReportId}
      row={editingDeposit.deposit}
      contributionLimits={editingDeposit.contributionLimits}
      readOnly={false}
      onEvidenceChanged={() => {}}
      onClose={() => setEditingDeposit(null)}
      onSaved={() => {
        const sourceReport = editingDeposit.report;
        setEditingDeposit(null);
        setExpandedContent((current) => {
          const next = { ...current };
          delete next[sourceReport.id];
          return next;
        });
        void loadExpanded(sourceReport, true);
        void load();
      }}
    /> : null}

    {retransmitReport ? <AppModal
      title="דיווח חוזר"
      subtitle={`${retransmitReport.employerName} · ${formatMonth(retransmitReport.reportingMonth)}`}
      width="md"
      onClose={() => setRetransmitReport(null)}
      closeDisabled={correctionBusyId === retransmitReport.id}
      actions={<>
        <button className="btn btn-secondary" disabled={Boolean(correctionBusyId)} onClick={() => setRetransmitReport(null)}>ביטול</button>
        <button className="btn btn-primary" disabled={Boolean(correctionBusyId)} onClick={() => void materializeCorrection()}>
          יצירת דיווח חוזר
        </button>
      </>}
    >
      <p style={{ marginTop: 0 }}>ALPHA תשווה את גרסת העבודה לגרסה האפקטיבית האחרונה ותחשב Added / Changed / Removed.</p>
      <div className="notice notice-info">
        ייווצרו רק מסמכי 006 שנדרשים לדלתא: שלילי לרשומות שבוטלו או שונו, ושוטף לרשומות חדשות או מתוקנות. רשומות שלא השתנו לא יישלחו מחדש.
      </div>
    </AppModal> : null}

    {deleteReport ? <AppModal
      title="מחיקת טיוטה"
      subtitle={`${deleteReport.employerName} · ${formatMonth(deleteReport.reportingMonth)}`}
      width="sm"
      onClose={() => setDeleteReport(null)}
      closeDisabled={deletingReportId === deleteReport.id}
      actions={<>
        <button className="btn btn-secondary" disabled={Boolean(deletingReportId)} onClick={() => setDeleteReport(null)}>ביטול</button>
        <button className="btn btn-danger" disabled={Boolean(deletingReportId)} onClick={() => void removeDraft(deleteReport)}>
          <Trash2 size={15} />{deletingReportId ? "מוחק..." : "מחיקת הטיוטה"}
        </button>
      </>}
    >
      <p style={{ marginTop: 0 }}>הטיוטה טרם יצאה מ־ALPHA ולכן ניתן למחוק אותה. לאחר שידור או ניסיון שידור, דיווחים נשמרים בהיסטוריה ולא ניתנים למחיקה.</p>
    </AppModal> : null}
  </AppShell>;
}
