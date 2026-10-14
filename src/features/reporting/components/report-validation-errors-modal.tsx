"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Download, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { AppModal } from "@/components/ui/app-modal";
import { UiInput } from "@/components/ui/ui-controls";
import { manualReportsApi } from "@/features/reporting/api";
import { validationGroups, validationIssues, validationStage } from "@/features/reporting/validation-groups";
import type { ReportValidationIssue, ReportValidationResult } from "@/features/reporting/validation-api";

const PAGE_SIZE = 12;
type EmployeeLabel = { name: string; employeeNumber: string };
type GroupedRow = { key: string; employeeId: string | null; productId: string | null; issues: ReportValidationIssue[] };

function groupedRows(issues: ReportValidationIssue[]): GroupedRow[] {
  const map = new Map<string, GroupedRow>();
  for (const issue of issues) {
    const key = [issue.employeeId ?? "", issue.productId ?? ""].join(":");
    let row = map.get(key);
    if (!row) {
      row = { key, employeeId: issue.employeeId ?? null, productId: issue.productId ?? null, issues: [] };
      map.set(key, row);
    }
    row.issues.push(issue);
  }
  return [...map.values()];
}

function excelSafe(value: string) {
  return /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
}

export function ReportValidationErrorsModal({ result, onClose, reportMonth, organizationId, employerId, reportId, onEdit }: {
  result: ReportValidationResult; onClose: () => void; reportMonth: string;
  organizationId?: string; employerId?: string; reportId?: string;
  onEdit?: (issue: ReportValidationIssue) => void;
}) {
  const issues = useMemo(() => validationIssues(result), [result]);
  const groups = useMemo(() => validationGroups(issues), [issues]);
  const [open, setOpen] = useState<string | null>(groups[0]?.code ?? null);
  const [filter, setFilter] = useState("");
  const [rowSearch, setRowSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [people, setPeople] = useState<Record<string, EmployeeLabel>>({});
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [peopleError, setPeopleError] = useState("");

  useEffect(() => {
    if (!organizationId || !employerId || !reportId || !issues.some(item => item.employeeId)) return;
    let active = true;
    let offset = 0;
    setLoadingPeople(true);
    setPeopleError("");
    async function load() {
      try {
        const labels: Record<string, EmployeeLabel> = {};
        while (active) {
          const page = await manualReportsApi.manualReportEmployees(organizationId!, employerId!, reportId!, "", offset, 100);
          for (const person of page.items) labels[person.id] = {
            name: [person.firstName, person.lastName].filter(Boolean).join(" "), employeeNumber: person.employeeNumber,
          };
          offset += page.items.length;
          if (!page.hasMore || page.items.length === 0) break;
        }
        if (active) setPeople(labels);
      } catch {
        if (active) setPeopleError("לא ניתן לטעון את שמות העובדים. מזהי השגיאות עדיין זמינים.");
      } finally {
        if (active) setLoadingPeople(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [organizationId, employerId, reportId, issues]);

  const affected = new Set(issues.map(item => item.employeeId).filter(Boolean)).size;
  const searchedGroups = groups.filter(group => (group.code + " " + group.title).toLocaleLowerCase("he").includes(filter.trim().toLocaleLowerCase("he")));
  const selected = groups.find(group => group.code === open);
  const rows = selected ? groupedRows(selected.issues) : [];
  const filteredRows = rows.filter(row => {
    const label = row.employeeId ? people[row.employeeId] : null;
    const text = [label?.name, label?.employeeNumber, row.employeeId, row.productId, ...row.issues.map(item => item.message)].join(" ").toLocaleLowerCase("he");
    return text.includes(rowSearch.trim().toLocaleLowerCase("he"));
  });
  function download() {
    const data = issues.map((issue, i) => [
      i + 1, issue.code, people[issue.employeeId ?? ""]?.name ?? "", issue.employeeId ?? "",
      issue.productId ?? "", issue.scope, excelSafe(issue.message),
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([["מספר", "קוד שגיאה", "עובד", "מזהה עובד בדיווח", "מזהה מוצר בדיווח", "רמת שגיאה", "הודעה מקורית"], ...data]);
    worksheet["!cols"] = [{ wch: 9 }, { wch: 23 }, { wch: 24 }, { wch: 42 }, { wch: 42 }, { wch: 18 }, { wch: 90 }];
    worksheet["!autofilter"] = { ref: `A1:G${data.length + 1}` };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "שגיאות בדיווח");
    workbook.Workbook = { Views: [{ RTL: true }] };
    const [year, month] = (reportMonth || "").slice(0, 7).split("-");
    XLSX.writeFile(workbook, `שגיאות בדיווח - ${year && month ? `${month}-${year}` : "ללא חודש"}.xlsx`, { compression: true });
  }
  return <AppModal title="נמצאו שגיאות בדיווח"
    subtitle="יש לתקן את השגיאות לפני השלמת הדיווח." width="xl" className="report-validation-modal"
    onClose={onClose} actions={<>
      <button type="button" className="btn btn-secondary" onClick={onClose}>חזרה לדיווח</button>
      <button type="button" className="btn btn-primary" onClick={download}><Download size={17} /> הורדת שגיאות XLSX</button>
    </>}>
    <div className="report-validation-stats" aria-label="סיכום שגיאות">
      <div><strong>{issues.length}</strong><span>שגיאות</span></div>
      <div><strong>{affected}</strong><span>עובדים מושפעים</span></div>
      <div><strong>{groups.length}</strong><span>קודי שגיאה</span></div>
    </div>
    <p className="report-validation-intro">השגיאות מקובצות לפי קוד. לחצו על קוד כדי לראות את העובדים והמוצרים הרלוונטיים. כל שגיאה נשמרת גם בקובץ להורדה.</p>
    <div className="report-validation-search"><Search size={17} aria-hidden="true" /><UiInput aria-label="חיפוש קוד או שם שגיאה" placeholder="חיפוש קוד או שם שגיאה" value={filter} onChange={event => setFilter(event.target.value)} /></div>
    <div className="report-validation-groups">
      {searchedGroups.map(group => <section key={group.code} className="report-validation-group">
        <button type="button" className="report-validation-group-toggle" aria-expanded={open === group.code}
          onClick={() => { setOpen(open === group.code ? null : group.code); setRowSearch(""); setLimit(PAGE_SIZE); }}>
          <ChevronDown size={18} className={open === group.code ? "report-validation-chevron-open" : ""} aria-hidden="true" />
          <span className="report-validation-group-name"><strong>{group.title}</strong><small>{group.employeeCount} עובדים · {group.issues.length} שגיאות</small></span>
          <span className="report-validation-code" dir="auto">קוד {group.code.replace(/^SUG_SHGIHA_/, "")}</span>
        </button>
        {open === group.code ? <div className="report-validation-group-body">
          <p>{group.description}</p>
          {loadingPeople ? <p role="status">טוען שמות עובדים…</p> : null}
          {peopleError ? <p role="status">{peopleError}</p> : null}
          <UiInput aria-label="חיפוש עובד או מוצר בשגיאות" placeholder="חיפוש עובד, מוצר או תוכן שגיאה" value={rowSearch}
            onChange={event => { setRowSearch(event.target.value); setLimit(PAGE_SIZE); }} />
          <div className="report-validation-rows">
            {filteredRows.slice(0, limit).map(row => <article className="report-validation-row" key={row.key}>
              <div className="report-validation-row-heading">
                <strong>{row.employeeId ? people[row.employeeId]?.name || "עובד בדיווח" : "שגיאה ברמת הדיווח"}</strong>
                <small>{row.issues.length > 1 ? `${row.issues.length} שגיאות` : "שגיאה אחת"}</small>
              </div>
              {row.employeeId && people[row.employeeId]?.employeeNumber ? <small>מספר עובד: {people[row.employeeId].employeeNumber}</small> : null}
              {row.productId ? <small>מוצר בדיווח: <span dir="ltr">{row.productId.slice(0, 8)}</span></small> : null}
              {row.issues.map((issue, index) => <div key={index} className="report-validation-row-message">
                <AlertCircle size={15} aria-hidden="true" />
                <span dir="auto">{issue.message}</span>
                {onEdit ? <button type="button" className="btn btn-secondary" onClick={() => onEdit(issue)}>
                  {validationStage(issue) === 1 ? "פרטי הדיווח" : validationStage(issue) === 3 ? "עריכת תשלום" : "עריכת עובד / מוצר"}
                </button> : null}
              </div>)}
              <details><summary>פרטים טכניים</summary><div className="report-validation-technical">
                <span>קוד: <b dir="ltr">{group.code}</b></span>
                {row.employeeId ? <p>מזהה עובד: <span dir="ltr">{row.employeeId}</span></p> : null}
                {row.productId ? <p>מזהה מוצר: <span dir="ltr">{row.productId}</span></p> : null}
              </div></details>
            </article>)}
            {!filteredRows.length ? <p className="report-validation-empty">לא נמצאו שגיאות התואמות לחיפוש.</p> : null}
          </div>
          {filteredRows.length > limit ? <button type="button" className="btn btn-secondary report-validation-more"
            onClick={() => setLimit(value => value + PAGE_SIZE)}>הצגת {Math.min(PAGE_SIZE, filteredRows.length - limit)} רשומות נוספות (מתוך {filteredRows.length})</button> : null}
        </div> : null}
      </section>)}
      {!searchedGroups.length ? <p className="report-validation-empty">לא נמצאו קודי שגיאה התואמים לחיפוש.</p> : null}
    </div>
  </AppModal>;
}
