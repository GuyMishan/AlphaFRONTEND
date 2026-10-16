"use client";

import { UiInput } from "@/components/ui/ui-controls";
import { LoadingState } from "@/components/loading/loading-state";
import { formatDateDDMMYYYY, formatReportingMonth } from "@/lib/format/date";
import type { SourceManualReport } from "../../types";
import { reportKindLabel } from "../../labels";

type Props = {
  reports: SourceManualReport[];
  loading: boolean;
  selectedId: string;
  search: string;
  setSearch: (value: string) => void;
  chooseSource: (report: SourceManualReport) => void;
  onSearch: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
};

export function SourceReportsList({ reports, loading, selectedId, search, setSearch, chooseSource, onSearch, hasMore, onLoadMore }: Props) {
  return <div>
    <div className="card-head">
      <div>
        <h3 style={{ margin: 0 }}>בחרו את הדיווח שאותו מתקנים</h3>
        <span style={{ color: "var(--color-text-muted)" }}>ניתן לטעון דיווחים נוספים לפי הצורך.</span>
      </div>
    </div>
    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <UiInput aria-label="חיפוש לפי חודש" placeholder="חיפוש חודש, למשל 2026-09" maxLength={7}
        value={search} onChange={event => setSearch(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter") onSearch(); }} style={{ flex: "1 1 220px" }} />
      <button type="button" className="btn btn-secondary" onClick={onSearch} disabled={loading}>חיפוש</button>
    </div>
    {loading && !reports.length ? <LoadingState label="טוען דיווחים קודמים..." /> : null}
    {!loading && !reports.length ? <div className="empty">
      <b>לא נמצאו דיווחים</b><span>אין כרגע דיווח זמין לבסס עליו את התיקון.</span>
    </div> : null}
    {reports.length ? <div className="manual-employee-list">
      {reports.map(report => {
        const selected = report.id === selectedId;
        return <button type="button" key={report.id}
          className={`manual-employee-row correction-report-row${selected ? " selected" : ""}`} onClick={() => chooseSource(report)}>
          <span className="manual-employee-check"><UiInput type="radio" readOnly checked={selected} /></span>
          <span className="manual-employee-main">
            <b>חודש {formatReportingMonth(report.reportingMonth)} · {reportKindLabel(report.reportKind)}</b>
            <span>{report.employeeCount} עובדים · {report.productCount} מוצרים · עודכן {formatDateDDMMYYYY(report.updatedAt, "—")}</span>
          </span>
        </button>;
      })}
    </div> : null}
    {hasMore ? <div style={{ marginTop: 14, textAlign: "center" }}>
      <button type="button" className="btn btn-secondary" disabled={loading} onClick={onLoadMore}>
        {loading ? "טוען..." : "טען דיווחים נוספים"}
      </button>
    </div> : null}
  </div>;
}
