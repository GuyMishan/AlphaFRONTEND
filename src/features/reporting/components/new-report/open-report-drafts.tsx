"use client";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { ResumableManualReport } from "@/features/reporting/types";
import { ReportSelectionTable } from "./report-selection-table";
export function OpenReportDrafts({
  openReports, loadingOpenReports, openReportsHasMore, advancing, deletingDraftId,
  loadMoreOpenReports, onResume, onDelete, search, setSearch, onSearch,
}: {
  openReports: ResumableManualReport[]; loadingOpenReports: boolean;
  openReportsHasMore: boolean; advancing: boolean; deletingDraftId: string;
  loadMoreOpenReports: () => Promise<void>;
  onResume: (draft: ResumableManualReport) => void;
  onDelete: (draft: ResumableManualReport) => void;
  search: string; setSearch: (value: string) => void; onSearch: () => void;
}) {
  return <div id="open-report-drafts">
    <div className="card-head"><div>
      <h3 style={{ margin: 0 }}>טיוטות שניתן להמשיך לערוך</h3>
    </div></div>
      <ReportSelectionTable reports={openReports} loading={loadingOpenReports}
        hasMore={openReportsHasMore} onLoadMore={loadMoreOpenReports}
        search={search} setSearch={setSearch} onSearch={onSearch} searchLoading={loadingOpenReports}
        emptyState="אין כרגע טיוטות פתוחות למעסיק הנבחר."
        renderActions={report => <>
          <button type="button" className="btn btn-primary resume-report-continue"
            disabled={advancing || deletingDraftId === report.id} onClick={() => onResume(report)}>
            המשך עריכה <ArrowLeft size={15} />
          </button>
          <button type="button" className="btn btn-danger resume-report-delete" aria-label="מחיקת טיוטה"
            disabled={advancing || Boolean(deletingDraftId)} onClick={() => onDelete(report)}>
            <Trash2 size={15} />
          </button>
        </>} />
    </div>
  </div>;
}
