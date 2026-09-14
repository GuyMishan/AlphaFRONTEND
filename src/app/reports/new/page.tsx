"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, FilePenLine, FileSpreadsheet, Info, Keyboard, Send, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ManualReportData } from "@/components/manual-report-data";
import { ManualDepositData } from "@/components/manual-deposit-data";
import { alphaApi } from "@/lib/api";
import { getEmployerSelection } from "@/lib/session";
import type { Employee, Employer, ReportMode } from "@/lib/types";

const steps = ["פרטי הדיווח", "קליטת נתונים", "נתוני הפקדות", "בדיקות", "סיכום ושליחה"];
const monthNow = new Date().toISOString().slice(0, 7);

export default function NewReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<ReportMode>("manual");
  const [month, setMonth] = useState(monthNow);
  const [salaryPaymentDate, setSalaryPaymentDate] = useState("");
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualReportId, setManualReportId] = useState("");
  const [fileName, setFileName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [scope, setScope] = useState<{ organizationId: string; employerId: string } | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "correction") setMode("correction");
    const selected = getEmployerSelection();
    if (!selected) { setLoading(false); return; }
    setScope(selected);
    Promise.all([alphaApi.employers(selected.organizationId), alphaApi.employees(selected.organizationId, selected.employerId)])
      .then(([employers, employeeItems]) => {
        setEmployer(employers.find((x) => x.id === selected.employerId) ?? null);
        setEmployees(employeeItems);
        setSelectedIds(employeeItems.filter((x) => x.status === 1).map((x) => x.id));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת הנתונים נכשלה"))
      .finally(() => setLoading(false));
  }, []);

  const canContinue = step === 1
    ? Boolean(employer && month && mode)
    : step === 2
      ? mode === "excel" ? Boolean(fileName) : mode === "correction" ? Boolean(reason) : selectedIds.length > 0
      : true;

  function selectFile(event: ChangeEvent<HTMLInputElement>) { setFileName(event.target.files?.[0]?.name ?? ""); }

  async function next() {
    if (step >= 5 || !scope || !employer) return;
    setError(""); setAdvancing(true);
    try {
      if (step === 1 && mode === "manual") {
        if (!manualReportId) {
          const report = await alphaApi.createManualReport(scope.organizationId, scope.employerId, {
            reportingMonth: `${month}-01`, salaryPaymentDate: salaryPaymentDate || null, employmentIds: selectedIds,
          });
          setManualReportId(report.id);
        } else {
          await Promise.all([
            alphaApi.updateManualReportDetails(scope.organizationId, scope.employerId, manualReportId, { reportingMonth: `${month}-01`, salaryPaymentDate: salaryPaymentDate || null }),
            alphaApi.syncManualReportEmployees(scope.organizationId, scope.employerId, manualReportId, selectedIds),
          ]);
        }
      }
      if (step === 2 && mode === "manual" && manualReportId)
        await alphaApi.syncManualReportEmployees(scope.organizationId, scope.employerId, manualReportId, selectedIds);
      setStep((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת הדיווח נכשלה");
    } finally { setAdvancing(false); }
  }

  return <AppShell title="דיווח חדש" hideScopeController={step > 1}>
    <div className="wizard">
      <div className="page-head"><div><h1>יצירת דיווח פנסיוני</h1><p>{employer && scope ? <><Link className="profile-link" href={`/employers/${employer.id}?organizationId=${scope.organizationId}`}>{employer.legalName}</Link> · ח.פ. {employer.registrationNumber}</> : "יש לבחור מעסיק בבורר העליון"}</p></div></div>
      <div className="steps">{steps.map((label, index) => { const number = index + 1; return <div key={label} className={`step${number === step ? " current" : number < step ? " done" : ""}`}><div className="step-number">{number < step ? <Check size={16} /> : number}</div>{label}</div>; })}</div>
      {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}
      {loading ? <div className="card empty">טוען את המעסיק והעובדים מה־Backend...</div> : !employer ? <div className="card empty"><Info size={34} /><h3>עדיין לא נבחר מעסיק</h3><button className="btn btn-primary" onClick={() => router.push("/dashboard")}>לבחירת מעסיק</button></div> : <section className="card">
        {step === 1 ? <ReportDetails mode={mode} setMode={setMode} month={month} setMonth={setMonth} salaryPaymentDate={salaryPaymentDate} setSalaryPaymentDate={setSalaryPaymentDate} /> : null}
        {step === 2 && mode === "manual" && manualReportId && scope ? <ManualReportData organizationId={scope.organizationId} employerId={scope.employerId} reportId={manualReportId} month={month} employees={employees} selectedIds={selectedIds} setSelectedIds={setSelectedIds} /> : null}
        {step === 2 && mode === "excel" ? <ExcelData fileName={fileName} selectFile={selectFile} /> : null}
        {step === 2 && mode === "correction" ? <CorrectionData reason={reason} setReason={setReason} /> : null}
        {step === 3 && mode === "manual" && manualReportId && scope ? <ManualDepositData organizationId={scope.organizationId} employerId={scope.employerId} reportId={manualReportId} /> : null}
        {step === 3 && mode !== "manual" ? <div className="empty"><b>נתוני הפקדות</b><span>יוצגו לאחר קליטת הקובץ או בחירת דיווח המקור.</span></div> : null}
        {step === 4 ? <Validation mode={mode} selectedCount={selectedIds.length} fileName={fileName} /> : null}
        {step === 5 ? <Summary employer={employer} month={month} mode={mode} selectedCount={selectedIds.length} fileName={fileName} /> : null}
        <div className="wizard-footer"><button className="btn btn-secondary" disabled={step === 1 || advancing} onClick={() => setStep((value) => value - 1)}><ArrowRight size={17} />חזרה</button>{step < 5 ? <button className="btn btn-primary" disabled={!canContinue || advancing} onClick={() => void next()}>{advancing ? "שומר..." : "המשך"}<ArrowLeft size={17} /></button> : <button className="btn btn-primary" disabled title="שליחת הדיווח לגופים תתווסף בהמשך"><Send size={17} />שליחת דיווח</button>}</div>
      </section>}
    </div>
  </AppShell>;
}

function ReportDetails({ mode, setMode, month, setMonth, salaryPaymentDate, setSalaryPaymentDate }: { mode: ReportMode; setMode: (value: ReportMode) => void; month: string; setMonth: (value: string) => void; salaryPaymentDate: string; setSalaryPaymentDate: (value: string) => void }) {
  const choices = [
    { value: "manual" as const, icon: Keyboard, title: "דיווח ידני", text: "רשימת עובדים, מוצרים והפקדות לכל עובד" },
    { value: "excel" as const, icon: FileSpreadsheet, title: "קובץ Excel", text: "העלאת קובץ שכר, התאמת עמודות ובדיקת הנתונים" },
    { value: "correction" as const, icon: FilePenLine, title: "תיקון דיווח", text: "תיקון דיווח קיים או יצירת דיווח הפרשים" },
  ];
  return <><div className="card-head"><div><h2>איך תרצו לדווח?</h2><span style={{ color: "var(--muted)" }}>בחרו תקופה ואופן קליטת הנתונים</span></div></div><div className="grid two-cols" style={{ marginBottom: 24 }}><div className="field"><label htmlFor="month">חודש דיווח</label><input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div><div className="field"><label htmlFor="salary-date">תאריך תשלום שכר</label><input id="salary-date" type="date" value={salaryPaymentDate} onChange={(e) => setSalaryPaymentDate(e.target.value)} /></div></div><div className="grid choice-grid">{choices.map(({ value, icon: Icon, title, text }) => <button key={value} className={`choice-card${mode === value ? " selected" : ""}`} onClick={() => setMode(value)}><Icon className="choice-icon" size={28} /><b>{title}</b><p>{text}</p></button>)}</div></>;
}

function ExcelData({ fileName, selectFile }: { fileName: string; selectFile: (event: ChangeEvent<HTMLInputElement>) => void }) { return <><div className="card-head"><div><h2>העלאת קובץ שכר</h2><span style={{ color: "var(--muted)" }}>קובצי Excel בלבד, עד 10MB</span></div></div><label className="upload-zone" htmlFor="excel-file"><UploadCloud size={38} /><h3>{fileName || "גררו קובץ לכאן או בחרו מהמחשב"}</h3><p>הקובץ ייבדק לפני המשך התהליך</p><span className="btn btn-soft">בחירת קובץ</span><input id="excel-file" type="file" accept=".xlsx,.xls,.csv" hidden onChange={selectFile} /></label></>; }
function CorrectionData({ reason, setReason }: { reason: string; setReason: (value: string) => void }) { return <><div className="card-head"><div><h2>פרטי התיקון</h2></div></div><div className="field"><label htmlFor="reason">סיבת התיקון</label><textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} /></div></>; }
function Validation({ mode, selectedCount, fileName }: { mode: ReportMode; selectedCount: number; fileName: string }) { return <><div className="card-head"><div><h2>בדיקות ובקרות</h2><span style={{ color: "var(--muted)" }}>בדיקות תקינות לפני שליחה</span></div></div><div className="grid two-cols"><div className="notice notice-info"><Check size={17} />המעסיק וההרשאות אומתו</div><div className="notice notice-info"><Check size={17} />{mode === "manual" ? `${selectedCount} עובדים בטיוטה` : fileName || "הנתונים נקלטו"}</div></div></>; }
function Summary({ employer, month, mode, selectedCount, fileName }: { employer: Employer; month: string; mode: ReportMode; selectedCount: number; fileName: string }) { const modeLabel = mode === "manual" ? "דיווח ידני" : mode === "excel" ? "קובץ Excel" : "תיקון דיווח"; return <><div className="card-head"><div><h2>סיכום הדיווח</h2><span style={{ color: "var(--muted)" }}>הדיווח עדיין בטיוטה.</span></div></div><div className="summary-row"><b>מעסיק</b><span>{employer.legalName}</span></div><div className="summary-row"><b>חודש דיווח</b><span>{month}</span></div><div className="summary-row"><b>אופן דיווח</b><span>{modeLabel}</span></div><div className="summary-row"><b>{mode === "manual" ? "עובדים" : "מקור"}</b><span>{mode === "manual" ? selectedCount : fileName || "—"}</span></div></>; }
