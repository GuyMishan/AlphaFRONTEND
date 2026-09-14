"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, FilePenLine, FileSpreadsheet, Info, Keyboard, Send, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ManualReportData } from "@/components/manual-report-data";
import { ManualDepositData } from "@/components/manual-deposit-data";
import { alphaApi } from "@/lib/api";
import { openReportsApi, type OpenManualReportSummary } from "@/lib/open-reports-api";
import { getEmployerSelection } from "@/lib/session";
import type { Employee, Employer, ReportMode } from "@/lib/types";

const steps = ["פרטי הדיווח", "רשימת עובדים", "נתוני הפקדות", "סיכום ושליחה"];
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [scope, setScope] = useState<{ organizationId: string; employerId: string } | null>(null);
  const [openReports, setOpenReports] = useState<OpenManualReportSummary[]>([]);
  const [loadingOpenReports, setLoadingOpenReports] = useState(false);
  const [selectedCorrectionReportId, setSelectedCorrectionReportId] = useState("");

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

  useEffect(() => {
    if (mode !== "correction" || !scope) return;
    setLoadingOpenReports(true);
    setSelectedCorrectionReportId("");
    openReportsApi.list(scope.organizationId, scope.employerId, 0, 50)
      .then((result) => setOpenReports(result.items))
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת הדיווחים הפתוחים נכשלה"))
      .finally(() => setLoadingOpenReports(false));
  }, [mode, scope]);

  const canContinue = step === 1
    ? mode === "correction"
      ? Boolean(employer && selectedCorrectionReportId)
      : Boolean(employer && month && mode)
    : step === 2
      ? mode === "excel" ? Boolean(fileName) : selectedIds.length > 0
      : true;

  function selectFile(event: ChangeEvent<HTMLInputElement>) { setFileName(event.target.files?.[0]?.name ?? ""); }

  async function loadCorrectionReport(reportId: string) {
    if (!scope) return;
    const report = await openReportsApi.report(scope.organizationId, scope.employerId, reportId);
    const ids: string[] = [];
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const page = await openReportsApi.employees(scope.organizationId, scope.employerId, reportId, skip, 100);
      ids.push(...page.items.map((item) => item.employmentId));
      hasMore = page.hasMore;
      skip += page.items.length;
      if (page.items.length === 0) break;
    }
    setManualReportId(report.id);
    setMonth(report.reportingMonth.slice(0, 7));
    setSalaryPaymentDate(report.salaryPaymentDate?.slice(0, 10) ?? "");
    setSelectedIds(ids);
  }

  async function next() {
    if (step >= 4 || !scope || !employer) return;
    setError(""); setAdvancing(true);
    try {
      if (step === 1 && mode === "manual") {
        if (!manualReportId) {
          const report = await alphaApi.createManualReport(scope.organizationId, scope.employerId, {
            reportingMonth: `${month}-01`, salaryPaymentDate: salaryPaymentDate || null, employmentIds: selectedIds,
          });
          setManualReportId(report.id);
        }
      }
      if (step === 1 && mode === "correction") {
        await loadCorrectionReport(selectedCorrectionReportId);
      }
      if (step === 2 && (mode === "manual" || mode === "correction") && manualReportId) {
        await alphaApi.syncManualReportEmployees(scope.organizationId, scope.employerId, manualReportId, selectedIds);
      }
      setStep((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת הדיווח נכשלה");
    } finally { setAdvancing(false); }
  }

  const isReportScopedFlow = mode === "manual" || mode === "correction";
  const pageTitle = mode === "correction" ? "טיפול בדיווח קיים" : "יצירת דיווח פנסיוני";

  return <AppShell title="דיווח חדש" hideScopeController={step > 1}>
    <div className="wizard">
      <div className="page-head"><div><h1>{pageTitle}</h1><p>{employer && scope ? <><Link className="profile-link" href={`/employers/${employer.id}?organizationId=${scope.organizationId}`}>{employer.legalName}</Link> · ח.פ. {employer.registrationNumber}</> : "יש לבחור מעסיק בבורר העליון"}</p></div></div>
      <div className="steps">{steps.map((label, index) => { const number = index + 1; return <div key={label} className={`step${number === step ? " current" : number < step ? " done" : ""}`}><div className="step-number">{number < step ? <Check size={16} /> : number}</div>{label}</div>; })}</div>
      {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}
      {loading ? <div className="card empty">טוען את המעסיק והעובדים מה־Backend...</div> : !employer ? <div className="card empty"><Info size={34} /><h3>עדיין לא נבחר מעסיק</h3><button className="btn btn-primary" onClick={() => router.push("/dashboard")}>לבחירת מעסיק</button></div> : <section className="card">
        {step === 1 ? <ReportDetails
          mode={mode}
          setMode={setMode}
          month={month}
          setMonth={setMonth}
          salaryPaymentDate={salaryPaymentDate}
          setSalaryPaymentDate={setSalaryPaymentDate}
          openReports={openReports}
          loadingOpenReports={loadingOpenReports}
          selectedCorrectionReportId={selectedCorrectionReportId}
          setSelectedCorrectionReportId={setSelectedCorrectionReportId}
        /> : null}
        {step === 2 && isReportScopedFlow && manualReportId && scope ? <ManualReportData organizationId={scope.organizationId} employerId={scope.employerId} reportId={manualReportId} month={month} employees={employees} selectedIds={selectedIds} setSelectedIds={setSelectedIds} /> : null}
        {step === 2 && mode === "excel" ? <ExcelData fileName={fileName} selectFile={selectFile} /> : null}
        {step === 3 && isReportScopedFlow && manualReportId && scope ? <ManualDepositData organizationId={scope.organizationId} employerId={scope.employerId} reportId={manualReportId} /> : null}
        {step === 3 && mode === "excel" ? <div className="empty"><b>נתוני הפקדות</b><span>יוצגו לאחר קליטת הקובץ.</span></div> : null}
        {step === 4 ? <Summary employer={employer} month={month} mode={mode} selectedCount={selectedIds.length} fileName={fileName} /> : null}
        <div className="wizard-footer"><button className="btn btn-secondary" disabled={step === 1 || advancing} onClick={() => setStep((value) => value - 1)}><ArrowRight size={17} />חזרה</button>{step < 4 ? <button className="btn btn-primary" disabled={!canContinue || advancing} onClick={() => void next()}>{advancing ? "שומר..." : "המשך"}<ArrowLeft size={17} /></button> : <button className="btn btn-primary" disabled title="שליחת הדיווח לגופים תתווסף בהמשך"><Send size={17} />שליחת דיווח</button>}</div>
      </section>}
    </div>
  </AppShell>;
}

function ReportDetails({ mode, setMode, month, setMonth, salaryPaymentDate, setSalaryPaymentDate, openReports, loadingOpenReports, selectedCorrectionReportId, setSelectedCorrectionReportId }: {
  mode: ReportMode;
  setMode: (value: ReportMode) => void;
  month: string;
  setMonth: (value: string) => void;
  salaryPaymentDate: string;
  setSalaryPaymentDate: (value: string) => void;
  openReports: OpenManualReportSummary[];
  loadingOpenReports: boolean;
  selectedCorrectionReportId: string;
  setSelectedCorrectionReportId: (value: string) => void;
}) {
  const choices = [
    { value: "manual" as const, icon: Keyboard, title: "דיווח ידני", text: "יצירת דיווח חדש עם רשימת עובדים, מוצרים והפקדות השייכים לדיווח הזה בלבד" },
    { value: "excel" as const, icon: FileSpreadsheet, title: "קובץ Excel", text: "העלאת קובץ שכר, התאמת עמודות ובדיקת הנתונים" },
    { value: "correction" as const, icon: FilePenLine, title: "תיקון דיווח", text: "בחירת דיווח קיים שעדיין פתוח לטיפול והמשך עבודה עליו" },
  ];
  return <>
    <div className="card-head"><div><h2>איך תרצו לדווח?</h2><span style={{ color: "var(--muted)" }}>{mode === "correction" ? "בחרו דיווח קיים שטרם הושלם" : "בחרו תקופה ואופן קליטת הנתונים"}</span></div></div>
    {mode !== "correction" ? <div className="grid two-cols" style={{ marginBottom: 24 }}><div className="field"><label htmlFor="month">חודש דיווח</label><input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} required /></div><div className="field"><label htmlFor="salary-date">תאריך תשלום שכר</label><input id="salary-date" type="date" value={salaryPaymentDate} onChange={(e) => setSalaryPaymentDate(e.target.value)} /></div></div> : null}
    <div className="grid choice-grid">{choices.map(({ value, icon: Icon, title, text }) => <button key={value} className={`choice-card${mode === value ? " selected" : ""}`} onClick={() => setMode(value)}><Icon className="choice-icon" size={28} /><b>{title}</b><p>{text}</p></button>)}</div>
    {mode === "correction" ? <OpenReportsList reports={openReports} loading={loadingOpenReports} selectedId={selectedCorrectionReportId} setSelectedId={setSelectedCorrectionReportId} /> : null}
  </>;
}

