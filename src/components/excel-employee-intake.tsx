"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, FileSpreadsheet, UploadCloud, UserPlus } from "lucide-react";
import * as XLSX from "xlsx";
import { alphaApi } from "@/lib/api";
import type { Employee, EmployeeInput } from "@/lib/types";

export type ExcelEmployeeIntakeResult = {
  fileName: string;
  matchedEmploymentIds: string[];
  newEmployees: EmployeeInput[];
  blockedCount: number;
  totalRows: number;
};

type Props = {
  organizationId: string;
  employerId: string;
  reportingMonth: string;
  onChange: (result: ExcelEmployeeIntakeResult | null) => void;
};

type IntakeRow = EmployeeInput & {
  rowNumber: number;
  status: "matched" | "new" | "blocked";
  employmentId?: string;
  reason?: string;
  selected: boolean;
};

const aliases = {
  nationalId: ["תז", "תעודתזהות", "מספרזהות", "nationalid", "id", "identity"],
  firstName: ["שםפרטי", "firstname", "first"],
  lastName: ["שםמשפחה", "lastname", "last", "surname"],
  fullName: ["שםעובד", "שםמלא", "employeename", "fullname", "name"],
  employeeNumber: ["מספרעובד", "מסעובד", "employeenumber", "employeeno", "employeeid"],
  startDate: ["תאריךתחילתעבודה", "תחילתעבודה", "תאריךקליטה", "startdate", "employmentstartdate"],
};

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s_\-.\/"'׳״:()]+/g, "");
}

function pick(row: Record<string, unknown>, names: string[]) {
  const wanted = new Set(names.map(normalizeHeader));
  const key = Object.keys(row).find((item) => wanted.has(normalizeHeader(item)));
  return key ? String(row[key] ?? "").trim() : "";
}

function digits(value: string) { return value.replace(/\D/g, ""); }

