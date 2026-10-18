"use client";
import type { SourceManualReport } from "../../types";
import { ReportSelectionTable } from "./report-selection-table";
type Props = {
  reports: SourceManualReport[]; loading: boolean; selectedId: string;
  search: string; setSearch: (value: string) => void;
  chooseSource: (report: SourceManualReport) => void;
  onSearch: () => void; hasMore: boolean; onLoadMore: () => void;
  advancing: boolean;
};
export function SourceReportsList({ reports, loading, selectedId, search, setSearch, chooseSource, onSearch, hasMore, onLoadMore, advancing }: Props) {
  return <div>
    <div className="card-head"><div>
      <h3 style={{ margin: 0 }}>בחרו את הדיווח שאותו מתקנים</h3>
      <span style={{ color: "var(--color-text-muted)" }}>ניתן לטעון דיווחים נוספים לפי הצורך.</span>
    </div></div>
    <ReportSelectionTable reports={reports} loading={loading} hasMore={hasMore} onLoadMore={onLoadMore}
      search={search} setSearch={setSearch} onSearch={onSearch} searchLoading={loading}
      emptyState="אין כרגע דיווח זמין לבסס עליו את התיקון."
      renderActions={report => <button type="button"
        className={`btn ${report.id === selectedId ? "btn-secondary" : "btn-primary"} resume-report-continue`}
        aria-pressed={report.id === selectedId} disabled={advancing} onClick={() => chooseSource(report)}>
        {advancing && report.id === selectedId ? "פותח..." : "תקן דיווח"}
      </button>} />
  </div>;
}
