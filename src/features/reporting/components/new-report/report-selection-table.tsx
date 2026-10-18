"use client";
import type { ReactNode } from "react";
import { DataTable } from "@/components/ui/data-table";
import { UiInput } from "@/components/ui/ui-controls";
import { formatDateDDMMYYYY, formatReportingMonth } from "@/lib/format/date";
import { reportKindLabel } from "../../labels";
import type { ResumableManualReport, SourceManualReport } from "../../types";
type Row = ResumableManualReport | SourceManualReport;
function formatUpdated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dayKey = (day: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(day);
  const today = new Date(), yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const label = dayKey(date) === dayKey(today) ? "היום" : dayKey(date) === dayKey(yesterday) ? "אתמול" : formatDateDDMMYYYY(value, "—");
  const time = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${label} בשעה ${time}`;
}
export function ReportSelectionTable<T extends Row>({ reports, loading, hasMore, onLoadMore, renderActions, emptyState, search, setSearch, onSearch, searchLoading }: {
  reports: T[]; loading: boolean; hasMore: boolean; onLoadMore: () => void | Promise<void>;
  renderActions: (report: T) => ReactNode; emptyState: string;
  search: string; setSearch: (value: string) => void;
  onSearch: () => void; searchLoading?: boolean;
}) {
  return <div>
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <UiInput aria-label="חיפוש לפי חודש" placeholder="חיפוש חודש, למשל 2026-09"
        maxLength={7} value={search} onChange={event => setSearch(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter") onSearch(); }}
        style={{ flex: "1 1 220px" }} />
      <button type="button" className="btn btn-secondary" onClick={onSearch}
        disabled={Boolean(searchLoading)}>חיפוש</button>
    </div>
    <DataTable items={reports} rowKey={report => report.id}
    columns={[
      { key: "kind", label: "סוג דיווח", width: "16%" },
      { key: "month", label: "חודש", width: "12%" },
      { key: "employees", label: "עובדים", width: "10%" },
      { key: "products", label: "מוצרים", width: "10%" },
      { key: "updated", label: "עודכן לאחרונה", width: "27%" },
      { key: "action", label: "פעולה", width: "25%" },
    ]}
    rowHeight={54} maxHeight={340} overscan={5} minTableWidth={680}
    loading={loading && reports.length === 0}
    loadingMore={loading && reports.length > 0}
    hasMore={hasMore} onLoadMore={onLoadMore} emptyState={emptyState}
    renderCells={report => [
      <b key="kind">{reportKindLabel(report.reportKind)}</b>,
      <span key="month">{formatReportingMonth(report.reportingMonth)}</span>,
      <span key="employees">{report.employeeCount}</span>,
      <span key="products">{report.productCount}</span>,
      <span key="updated">{formatUpdated(report.updatedAt)}</span>,
      <div key="action" className="resume-report-actions">{renderActions(report)}</div>,
    ]} />
  </div>;
}
