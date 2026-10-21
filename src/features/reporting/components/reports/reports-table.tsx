import { DataTable } from "@/components/ui/data-table";
import { LoadingState } from "@/components/loading/loading-state";
import { DepositFeedbackPanel } from "@/features/feedback/components/deposit-feedback-panel";
import { useReportColumns } from "./report-columns";
import type { useReportsView } from "../../hooks/use-reports-view";
import type { useReportDeposits } from "../../hooks/use-report-deposits";
import type { useReportActions } from "../../hooks/use-report-actions";

export function ReportsTable({ view, deposits, actions }: {
  view: ReturnType<typeof useReportsView>;
  deposits: ReturnType<typeof useReportDeposits>;
  actions: ReturnType<typeof useReportActions>;
}) {
  const { rows, hasMoreReports, loadMoreReports, loadingMoreReports, loading, visibleColumns } = view;
  const { expandedKeys, setExpanded, loadExpanded, expandedLoading, expandedContent,
    expandedErrors, expandedMoreLoading, loadMoreDeposits, expandedManufacturerInput, changeExpandedManufacturer } = deposits;
  const { setFeedbackModal } = actions;
  const { allColumns, activeColumns } = useReportColumns(visibleColumns, actions);
  // Keep colgroup, header and body on one sizing grid; narrower screens scroll the table.
  const minTableWidth = activeColumns.reduce((total, column) => total + Number.parseInt(column.width ?? "0", 10), 0);
  return <div className="card report-table-card">
    <DataTable
      minTableWidth={minTableWidth}
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
      onExpandedRowChange={(_key, expanded, report) => setExpanded(report, expanded)}
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
      renderCells={(row, expandToggle) => visibleColumns.map((key) => <div key={key} className="report-cell-content">{allColumns[key].render(row, key === "actions" ? expandToggle : undefined)}</div>)}
    />
  </div>;
}