function OpenReportsList({ reports, loading, selectedId, setSelectedId }: { reports: OpenManualReportSummary[]; loading: boolean; selectedId: string; setSelectedId: (value: string) => void }) {
  const statusLabel: Record<string, string> = { "1": "טיוטה", "2": "מוכן לבדיקה", "3": "מאומת" };
  return <div style={{ marginTop: 24 }}>
    <div className="card-head"><div><h3 style={{ margin: 0 }}>דיווחים פתוחים לטיפול</h3><span style={{ color: "var(--muted)" }}>רק דיווחים שלא נשלחו/נסגרו מוצגים כאן.</span></div></div>
    {loading ? <div className="empty">טוען דיווחים פתוחים...</div> : reports.length === 0 ? <div className="empty"><b>אין דיווחים פתוחים</b><span>לא נמצאו דיווחים שדורשים המשך טיפול אצל המעסיק הזה.</span></div> : <div className="manual-employee-list">{reports.map((report) => {
      const selected = report.id === selectedId;
      return <button type="button" key={report.id} className={`manual-employee-row correction-report-row${selected ? " selected" : ""}`} onClick={() => setSelectedId(report.id)}>
        <span className="manual-employee-check"><input type="radio" readOnly checked={selected} /></span>
        <span className="manual-employee-main"><b>חודש {report.reportingMonth.slice(0, 7)}</b><span>{report.employeeCount} עובדים · {report.productCount} מוצרים · עודכן {new Date(report.updatedAt).toLocaleDateString("he-IL")}</span></span>
        <span className="badge badge-orange">{statusLabel[String(report.status)] ?? `סטטוס ${report.status}`}</span>
      </button>;
    })}</div>}
  </div>;
}