function parseDate(value: string) {
  if (!value) return "";
  const iso = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const local = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (local) {
    const year = local[3].length === 2 ? `20${local[3]}` : local[3];
    return `${year}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

async function loadAllEmployees(organizationId: string, employerId: string) {
  const result: Employee[] = [];
  let skip = 0;
  let hasMore = true;
  while (hasMore && result.length < 5000) {
    const page = await alphaApi.employeeSearch(organizationId, employerId, "", skip, 100);
    result.push(...page.items);
    hasMore = page.hasMore;
    skip += page.items.length;
    if (!page.items.length) break;
  }
  return result;
}

export function ExcelEmployeeIntake({ organizationId, employerId, reportingMonth, onChange }: Props) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [defaultStartDate, setDefaultStartDate] = useState(`${reportingMonth}-01`);

  useEffect(() => { setDefaultStartDate(`${reportingMonth}-01`); }, [reportingMonth]);

  const matched = useMemo(() => rows.filter((x) => x.status === "matched"), [rows]);
  const newRows = useMemo(() => rows.filter((x) => x.status === "new"), [rows]);
  const blocked = useMemo(() => rows.filter((x) => x.status === "blocked"), [rows]);

  useEffect(() => {
    if (!fileName || !rows.length) { onChange(null); return; }
    onChange({
      fileName,
      matchedEmploymentIds: matched.map((x) => x.employmentId!).filter(Boolean),
      newEmployees: newRows.filter((x) => x.selected).map(({ nationalId, firstName, lastName, employeeNumber, startDate }) => ({ nationalId, firstName, lastName, employeeNumber, startDate: startDate || defaultStartDate })),
      blockedCount: blocked.length,
      totalRows: rows.length,
    });
  }, [fileName, rows, defaultStartDate]);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setRows([]); onChange(null);
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { setError("יש לבחור קובץ Excel או CSV בלבד."); return; }
    if (file.size > 20 * 1024 * 1024) { setError("הקובץ גדול מדי. הגודל המרבי הוא 20MB."); return; }
    setLoading(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("לא נמצא גיליון בקובץ.");
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      if (!rawRows.length) throw new Error("הקובץ ריק או שלא נמצאו בו שורות נתונים.");
      if (rawRows.length > 5000) throw new Error("ניתן לקלוט עד 5,000 עובדים בקובץ אחד.");

      const existing = await loadAllEmployees(organizationId, employerId);
      const byNationalId = new Map(existing.map((x) => [digits(x.nationalId), x]));
      const byEmployeeNumber = new Map(existing.map((x) => [x.employeeNumber.trim().toLowerCase(), x]));
      const seenNationalIds = new Set<string>();
      const seenEmployeeNumbers = new Set<string>();

      const parsed: IntakeRow[] = rawRows.map((raw, index) => {
        let firstName = pick(raw, aliases.firstName);
        let lastName = pick(raw, aliases.lastName);
        const fullName = pick(raw, aliases.fullName);
        if ((!firstName || !lastName) && fullName) {
          const split = splitName(fullName);
          firstName ||= split.firstName;
          lastName ||= split.lastName;
        }
        const nationalId = digits(pick(raw, aliases.nationalId)).slice(0, 9);
        const employeeNumber = pick(raw, aliases.employeeNumber);
        const startDate = parseDate(pick(raw, aliases.startDate)) || defaultStartDate;
        const base = { rowNumber: index + 2, nationalId, firstName, lastName, employeeNumber, startDate };

        if (!nationalId || nationalId.length > 9 || !firstName || !lastName || !employeeNumber) return { ...base, status: "blocked" as const, reason: "חסרים ת״ז, שם או מספר עובד", selected: false };
        const employeeKey = employeeNumber.trim().toLowerCase();
        if (seenNationalIds.has(nationalId) || seenEmployeeNumbers.has(employeeKey)) return { ...base, status: "blocked" as const, reason: "כפילות בתוך הקובץ", selected: false };
        seenNationalIds.add(nationalId); seenEmployeeNumbers.add(employeeKey);

        const nationalMatch = byNationalId.get(nationalId);
        const numberMatch = byEmployeeNumber.get(employeeKey);
        if (nationalMatch && numberMatch && nationalMatch.id === numberMatch.id) return { ...base, status: "matched" as const, employmentId: nationalMatch.id, selected: true };
        if (nationalMatch || numberMatch) return { ...base, status: "blocked" as const, reason: nationalMatch && numberMatch ? "ת״ז ומספר עובד שייכים לעובדים שונים" : "נמצאה התאמה חלקית לעובד קיים — נדרשת בדיקה", selected: false };
        return { ...base, status: "new" as const, selected: true };
      });

      setFileName(file.name);
      setRows(parsed);
    } catch (err) {
      setFileName("");
      setRows([]);
      setError(err instanceof Error ? err.message : "קריאת הקובץ נכשלה");
    } finally { setLoading(false); }
  }

  function toggleNew(rowNumber: number) { setRows((current) => current.map((row) => row.rowNumber === rowNumber && row.status === "new" ? { ...row, selected: !row.selected } : row)); }

  return <>
    <div className="card-head"><div><h2>העלאת קובץ שכר</h2><span style={{ color: "var(--muted)" }}>Excel / CSV · המערכת תזהה עובדים קיימים ותציע הקמת עובדים חדשים</span></div></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 16 }}>{error}</div> : null}
    <label className="upload-zone" htmlFor="excel-file"><UploadCloud size={38} /><h3>{fileName || "גררו קובץ לכאן או בחרו מהמחשב"}</h3><p>נדרשות עמודות ת״ז, שם ומספר עובד. תאריך תחילת עבודה ייקלט אם קיים.</p><span className="btn btn-soft">{loading ? "קורא קובץ..." : "בחירת קובץ"}</span><input id="excel-file" type="file" accept=".xlsx,.xls,.csv" hidden disabled={loading} onChange={(event) => void selectFile(event)} /></label>

    {rows.length ? <div style={{ marginTop: 20 }}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
        <div className="notice notice-info"><CircleCheck size={17} /> {matched.length} עובדים קיימים הותאמו</div>
        <div className="notice notice-info"><UserPlus size={17} /> {newRows.length} עובדים חדשים זוהו</div>
        <div className={blocked.length ? "notice notice-error" : "notice notice-info"}><CircleAlert size={17} /> {blocked.length} שורות דורשות טיפול</div>
      </div>
      <div className="field" style={{ maxWidth: 300, marginBottom: 16 }}><label>תאריך תחילת עבודה ברירת מחדל לעובד חדש</label><input type="date" value={defaultStartDate} onChange={(e) => setDefaultStartDate(e.target.value)} /></div>
      {blocked.length ? <div className="notice notice-error" style={{ marginBottom: 16 }}><b>לא ניתן להמשיך כל עוד קיימות שורות חסומות.</b> תקנו את הקובץ והעלו אותו מחדש. המערכת לא תקים עובד מתוך התאמה חלקית או כפולה.</div> : null}
      <div className="contribution-table-wrap"><table className="contribution-table"><thead><tr><th>שורה</th><th>סטטוס</th><th>ת״ז</th><th>שם</th><th>מספר עובד</th><th>פעולה</th></tr></thead><tbody>{rows.slice(0, 250).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.status === "matched" ? "עובד קיים" : row.status === "new" ? "עובד חדש" : "חסום"}</td><td>{row.nationalId || "—"}</td><td>{`${row.firstName} ${row.lastName}`.trim() || "—"}</td><td>{row.employeeNumber || "—"}</td><td>{row.status === "new" ? <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={row.selected} onChange={() => toggleNew(row.rowNumber)} />להקים</label> : row.reason ?? "ייכלל בדיווח"}</td></tr>)}</tbody></table></div>
      {rows.length > 250 ? <div className="notice notice-info" style={{ marginTop: 12 }}>מוצגות 250 השורות הראשונות מתוך {rows.length}. כל השורות נבדקו וייכללו בעיבוד.</div> : null}
    </div> : null}
  </>;
}
