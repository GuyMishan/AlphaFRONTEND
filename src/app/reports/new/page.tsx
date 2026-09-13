"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, FilePenLine, FileSpreadsheet, Info, Keyboard, Search, Send, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { alphaApi } from "@/lib/api";
import { getEmployerSelection } from "@/lib/session";
import type { Employee, Employer, ReportMode } from "@/lib/types";

const steps = ["פרטי הדיווח", "קליטת נתונים", "בדיקות", "סיכום ושליחה"];
const monthNow = new Date().toISOString().slice(0, 7);

export default function NewReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<ReportMode>("manual");
  const [month, setMonth] = useState(monthNow);
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "correction") setMode("correction");
    const selected = getEmployerSelection();
    if (!selected) { setLoading(false); return; }
    Promise.all([
      alphaApi.employers(selected.organizationId),
      alphaApi.employees(selected.organizationId, selected.employerId),
    ]).then(([employers, employeeItems]) => {
      setEmployer(employers.find((x) => x.id === selected.employerId) ?? null);
      setEmployees(employeeItems);
      setSelectedIds(employeeItems.filter((x) => x.status === 1).map((x) => x.id));
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת הנתונים נכשלה")).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => employees.filter((x) => `${x.firstName} ${x.lastName} ${x.nationalId} ${x.employeeNumber}`.includes(query)), [employees, query]);
  const canContinue = step === 1 ? Boolean(employer && month && mode) : step === 2 ? (mode === "excel" ? Boolean(fileName) : mode === "correction" ? Boolean(reason) : selectedIds.length > 0) : true;

  function toggleEmployee(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setFileName(event.target.files?.[0]?.name ?? "");
  }

  function next() {
    if (step < 4) setStep((value) => value + 1);
  }

  return (
    <AppShell title="דיווח חדש">
      <div className="wizard">
        <div className="page-head"><div><h1>יצירת דיווח פנסיוני</h1><p>{employer ? `${employer.legalName} · ח.פ. ${employer.registrationNumber}` : "יש לבחור מעסיק בבורר העליון"}</p></div></div>
        <div className="steps">{steps.map((label, index) => { const number = index + 1; return <div key={label} className={`step${number === step ? " current" : number < step ? " done" : ""}`}><div className="step-number">{number < step ? <Check size={16} /> : number}</div>{label}</div>; })}</div>
        {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}
        {loading ? <div className="card empty">טוען את המעסיק והעובדים מה־Backend...</div> : !employer ? <div className="card empty"><Info size={34} /><h3>עדיין לא נבחר מעסיק</h3><button className="btn btn-primary" onClick={() => router.push("/dashboard")}>לבחירת מעסיק</button></div> : (
          <section className="card">
            {step === 1 ? <ReportDetails mode={mode} setMode={setMode} month={month} setMonth={setMonth} /> : null}
            {step === 2 && mode === "manual" ? <ManualData employees={filtered} selectedIds={selectedIds} toggleEmployee={toggleEmployee} query={query} setQuery={setQuery} allEmployees={employees} setSelectedIds={setSelectedIds} /> : null}
            {step === 2 && mode === "excel" ? <ExcelData fileName={fileName} selectFile={selectFile} /> : null}
            {step === 2 && mode === "correction" ? <CorrectionData reason={reason} setReason={setReason} /> : null}
            {step === 3 ? <Validation mode={mode} selectedCount={selectedIds.length} fileName={fileName} /> : null}
            {step === 4 ? <Summary employer={employer} month={month} mode={mode} selectedCount={selectedIds.length} fileName={fileName} /> : null}
            <div className="wizard-footer">
              <button className="btn btn-secondary" disabled={step === 1} onClick={() => setStep((value) => value - 1)}><ArrowRight size={17} />חזרה</button>
              {step < 4 ? <button className="btn btn-primary" disabled={!canContinue} onClick={next}>המשך<ArrowLeft size={17} /></button> : <button className="btn btn-primary" disabled title="ה־Backend עדיין אינו כולל endpoint לשליחת דיווח"><Send size={17} />שליחת דיווח</button>}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function ReportDetails({ mode, setMode, month, setMonth }: { mode: ReportMode; setMode: (value: ReportMode) => void; month: string; setMonth: (value: string) => void }) {
  const choices = [
    { value: "manual" as const, icon: Keyboard, title: "דיווח ידני", text: "בחירת עובדים והזנת נתוני ההפקדה במערכת" },
    { value: "excel" as const, icon: FileSpreadsheet, title: "קובץ Excel", text: "העלאת קובץ שכר, התאמת עמודות ובדיקת הנתונים" },
    { value: "correction" as const, icon: FilePenLine, title: "תיקון דיווח", text: "תיקון דיווח קיים או יצירת דיווח הפרשים" },
  ];
  return <><div className="card-head"><div><h2>איך תרצו לדווח?</h2><span style={{ color: "var(--muted)" }}>בחרו תקופה ואופן קליטת הנתונים</span></div></div><div className="grid two-cols" style={{ marginBottom: 24 }}><div className="field"><label htmlFor="month">חודש דיווח</label><input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div><div className="field"><label htmlFor="salary-date">תאריך תשלום שכר</label><input id="salary-date" type="date" /></div></div><div className="grid choice-grid">{choices.map(({ value, icon: Icon, title, text }) => <button key={value} className={`choice-card${mode === value ? " selected" : ""}`} onClick={() => setMode(value)}><Icon className="choice-icon" size={28} /><b>{title}</b><p>{text}</p></button>)}</div></>;
}

function ManualData({ employees, selectedIds, toggleEmployee, query, setQuery, allEmployees, setSelectedIds }: { employees: Employee[]; selectedIds: string[]; toggleEmployee: (id: string) => void; query: string; setQuery: (value: string) => void; allEmployees: Employee[]; setSelectedIds: (ids: string[]) => void }) {
  return <><div className="card-head"><div><h2>בחירת עובדים לדיווח</h2><span style={{ color: "var(--muted)" }}>רשימת העובדים התקבלה מ־GET /employees</span></div><span className="badge badge-blue">נבחרו {selectedIds.length}</span></div><div className="toolbar"><div className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="שם, תעודת זהות או מספר עובד" /></div><button className="btn btn-soft" onClick={() => setSelectedIds(allEmployees.map((x) => x.id))}>בחירת הכל</button></div><div className="table-wrap"><table><thead><tr><th></th><th>עובד</th><th>תעודת זהות</th><th>מספר עובד</th><th>תחילת עבודה</th><th>סטטוס</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td><input type="checkbox" aria-label={`בחירת ${employee.firstName} ${employee.lastName}`} checked={selectedIds.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} /></td><td><b>{employee.firstName} {employee.lastName}</b></td><td>{employee.nationalId}</td><td>{employee.employeeNumber}</td><td>{employee.startDate}</td><td><span className={employee.status === 1 ? "badge badge-green" : "badge badge-gray"}>{employee.status === 1 ? "פעיל" : "לא פעיל"}</span></td></tr>)}</tbody></table></div></>;
}

function ExcelData({ fileName, selectFile }: { fileName: string; selectFile: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <><div className="card-head"><div><h2>העלאת קובץ שכר</h2><span style={{ color: "var(--muted)" }}>קובצי Excel בלבד, עד 10MB</span></div></div><label className="upload-zone" htmlFor="excel-file"><UploadCloud size={38} /><h3>{fileName || "גררו קובץ לכאן או בחרו מהמחשב"}</h3><p>הקובץ ייבדק לפני המשך התהליך</p><span className="btn btn-soft">בחירת קובץ</span><input id="excel-file" type="file" accept=".xlsx,.xls,.csv" hidden onChange={selectFile} /></label><div className="notice notice-warning" style={{ marginTop: 18 }}>ה־Backend עדיין אינו כולל endpoint להעלאת הקובץ. הקובץ נשאר בדפדפן ולא נשלח כרגע.</div></>;
}

function CorrectionData({ reason, setReason }: { reason: string; setReason: (value: string) => void }) {
  return <><div className="card-head"><div><h2>פרטי התיקון</h2><span style={{ color: "var(--muted)" }}>בחירת דיווח מקור תתאפשר כאשר Reporting API יתווסף לשרת</span></div></div><div className="grid two-cols"><div className="field"><label>סוג התיקון</label><select><option>תיקון סכומים</option><option>עובד שנשכח</option><option>עובד שדווח בטעות</option><option>תיקון מוצר פנסיוני</option><option>דיווח הפרשים</option></select></div><div className="field"><label>דיווח מקור</label><select disabled><option>אין endpoint לדיווחים קיימים</option></select></div></div><div className="field" style={{ marginTop: 18 }}><label htmlFor="reason">סיבת התיקון</label><textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="פרטו מה נדרש לתקן ולמה" /></div></>;
}

function Validation({ mode, selectedCount, fileName }: { mode: ReportMode; selectedCount: number; fileName: string }) {
  return <><div className="card-head"><div><h2>בדיקות ובקרות</h2><span style={{ color: "var(--muted)" }}>סיכום הנתונים שנאספו בשלב הקודם</span></div></div><div className="grid two-cols"><div className="notice notice-info"><Check size={17} /> המעסיק וההרשאות אומתו מול ה־Backend</div><div className="notice notice-info"><Check size={17} /> {mode === "manual" ? `${selectedCount} עובדים נבחרו מרשימת השרת` : fileName || "פרטי התיקון נקלטו"}</div></div><div className="notice notice-warning" style={{ marginTop: 18 }}>בדיקות סכומים, מוצרים, כפילויות ואחוזי הפרשה יופעלו לאחר הוספת מודול הדיווחים ל־Backend.</div></>;
}

function Summary({ employer, month, mode, selectedCount, fileName }: { employer: Employer; month: string; mode: ReportMode; selectedCount: number; fileName: string }) {
  const modeLabel = mode === "manual" ? "דיווח ידני" : mode === "excel" ? "קובץ Excel" : "תיקון דיווח";
  return <><div className="card-head"><div><h2>סיכום לפני שליחה</h2><span style={{ color: "var(--muted)" }}>עברו על הנתונים לפני אישור הדיווח</span></div></div><div className="grid two-cols"><div><div className="summary-row"><span>מעסיק</span><b>{employer.legalName}</b></div><div className="summary-row"><span>ח.פ.</span><b>{employer.registrationNumber}</b></div><div className="summary-row"><span>חודש דיווח</span><b>{month}</b></div></div><div><div className="summary-row"><span>אופן דיווח</span><b>{modeLabel}</b></div><div className="summary-row"><span>עובדים</span><b>{mode === "manual" ? selectedCount : "לפי קובץ"}</b></div><div className="summary-row"><span>קובץ</span><b>{fileName || "—"}</b></div></div></div><div className="notice notice-warning" style={{ marginTop: 20 }}>כפתור השליחה נעול בכוונה: אין ב־Backend הנוכחי endpoint ליצירת דיווח, ולכן המערכת אינה מציגה הצלחה מדומה.</div></>;
}