function ExcelData({ fileName, selectFile }: { fileName: string; selectFile: (event: ChangeEvent<HTMLInputElement>) => void }) { return <><div className="card-head"><div><h2>העלאת קובץ שכר</h2><span style={{ color: "var(--muted)" }}>קובצי Excel בלבד, עד 10MB</span></div></div><label className="upload-zone" htmlFor="excel-file"><UploadCloud size={38} /><h3>{fileName || "גררו קובץ לכאן או בחרו מהמחשב"}</h3><p>הקובץ ייבדק לפני המשך התהליך</p><span className="btn btn-soft">בחירת קובץ</span><input id="excel-file" type="file" accept=".xlsx,.xls,.csv" hidden onChange={selectFile} /></label></>; }
function Summary({ employer, month, mode, selectedCount, fileName }: { employer: Employer; month: string; mode: ReportMode; selectedCount: number; fileName: string }) { const modeLabel = mode === "manual" ? "דיווח ידני" : mode === "excel" ? "קובץ Excel" : "טיפול בדיווח קיים"; return <><div className="card-head"><div><h2>סיכום הדיווח</h2><span style={{ color: "var(--muted)" }}>הנתונים במסך הזה שייכים לדיווח הנוכחי בלבד.</span></div></div><div className="summary-row"><b>מעסיק</b><span>{employer.legalName}</span></div><div className="summary-row"><b>חודש דיווח</b><span>{month}</span></div><div className="summary-row"><b>אופן דיווח</b><span>{modeLabel}</span></div><div className="summary-row"><b>{mode === "excel" ? "מקור" : "עובדים בדיווח"}</b><span>{mode === "excel" ? fileName || "—" : selectedCount}</span></div></>; }
