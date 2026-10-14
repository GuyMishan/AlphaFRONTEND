"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock3, Columns3, Download, Filter, Plus, Pencil, RefreshCw, Search, Trash2, X } from "lucide-react";
import { AppShell } from "@/features/shell/components/app-shell";
import { AppModal } from "@/components/ui/app-modal";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DepositPaymentEditor } from "@/features/reporting/components/deposit-payment-editor";
import { ReportFeedbackModal, type ReportFeedbackModalMode } from "@/features/feedback/components/report-feedback-modal";
import { FeedbackErrorsButton } from "@/features/feedback/components/feedback-errors-button";
import { UiActionMenu, UiCheckbox, UiDateInput, UiInput, UiSelect } from "@/components/ui/ui-controls";
import { manualDepositsApi, type ManualDepositContributionLimit, type ManualDepositRow } from "@/features/reporting/deposits-api";
import { derivedReportsApi } from "@/features/reporting/derived-reports-api";
import { reportTransmissionApi } from "@/features/reporting/transmission-api";
import { manualReportsApi } from "@/features/reporting/api";
import { getEmployerSelection } from "@/lib/session/storage";
import { reportFeedbackApi, type ReportFeedbackDepositRow, type ReportFeedbackFilters, type ReportFeedbackRow, type ReportFeedbackStatus, type ReportFeedbackSummary } from "@/features/feedback/api";
import { formatDateTimeDDMMYYYY } from "@/lib/format/date";
import { subscribeToScopeChanges, type ScopeChange } from "@/features/scope/scope-events";
import { formatMoney } from "@/lib/format/number";
import { formatReportingMonth } from "@/lib/format/date";
import { reportKindLabel } from "@/features/reporting/labels";
import { StatusBadge, FeedbackWaitingTooltip } from "@/features/feedback/components/feedback-status";
import { DepositFeedbackPanel, type ExpandedReportContent } from "@/features/feedback/components/deposit-feedback-panel";
import "./reports-screen.css";
import { useQueryClient } from "@tanstack/react-query";
import { feedbackKeys, useEmployerFeedbackContext, useReportFeedbackList, useTreatmentStatuses } from "@/features/feedback/queries";
import { useReferenceOptions } from "@/features/reference-data/queries";
import { errorMessage } from "@/lib/api/error-messages";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { LoadingState } from "@/components/loading/loading-state";
import { PageHeader } from "@/components/layout/page-header";

const REPORTS_PAGE_SIZE = 100;
const EMPTY_SUMMARY: ReportFeedbackSummary = { total: 0, completed: 0, attention: 0, pending: 0 };

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


