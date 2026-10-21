import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock3, Download, Pencil, RefreshCw, Trash2 } from "lucide-react";
import type { DataTableColumn } from "@/components/ui/data-table";
import { UiActionMenu } from "@/components/ui/ui-controls";
import { FeedbackErrorsButton } from "@/features/feedback/components/feedback-errors-button";
import { StatusBadge, FeedbackWaitingTooltip } from "@/features/feedback/components/feedback-status";
import type { ReportFeedbackRow } from "@/features/feedback/api";
import { formatDateTimeDDMMYYYY, formatReportingMonth } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/number";
import { reportKindLabel } from "../../labels";
import type { ColumnKey } from "./reports-view-model";
import type { useReportActions } from "../../hooks/use-report-actions";

export function useReportColumns(visibleColumns: ColumnKey[], actions: ReturnType<typeof useReportActions>, hasInlineErrors: boolean) {
  const router = useRouter();
  const { setFeedbackModal, correctionBusyId, resumeHybridTransmission, openCorrectionWorkspace,
    setRetransmitReport, setDeleteReport, exportingReportId, exportReport } = actions;
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
    actions: { column: { key: "actions", label: "פעולות", width: hasInlineErrors ? "190px" : "86px" }, render: (row, expandToggle) => <div className="report-row-actions">
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

  return { allColumns, activeColumns };
}
