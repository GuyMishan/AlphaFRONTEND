import { Columns3, Filter, Search, X } from "lucide-react";
import { UiCheckbox, UiDateInput, UiInput, UiSelect } from "@/components/ui/ui-controls";
import type { ReportFeedbackStatus } from "@/features/feedback/api";
import { statusFilters, columnOptions, type ExtraFilterKey } from "./reports-view-model";
import type { useReportsView } from "../../hooks/use-reports-view";

export function ReportsFilters({ view }: { view: ReturnType<typeof useReportsView> }) {
  const { filters, setFilters, extraFilters, removeFilter, addFilter,
    reportKindOptions, treatmentStatuses, visibleColumns, persistColumns } = view;
  return <section className="report-filter-shell" aria-label="סינון דיווחים">
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
  </section>;
}
