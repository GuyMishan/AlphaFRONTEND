"use client";
import { UiInput } from "@/components/ui/ui-controls";
import type { SourceManualReport } from "../../types";
import { ReportSelectionTable } from "./report-selection-table";
type Props = {
  reports: SourceManualReport[]; loading: boolean; selectedId: string;
  search: string; setSearch: (value: string) => void;
  chooseSource: (report: SourceManualReport) => void;
  onSearch: () => void; hasMore: boolean; onLoadMore: () => void;
};
export function SourceReportsList({ reports, loading, selectedId, search, setSearch, chooseSource, onSearch, hasMore, onLoadMore }: Props) {
  return <div>
    <div className="card-head"><div>
      <h3 style={{ margin: 0 }}>בחרו את הדיווח שאותו מתקנים</h3>
      <span style={{ color: "var(--color-text-muted)" }}>ניתן לטעון דיווחים נוספים לפי הצורך.</span>
    </div></div>
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <UiInput aria-label="חיפוש לפי חודש" placeholder="חיפוש חודש, למשל 2026-09" maxLength={7}
        value={search} onChange={event => setSearch(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter") onSearch(); }} style={{ flex: "1 1 220px" }} />
      <button type="button" className="btn btn-secondary" onClick={onSearch} disabled={loading}>חיפוש</button>
    </div>
    <ReportSelectionTable reports={reports} loading={loading} hasMore={hasMore} onLoadMore={onLoadMore}
      emptyState="אין כרגע דיווח זמין לבסס עליו את התיקון."
      renderActions={report => <button type="button"
        className={`btn ${report.id === selectedId ? "btn-secondary" : "btn-primary"} resume-report-continue`}
        aria-pressed={report.id === selectedId} onClick={() => chooseSource(report)}>
        {report.id === selectedId ? "נבחר" : "בחר דיווח"}
      </button>} />
  </div>;
}
