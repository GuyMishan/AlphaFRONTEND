"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { formatDateDDMMYYYY, formatReportingMonth } from "@/lib/format/date";
import { reportKindLabel as kindLabel } from "@/features/reporting/labels";
import type { ResumableManualReport } from "@/features/reporting/types";

function formatDraftUpdate(value: string) {
  const updated = new Date(value);
  if (Number.isNaN(updated.getTime())) return "—";
  const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const today = new Date();
  const todayKey = dayKey(today);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dateLabel = dayKey(updated) === todayKey ? "היום" : dayKey(updated) === dayKey(yesterday)
    ? "אתמול" : formatDateDDMMYYYY(value, "—");
  const time = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false }).format(updated);
  return `${dateLabel} בשעה ${time}`;
}

export function OpenReportDrafts({
  openReports, loadingOpenReports, openReportsHasMore, advancing, deletingDraftId,
  loadMoreOpenReports, onResume, onDelete,
}: {
  openReports: ResumableManualReport[];
  loadingOpenReports: boolean;
  openReportsHasMore: boolean;
  advancing: boolean;
  deletingDraftId: string;
  loadMoreOpenReports: () => Promise<void>;
  onResume: (draft: ResumableManualReport) => void;
  onDelete: (draft: ResumableManualReport) => void;
}) {
  return <div className="resume-report-section">
    <div id="open-report-drafts" className="resume-report-list">
      <h3>טיוטות שניתן להמשיך לערוך</h3>
      <DataTable
        items={openReports}
        rowKey={(draft) => draft.id}
        columns={[
          { key: "kind", label: "סוג דיווח", width: "16%" },
          { key: "month", label: "חודש", width: "12%" },
          { key: "employees", label: "עובדים", width: "10%" },
          { key: "products", label: "מוצרים", width: "10%" },
          { key: "updated", label: "עודכן לאחרונה", width: "27%" },
          { key: "action", label: "פעולה", width: "25%" },
        ]}
        rowHeight={54} maxHeight={340} overscan={5}
        minTableWidth={680}
        loading={loadingOpenReports && openReports.length === 0}
        loadingMore={loadingOpenReports && openReports.length > 0}
        hasMore={openReportsHasMore} onLoadMore={loadMoreOpenReports}
        emptyState="אין כרגע טיוטות פתוחות למעסיק הנבחר."
        renderCells={(draft) => [
          <b key="kind">{kindLabel(draft.reportKind)}</b>,
          <span key="month">{formatReportingMonth(draft.reportingMonth)}</span>,
          <span key="employees">{draft.employeeCount}</span>,
          <span key="products">{draft.productCount}</span>,
          <span key="updated">{formatDraftUpdate(draft.updatedAt)}</span>,
          <div key="action" className="resume-report-actions">
            <button type="button" className="btn btn-primary resume-report-continue"
              disabled={advancing || deletingDraftId === draft.id} onClick={() => onResume(draft)}>
              המשך עריכה <ArrowLeft size={15} />
            </button>
            <button type="button" className="btn btn-danger resume-report-delete" aria-label="מחיקת טיוטה"
              disabled={advancing || Boolean(deletingDraftId)} onClick={() => onDelete(draft)}>
              <Trash2 size={15} />
            </button>
          </div>,
        ]}
      />
    </div>
  </div>;
}
