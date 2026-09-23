"use client";

import { UiDateInput, UiInput  } from "@/components/ui-controls";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, UploadCloud, UserPlus } from "lucide-react";
import * as XLSX from "xlsx";
import { alphaApi } from "@/lib/api";
import { isValidEmail } from "@/lib/validation";
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
  monthlySalary: ["שכרחודשי", "שכר", "monthlysalary", "salary"],
  birthDate: ["תאריךלידה", "תלידה", "birthdate", "dateofbirth", "dob"],
  gender: ["מין", "מגדר", "gender", "sex"],
  email: ["אימייל", "דואל", "דואר101אלקטרוני", "email", "emailaddress"],
  mobile: ["נייד", "טלפוןנייד", "סלולרי", "mobile", "mobilephone", "cellphone"],
  city: ["ישוב", "יישוב", "עיר", "city", "town"],
  street: ["רחוב", "street", "streetname"],
  houseNumber: ["מספרבית", "מסבית", "house", "housenumber", "streetnumber"],
  apartment: ["דירה", "מספרדירה", "מסדירה", "apartment", "apartmentnumber", "apt"],
  postalCode: ["מיקוד", "zipcode", "postalcode", "postcode"],
  postOfficeBox: ["תאדואר", "תד", "pobox", "postofficebox"],
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

function parseGender(value: string): number | null {
  const normalized = normalizeHeader(value);
  if (["1", "זכר", "male", "m"].includes(normalized)) return 1;
  if (["2", "נקבה", "female", "f"].includes(normalized)) return 2;
  return null;
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
      newEmployees: newRows.filter((x) => x.selected).map(({ rowNumber: _rowNumber, status: _status, employmentId: _employmentId, reason: _reason, selected: _selected, ...employee }) => employee),
      blockedCount: blocked.length,
      totalRows: rows.length,
    });
  }, [fileName, rows, matched, newRows, blocked, onChange]);

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
        const monthlySalaryRaw = pick(raw, aliases.monthlySalary).replace(/,/g, "");
        const monthlySalary = monthlySalaryRaw ? Number(monthlySalaryRaw) : 0;
        const birthDate = parseDate(pick(raw, aliases.birthDate)) || null;
        const gender = parseGender(pick(raw, aliases.gender));
        const email = pick(raw, aliases.email).trim();
        const mobile = digits(pick(raw, aliases.mobile));
        const city = pick(raw, aliases.city).trim();
        const street = pick(raw, aliases.street).trim();
        const houseNumber = pick(raw, aliases.houseNumber).trim();
        const apartment = pick(raw, aliases.apartment).trim();
        const postalCode = digits(pick(raw, aliases.postalCode));
        const postOfficeBox = digits(pick(raw, aliases.postOfficeBox));

        const base: Omit<IntakeRow, "status" | "selected" | "reason" | "employmentId"> = {
          rowNumber: index + 2,
          nationalId,
          firstName,
          lastName,
          employeeNumber,
          startDate,
          monthlySalary,
          birthDate,
          gender,
          email,
          mobile,
          city,
          street,
          houseNumber,
          apartment,
          postalCode,
          postOfficeBox,
        };

        const missing: string[] = [];
        if (!nationalId || nationalId.length > 9) missing.push("ת״ז");
        if (!firstName) missing.push("שם פרטי");
        if (!lastName) missing.push("שם משפחה");
        if (!employeeNumber) missing.push("מספר עובד");
        if (!birthDate) missing.push("תאריך לידה");
        if (!gender) missing.push("מין (1/זכר או 2/נקבה)");
        if (!email || !isValidEmail(email)) missing.push("אימייל תקין");
        if (!/^\d{1,15}$/.test(mobile)) missing.push("נייד");
        if (!city) missing.push("יישוב");
        if (!street) missing.push("רחוב");
        if (!houseNumber) missing.push("מספר בית");
        if (!apartment) missing.push("מספר דירה");
        if (!postalCode) missing.push("מיקוד");
        if (!postOfficeBox) missing.push("תא דואר");
        if (!Number.isFinite(monthlySalary) || monthlySalary < 0) missing.push("שכר חודשי תקין");
        if (missing.length) return { ...base, status: "blocked" as const, reason: `חסרים/לא תקינים: ${missing.join(", ")}`, selected: false };

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
    <label className="upload-zone" htmlFor="excel-file"><UploadCloud size={38} /><h3>{fileName || "גררו קובץ לכאן או בחרו מהמחשב"}</h3><p>חובה לכלול: ת״ז, שם, מספר עובד, תאריך לידה, מין, אימייל, נייד, יישוב, רחוב, מספר בית, מספר דירה, מיקוד ותא דואר. תאריך תחילת עבודה ושכר חודשי ייקלטו אם קיימים.</p><span className="btn btn-soft">{loading ? "קורא קובץ..." : "בחירת קובץ"}</span><UiInput id="excel-file" type="file" accept=".xlsx,.xls,.csv" hidden disabled={loading} onChange={(event) => void selectFile(event)} /></label>

    {rows.length ? <div style={{ marginTop: 20 }}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
        <div className="notice notice-info"><CircleCheck size={17} /> {matched.length} עובדים קיימים הותאמו</div>
        <div className="notice notice-info"><UserPlus size={17} /> {newRows.length} עובדים חדשים זוהו</div>
        <div className={blocked.length ? "notice notice-error" : "notice notice-info"}><CircleAlert size={17} /> {blocked.length} שורות דורשות טיפול</div>
      </div>
      <div className="field" style={{ maxWidth: 300, marginBottom: 16 }}><label>תאריך תחילת עבודה ברירת מחדל לעובד חדש</label><UiDateInput value={defaultStartDate} onValueChange={setDefaultStartDate} /></div>
      {blocked.length ? <div className="notice notice-error" style={{ marginBottom: 16 }}><b>לא ניתן להמשיך כל עוד קיימות שורות חסומות.</b> תקנו את הקובץ והעלו אותו מחדש. בכל שורה חסומה מוצגת רשימת השדות שחסרים או אינם תקינים.</div> : null}
      <div className="contribution-table-wrap"><table className="contribution-table"><thead><tr><th>שורה</th><th>סטטוס</th><th>ת״ז</th><th>שם</th><th>מספר עובד</th><th>פעולה / שגיאה</th></tr></thead><tbody>{rows.slice(0, 250).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td>{row.status === "matched" ? "עובד קיים" : row.status === "new" ? "עובד חדש" : "חסום"}</td><td>{row.nationalId || "—"}</td><td>{`${row.firstName} ${row.lastName}`.trim() || "—"}</td><td>{row.employeeNumber || "—"}</td><td>{row.status === "new" ? <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><UiInput type="checkbox" checked={row.selected} onChange={() => toggleNew(row.rowNumber)} />להקים</label> : row.reason ?? "ייכלל בדיווח"}</td></tr>)}</tbody></table></div>
      {rows.length > 250 ? <div className="notice notice-info" style={{ marginTop: 12 }}>מוצגות 250 השורות הראשונות מתוך {rows.length}. כל השורות נבדקו וייכללו בעיבוד.</div> : null}
    </div> : null}
  </>;
}