export default function ReportsPage() {
  const router = useRouter();
  const [scope, setScope] = useState<{ organizationId: string; employerId: string } | null>(null);
  const [filters, setFilters] = useState<ReportFeedbackFilters>({ status: "all" });
  const [extraFilters, setExtraFilters] = useState<ExtraFilterKey[]>([]);
  const [error, setError] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(new Set());
  const [expandedContent, setExpandedContent] = useState<Record<string, ExpandedReportContent>>({});
  const [expandedLoading, setExpandedLoading] = useState<Record<string, boolean>>({});
  const [expandedErrors, setExpandedErrors] = useState<Record<string, string>>({});
  const [expandedMoreLoading, setExpandedMoreLoading] = useState<Record<string, boolean>>({});
  const [expandedManufacturerInput, setExpandedManufacturerInput] = useState<Record<string, string>>({});
  const [expandedManufacturerFilter, setExpandedManufacturerFilter] = useState<Record<string, string>>({});
  const expandedRequests = useRef(new Map<string, symbol>());
  const [feedbackModal, setFeedbackModal] = useState<{
    mode: ReportFeedbackModalMode;
    report?: ReportFeedbackRow;
    deposit?: ReportFeedbackDepositRow;
    depositView?: "details" | "errors";
    resolveOnOpen?: boolean;
  } | null>(null);
  const [editingDeposit, setEditingDeposit] = useState<{
    report: ReportFeedbackRow;
    sourceDeposit: ReportFeedbackDepositRow;
    editReportId: string;
    deposit: ManualDepositRow;
    contributionLimits: ManualDepositContributionLimit[];
    resolutionProblemIds: string[];
  } | null>(null);
  const [retransmitReport, setRetransmitReport] = useState<ReportFeedbackRow | null>(null);
  const [deleteReport, setDeleteReport] = useState<ReportFeedbackRow | null>(null);
  const [correctionBusyId, setCorrectionBusyId] = useState("");
  const [deletingReportId, setDeletingReportId] = useState("");
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

  async function loadExpanded(report: ReportFeedbackRow, force = false, manufacturerOverride?: string) {
    if (!scope || (!force && (expandedRequests.current.has(report.id) || expandedContent[report.id]))) return;
    const request = Symbol();
    expandedRequests.current.set(report.id, request);
    setExpandedLoading((previous) => ({ ...previous, [report.id]: true }));
    setExpandedErrors((previous) => ({ ...previous, [report.id]: "" }));
    try {
      const manufacturer = manufacturerOverride ?? expandedManufacturerFilter[report.id] ?? "";
      const deposits = await reportFeedbackApi.deposits(
        scope.organizationId, scope.employerId, report.id, "", 0, 100, manufacturer,
      );
      if (expandedRequests.current.get(report.id) !== request) return;
      setExpandedContent((previous) => ({
        ...previous,
        [report.id]: {
          deposits: deposits.items,
          hasMore: deposits.hasMore,
          manufacturers: deposits.manufacturers,
        },
      }));
    } catch (err) {
      if (expandedRequests.current.get(report.id) === request)
        setExpandedErrors((previous) => ({ ...previous, [report.id]: errorMessage(err, "טעינת ההפקדות נכשלה") }));
    } finally {
      if (expandedRequests.current.get(report.id) === request) {
        expandedRequests.current.delete(report.id);
        setExpandedLoading((previous) => ({ ...previous, [report.id]: false }));
        setExpandedMoreLoading((previous) => ({ ...previous, [report.id]: false }));
      }
    }
  }

  async function loadMoreDeposits(report: ReportFeedbackRow) {
    if (!scope || expandedRequests.current.has(report.id) || expandedMoreLoading[report.id] || !expandedContent[report.id]?.hasMore) return;
    const request = Symbol();
    expandedRequests.current.set(report.id, request);
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
      if (expandedRequests.current.get(report.id) !== request) return;
      setExpandedContent((previous) => ({
        ...previous,
        [report.id]: {
          deposits: [...previous[report.id].deposits, ...next.items],
          hasMore: next.hasMore,
          manufacturers: next.manufacturers,
        },
      }));
    } catch (err) {
      if (expandedRequests.current.get(report.id) === request)
        setExpandedErrors((previous) => ({ ...previous, [report.id]: errorMessage(err, "טעינת הפקדות נוספות נכשלה") }));
    } finally {
      if (expandedRequests.current.get(report.id) === request) {
        expandedRequests.current.delete(report.id);
        setExpandedMoreLoading((previous) => ({ ...previous, [report.id]: false }));
      }
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


  // The reports grid is server state: one query per (employer, filters); search is debounced.
  const queryClient = useQueryClient();
  const debouncedSearch = useDebouncedValue(filters.search ?? "", 300);
  const listFilters = useMemo(() => ({ ...filters, search: debouncedSearch || undefined }), [filters, debouncedSearch]);
  const listQuery = useReportFeedbackList(scope?.organizationId ?? "", scope?.employerId ?? "", listFilters, REPORTS_PAGE_SIZE);
  const rows = useMemo(() => {
    const seen = new Set<string>();
    return (listQuery.data?.pages ?? []).flatMap((page) => page.items).filter((row) => !seen.has(row.id) && Boolean(seen.add(row.id)));
  }, [listQuery.data]);
  const summary: ReportFeedbackSummary = listQuery.data?.pages.at(-1)?.summary ?? EMPTY_SUMMARY;
  const hasMoreReports = Boolean(listQuery.hasNextPage);
  const loading = listQuery.isFetching && !listQuery.isFetchingNextPage;
  const loadingMoreReports = listQuery.isFetchingNextPage;
  const employerIssueCount = useEmployerFeedbackContext(scope?.organizationId ?? "", scope?.employerId ?? "").data?.issues.length ?? 0;
  const treatmentStatuses = useTreatmentStatuses(scope?.organizationId ?? "", scope?.employerId ?? "").data ?? [];
  const reportKindOptions = useReferenceOptions("manual-report-kind", "all", Boolean(scope)).data ?? [];
  const listError = listQuery.error ? errorMessage(listQuery.error, "טעינת הדיווחים נכשלה") : "";

  /** Reloads the grid (and the employer issues) after actions that change reports. */
  async function load() {
    if (!scope) return;
    setError("");
    await queryClient.invalidateQueries({ queryKey: feedbackKeys.employer(scope.organizationId, scope.employerId) });
  }

  async function loadMoreReports() {
    if (!scope || !hasMoreReports || loading || loadingMoreReports) return;
    await listQuery.fetchNextPage();
  }

  useEffect(() => {
    const requests = expandedRequests.current;
    const initial = getEmployerSelection();
    if (initial) setScope(initial);
    const handler = (detail: ScopeChange) => {
      setScope(detail.employerId ? { organizationId: detail.organizationId, employerId: detail.employerId } : null);
      setFilters({ status: "all" });
      setExtraFilters([]);
      setFeedbackModal(null);
      setEditingDeposit(null);
      setRetransmitReport(null);
      setDeleteReport(null);
      setExpandedKeys(new Set());
      setExpandedContent({});
      setExpandedErrors({});
      setExpandedLoading({});
      setExpandedMoreLoading({});
      setExpandedManufacturerInput({});
      setExpandedManufacturerFilter({});
      requests.clear();
    };
    const unsubscribeScope = subscribeToScopeChanges(handler);
    return () => { unsubscribeScope(); requests.clear(); };
  }, []);



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
      setError(errorMessage(err, "ייצוא הדוח נכשל"));
    } finally {
      setExportingReportId("");
    }
  }

  async function editDepositFromFeedback(
    report: ReportFeedbackRow,
    sourceDeposit: ReportFeedbackDepositRow,
    resolutionProblemIds: string[] = [],
  ) {
    const reportProductId = sourceDeposit.id;
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
      setFeedbackModal(null);
      setEditingDeposit({
        report,
        sourceDeposit,
        editReportId,
        deposit,
        contributionLimits: page.contributionLimits,
        resolutionProblemIds,
      });
    } catch (err) {
      setError(errorMessage(err, "טעינת פרטי ההפקדה לעריכה נכשלה"));
    } finally {
      setCorrectionBusyId("");
    }
  }

  async function resumeHybridTransmission(report: ReportFeedbackRow) {
    if (!scope || correctionBusyId || !report.canResumeHybrid) return;
    setCorrectionBusyId(report.id);
    setError("");
    try {
      await reportTransmissionApi.resumeHybrid(
        scope.organizationId, scope.employerId, report.id,
      );
      await load();
    } catch (err) {
      setError(errorMessage(err, "המשך השידור ליצרנים נכשל."));
      await load();
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
      setError(errorMessage(err, "פתיחת תיקון הדיווח נכשלה"));
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
      setError(errorMessage(err, "יצירת הדיווח החוזר נכשלה"));
    } finally {
      setCorrectionBusyId("");
    }
  }

  async function removeDraft(report: ReportFeedbackRow) {
    if (!scope || deletingReportId) return;
    setDeletingReportId(report.id);
    setError("");
    try {
      await manualReportsApi.deleteManualReport(scope.organizationId, scope.employerId, report.id);
      expandedRequests.current.delete(report.id);
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
      setError(errorMessage(err, "מחיקת הטיוטה נכשלה"));
    } finally {
      setDeletingReportId("");
    }
  }

  const allColumns: Record<ColumnKey, { column: DataTableColumn; render: (row: ReportFeedbackRow, expandToggle?: ReactNode) => ReactNode }> = {
    employer: { column: { key: "employer", label: "מעסיק", width: "170px" }, render: (row) => <strong>{row.employerName || "—"}</strong> },
    month: { column: { key: "month", label: "חודש", width: "110px" }, render: (row) => <strong>{formatReportingMonth(row.reportingMonth)}</strong> },
    kind: { column: { key: "kind", label: "סוג דיווח", width: "110px" }, render: (row) => reportKindLabel(row.reportKind) },
    employees: { column: { key: "employees", label: "עובדים", width: "90px" }, render: (row) => row.employeeCount },
    total: { column: { key: "total", label: "סכום דיווח", width: "130px" }, render: (row) => <span className="report-money">{formatMoney(row.totalAmount)}</span> },
    status: { column: { key: "status", label: "מצב דיווח", width: "165px" }, render: (row) => <div className="report-status-with-waiting">
      {row.hybridTransmission?.uncertainCount
      ? <span className="report-feedback-badge attention" role="alert"><AlertTriangle size={15} />שידור לא ודאי — נדרש בירור</span>
      : row.hybridTransmission && row.hybridTransmission.acceptedCount < row.hybridTransmission.recipientCount
        ? <span className="report-feedback-badge partial" role="status"><Clock3 size={15} />שידור ליצרנים: {row.hybridTransmission.acceptedCount}/{row.hybridTransmission.recipientCount}</span>
        : row.correctionResolutionStatus === "transmitted-awaiting-feedback"
      ? <span className="report-feedback-badge pending" role="status"><Clock3 size={15} />טופל ושודר — ממתין למשוב</span>
      : row.correctionResolutionStatus === "feedback-returned-needs-review"
        ? <span className="report-feedback-badge attention" role="alert"><AlertTriangle size={15} />משוב חוזר — נדרשת בדיקה</span>
        : <div>
          <StatusBadge status={row.feedbackStatus} />
          {row.correctionResolutionStatus === "correction-in-progress"
            ? <small>תיקון בתהליך</small> : null}
        </div>}
      <FeedbackWaitingTooltip row={row} />
    </div> },
    attention: { column: { key: "attention", label: "דורש טיפול", width: "115px" }, render: (row) => row.requiresAttentionCount > 0 ? <span className="report-feedback-error-count">{row.requiresAttentionCount}</span> : "—" },
    payoff: { column: { key: "payoff", label: "שיעור פירעון", width: "120px" }, render: (row) => row.payoffRate == null ? "—" : <strong>{row.payoffRate.toLocaleString("he-IL", { maximumFractionDigits: 2 })}%</strong> },
    transmission: { column: { key: "transmission", label: "שידור אחרון", width: "180px" }, render: (row) => row.lastTransmission
      ? <div className="report-feedback-transmission"><span>{row.lastTransmission.provider}</span><small>{formatDateTimeDDMMYYYY(row.lastTransmission.completedAt ?? row.lastTransmission.sentAt ?? row.lastTransmission.startedAt, "—")}</small></div>
      : "—" },
    actions: { column: { key: "actions", label: "פעולות", width: "210px" }, render: (row, expandToggle) => <div className="report-row-actions">
      {!row.canEdit && row.reportIssueCount > 0 ? <FeedbackErrorsButton
        compact
        label={`שגיאות · ${row.reportIssueCount}`}
        onClick={() => setFeedbackModal({ mode: "report", report: row })}
      /> : null}
      <UiActionMenu
        ariaLabel={`פעולות לדיווח ${formatReportingMonth(row.reportingMonth)}`}
        items={[
          ...(row.canEdit ? [{
            key: "edit",
            label: "עריכת הדיווח",
            icon: <Pencil size={16} />,
            onSelect: () => router.push(`/reports/new?resumeReportId=${row.id}`),
          }] : []),
          ...(row.canResumeHybrid ? [{
            key: "resume-hybrid-transmission",
            label: "המשך שידור ליצרנים שטרם נקלטו",
            icon: <RefreshCw size={16} />,
            disabled: correctionBusyId === row.id,
            onSelect: () => void resumeHybridTransmission(row),
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
      {expandToggle}
    </div> },
  };

  const activeColumns = visibleColumns.map((key) => allColumns[key].column);

  return <AppShell title="דיווחים ומשובים">
    <PageHeader title="דיווחים ומשובים" description="מעקב, משוב, מצב כספים וטיפול ידני — במקום אחד."
      actions={<div className="report-page-actions">
        {scope && employerIssueCount > 0 ? <button
          type="button"
          className="employer-error-section"
          onClick={() => setFeedbackModal({ mode: "employer", resolveOnOpen: true })}
          aria-label={`שגיאות מעסיק · ${employerIssueCount}`}
        >
          <AlertTriangle size={18} aria-hidden="true" />
          <span><b>שגיאות מעסיק</b><small>{employerIssueCount} {employerIssueCount === 1 ? "שגיאה דורשת טיפול" : "שגיאות דורשות טיפול"}</small></span>
          <span className="employer-error-section-cta">פתור בעיות</span>
        </button> : null}
        <button className="btn btn-secondary" type="button" onClick={() => void load()} disabled={!scope || loading}>
          <RefreshCw size={16} />רענון
        </button>
        <Link className="btn btn-primary" href="/reports/new"><Plus size={16} />דיווח חדש</Link>
      </div>} />

    {!scope ? <div className="notice notice-info">יש לבחור ארגון ומעסיק בבורר העליון כדי לצפות בדיווחים.</div> : null}
    {error || listError ? <div className="notice notice-error report-page-error">{error || listError}</div> : null}

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
        embedExpandToggle
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
          {expandedLoading[report.id] && !expandedContent[report.id] ? <LoadingState compact label="טוען הפקדות ומשובים..." /> : null}
          {expandedErrors[report.id] ? <div className="notice notice-error">
            {expandedErrors[report.id]}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void loadExpanded(report, true)}>נסה שוב</button>
          </div> : null}
          {expandedContent[report.id] ? <DepositFeedbackPanel
            content={expandedContent[report.id]}
            onOpen={(deposit, depositView) => setFeedbackModal({ mode: "deposit", report, deposit, depositView })}
            loading={Boolean(expandedLoading[report.id])}
            loadingMore={Boolean(expandedMoreLoading[report.id])}
            onLoadMore={() => void loadMoreDeposits(report)}
            manufacturerValue={expandedManufacturerInput[report.id] ?? ""}
            onManufacturerValueChange={(value) => changeExpandedManufacturer(report, value)}
          /> : null}
        </div>}
        columns={activeColumns}
        renderCells={(row, expandToggle) => visibleColumns.map((key) => <span key={key} className="report-cell-content">{allColumns[key].render(row, key === "actions" ? expandToggle : undefined)}</span>)}
      />
    </div>

    {feedbackModal && scope ? <ReportFeedbackModal
      mode={feedbackModal.mode}
      organizationId={scope.organizationId}
      employerId={scope.employerId}
      reportId={feedbackModal.report?.id}
      reportProductId={feedbackModal.deposit?.id}
      hasFeedback={feedbackModal.deposit?.hasFeedback ?? false}
      depositView={feedbackModal.depositView ?? "details"}
      resolveOnOpen={feedbackModal.resolveOnOpen ?? false}
      onClose={() => setFeedbackModal(null)}
      onEditDeposit={feedbackModal.mode === "deposit"
        && feedbackModal.report
        && feedbackModal.deposit
        && (feedbackModal.report.canEdit || feedbackModal.report.canStartCorrectionWorkspace)
        ? (problemIds = []) => {
            const report = feedbackModal.report!;
            const deposit = feedbackModal.deposit!;
            setFeedbackModal(null);
            void editDepositFromFeedback(report, deposit, problemIds);
          }
        : undefined}
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
      onSaved={async () => {
        const sourceReport = editingDeposit.report;
        const sourceDeposit = editingDeposit.sourceDeposit;
        const problemIds = editingDeposit.resolutionProblemIds;
        try {
          if (problemIds.length) {
            await reportFeedbackApi.resolveProblems(
              scope.organizationId,
              scope.employerId,
              sourceReport.id,
              problemIds,
              "deposit-save",
              editingDeposit.editReportId,
            );
          }
          setEditingDeposit(null);
          setExpandedContent((current) => {
            const next = { ...current };
            delete next[sourceReport.id];
            return next;
          });
          await Promise.all([loadExpanded(sourceReport, true), load()]);
          if (problemIds.length) {
            setFeedbackModal({
              mode: "deposit",
              report: sourceReport,
              deposit: sourceDeposit,
              depositView: "errors",
              resolveOnOpen: true,
            });
          }
        } catch (err) {
          setError(errorMessage(err, "ההפקדה נשמרה אך סימון התקלה כמתוקנת נכשל."));
          setEditingDeposit(null);
          void loadExpanded(sourceReport, true);
          void load();
        }
      }}
    /> : null}

    {retransmitReport ? <AppModal
      title="דיווח חוזר"
      subtitle={`${retransmitReport.employerName} · ${formatReportingMonth(retransmitReport.reportingMonth)}`}
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
      subtitle={`${deleteReport.employerName} · ${formatReportingMonth(deleteReport.reportingMonth)}`}
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
