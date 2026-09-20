"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, FilePenLine, FileSpreadsheet, Info, Keyboard, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BillingGateModal } from "@/components/billing-gate-modal";
import { ExcelEmployeeIntake, type ExcelEmployeeIntakeResult } from "@/components/excel-employee-intake";
import { EmployerInterfaceXmlIntake } from "@/components/employer-interface-xml-intake";
import { ManualReportData } from "@/components/manual-report-data";
import { ManualDepositData } from "@/components/manual-deposit-data";
import { alphaApi } from "@/lib/api";
import { derivedReportsApi } from "@/lib/derived-reports-api";
import { reportValidationApi } from "@/lib/report-validation-api";
import { reportTransmissionApi } from "@/lib/report-transmission-api";
import { getEmployerSelection } from "@/lib/session";
import type { BillingGateStatus, Employee, Employer, EmployerPaymentAccount, ManualReportKind, ReportMode, SourceManualReport } from "@/lib/types";

const manualSteps = ["פרטי הדיווח", "רשימת עובדים", "נתוני הפקדות", "סיכום ושליחה"];
const excelSteps = ["פרטי הדיווח", "העלאת קובץ שכר", "רשימת עובדים", "נתוני הפקדות", "סיכום ושליחה"];
const monthNow = new Date().toISOString().slice(0, 7);
type IntakeMode = Extract<ReportMode, "manual" | "excel">;

const reportKindLabel: Record<ManualReportKind, string> = { 1: "דיווח שוטף", 2: "דיווח הפרשים", 3: "דיווח שלילי" };
function kindLabel(value: string | number | undefined) { if (value === 2 || value === "2" || value === "Differences") return "הפרשים"; if (value === 3 || value === "3" || value === "Negative") return "שלילי"; return "שוטף"; }
function formatMonth(value: string) { const [year, month] = value.slice(0, 7).split("-"); return month && year ? `${month}/${year}` : value; }
function defaultSalaryDate(month: string, day: number | null) {
  if (!day || !/^\d{4}-\d{2}$/.test(month)) return "";
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function validationMessage(errors: string[]) {
  if (!errors.length) return "בדיקת הדיווח נכשלה.";

  const missingSalary = errors.filter((error) => error.includes("חסר שכר חודשי")).length;
  const missingPensionProduct = errors.filter((error) => error.includes("אין מוצר פנסיוני בדיווח")).length;
  const categorized = missingSalary + missingPensionProduct;
  const otherErrors = errors.length - categorized;
  const parts: string[] = [];

  if (missingSalary) parts.push(`חסר שכר חודשי ל־${missingSalary} עובדים`);
  if (missingPensionProduct) parts.push(`חסר מוצר פנסיוני ל־${missingPensionProduct} עובדים`);
  if (otherErrors) parts.push(`${otherErrors} שגיאות נוספות`);

  return `לא ניתן להמשיך: ${parts.join(", ")}.`;
}

export default function NewReportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [reportKind, setReportKind] = useState<ManualReportKind>(1);
  const [mode, setMode] = useState<IntakeMode>("manual");
  const [month, setMonth] = useState(monthNow);
  const [salaryPaymentDate, setSalaryPaymentDate] = useState("");
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualReportId, setManualReportId] = useState("");
  const [fileName, setFileName] = useState("");
  const [excelIntake, setExcelIntake] = useState<ExcelEmployeeIntakeResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentExternalId, setSentExternalId] = useState("");
  const [scope, setScope] = useState<{ organizationId: string; employerId: string } | null>(null);
  const [sourceReports, setSourceReports] = useState<SourceManualReport[]>([]);
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourceHasMore, setSourceHasMore] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [selectedSourceReportId, setSelectedSourceReportId] = useState("");
  const [canCreateReport, setCanCreateReport] = useState(false);
  const [canTransmitReport, setCanTransmitReport] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<EmployerPaymentAccount[]>([]);
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState("");
  const [billingGate, setBillingGate] = useState<BillingGateStatus | null>(null);

  const selectedSource = useMemo(() => sourceReports.find((report) => report.id === selectedSourceReportId) ?? null, [sourceReports, selectedSourceReportId]);
  const isExcel = reportKind === 1 && mode === "excel";
  const summaryStep = isExcel ? 5 : 4;

  async function loadScope(nextScope: { organizationId: string; employerId: string }) {
    setLoading(true); setError(""); setScope(nextScope); setManualReportId(""); setSelectedSourceReportId(""); setSourceReports([]); setExcelIntake(null); setFileName(""); setSentExternalId(""); setBillingGate(null);
    try {
      const [employerItem, employeePage, capabilities, profileSettings, accountRows, billingGateStatus] = await Promise.all([
        alphaApi.employer(nextScope.organizationId, nextScope.employerId),
        alphaApi.employeeSearch(nextScope.organizationId, nextScope.employerId, "", 0, 100),
        alphaApi.employerCapabilities(nextScope.organizationId, nextScope.employerId),
        alphaApi.employerProfileCenterSettings(nextScope.organizationId, nextScope.employerId),
        alphaApi.employerPaymentAccounts(nextScope.organizationId, nextScope.employerId),
        alphaApi.employerBillingGate(nextScope.organizationId, nextScope.employerId),
      ]);
      setEmployer(employerItem);
      setCanCreateReport(capabilities.canCreateReport);
      setCanTransmitReport(capabilities.canTransmitReport);
      setEmployees(employeePage.items);
      setSelectedIds(employeePage.items.filter((x) => x.status === 1).map((x) => x.id));
      setPaymentAccounts(accountRows);
      setSelectedPaymentAccountId(accountRows.find((x) => x.isDefault)?.id ?? accountRows[0]?.id ?? "");
      setBillingGate(billingGateStatus);
      if (!salaryPaymentDate) {
        setSalaryPaymentDate(defaultSalaryDate(month, profileSettings.reporting.defaultSalaryPaymentDay));
      }
    } catch (err) { setError(err instanceof Error ? err.message : "טעינת הנתונים נכשלה"); }
    finally { setLoading(false); }
  }

  async function loadSources(reset = true, search = sourceSearch) {
    if (!scope) return;
    setLoadingSources(true);
    try {
      const skip = reset ? 0 : sourceReports.length;
      const result = await derivedReportsApi.sourceReports(scope.organizationId, scope.employerId, search.trim(), skip, 30);
      setSourceReports((current) => reset ? result.items : [...current, ...result.items]);
      setSourceHasMore(result.hasMore);
      if (reset) setSelectedSourceReportId("");
    } catch (err) { setError(err instanceof Error ? err.message : "טעינת הדיווחים הקודמים נכשלה"); }
    finally { setLoadingSources(false); }
  }

  async function loadReportEmploymentIds(reportId: string) {
    if (!scope) return [] as string[];
    const ids: string[] = []; let skip = 0; let hasMore = true;
    while (hasMore && ids.length < 5000) {
      const page = await alphaApi.manualReportEmployees(scope.organizationId, scope.employerId, reportId, "", skip, 100);
      ids.push(...page.items.map((item) => item.employmentId)); hasMore = page.hasMore; skip += page.items.length;
      if (page.items.length === 0) break;
    }
    return ids;
  }

  useEffect(() => { const selected = getEmployerSelection(); if (selected) void loadScope(selected); else setLoading(false); }, []);
  useEffect(() => { const handler = (event: Event) => { if (step !== 1) return; const detail = (event as CustomEvent<{ organizationId: string; employerId?: string }>).detail; if (detail.employerId) void loadScope({ organizationId: detail.organizationId, employerId: detail.employerId }); }; window.addEventListener("alpha:scope-change", handler); return () => window.removeEventListener("alpha:scope-change", handler); }, [step]);
  useEffect(() => { if (reportKind === 1 || !scope) return; setMode("manual"); setManualReportId(""); setSourceSearch(""); setSentExternalId(""); void loadSources(true, ""); }, [reportKind, scope?.organizationId, scope?.employerId]);
  useEffect(() => {
    if (!scope || step !== summaryStep) return;
    alphaApi.employerBillingGate(scope.organizationId, scope.employerId)
      .then(setBillingGate)
      .catch(() => setBillingGate(null));
  }, [step, summaryStep, scope?.organizationId, scope?.employerId]);

  function chooseSource(report: SourceManualReport) { setSelectedSourceReportId(report.id); setMonth(report.reportingMonth.slice(0, 7)); setSalaryPaymentDate(report.salaryPaymentDate?.slice(0, 10) ?? ""); setError(""); setSentExternalId(""); }
  function chooseKind(kind: ManualReportKind) { setReportKind(kind); setManualReportId(""); setSelectedSourceReportId(""); setFileName(""); setExcelIntake(null); setError(""); setSentExternalId(""); if (kind !== 1) setMode("manual"); }
  function chooseMode(value: IntakeMode) { setMode(value); setManualReportId(""); setFileName(""); setExcelIntake(null); setError(""); setSentExternalId(""); setStep(1); }

  const canContinue = step === 1
    ? Boolean(employer && month && salaryPaymentDate && selectedPaymentAccountId && (reportKind === 1 || selectedSourceReportId))
    : isExcel && step === 2
      ? Boolean(excelIntake && excelIntake.blockedCount === 0 && excelIntake.matchedEmploymentIds.length + excelIntake.newEmployees.length > 0)
      : (isExcel ? step === 3 : step === 2)
        ? selectedIds.length > 0
        : true;

  function validateStepOne() {
    if (!employer || !scope) return "יש לבחור ארגון ומעסיק.";
    if (!/^\d{4}-\d{2}$/.test(month)) return "חודש דיווח הוא שדה חובה.";
    if (!salaryPaymentDate) return "תאריך תשלום שכר הוא שדה חובה.";
    if (!selectedPaymentAccountId) return "יש לבחור חשבון תשלום לדיווח.";
    if (reportKind !== 1 && !selectedSourceReportId) return "יש לבחור את הדיווח הקודם שעליו מבוסס הדיווח.";
    return "";
  }

  async function validatePersistedReport(stage: "employees" | "deposits") {
    if (!scope || !manualReportId) return;
    const result = await reportValidationApi.validate(scope.organizationId, scope.employerId, manualReportId, stage);
    if (!result.isValid) throw new Error(validationMessage(result.errors));
  }

  async function processExcelEmployees() {
    if (!scope || !excelIntake) throw new Error("יש להעלות ולבדוק קובץ שכר לפני שממשיכים.");
    if (excelIntake.blockedCount) throw new Error("יש שורות חסומות בקובץ. תקנו את הקובץ והעלו אותו מחדש לפני המשך.");

    const created: Employee[] = [];
    const createdIds: string[] = [];
    for (const input of excelIntake.newEmployees) {
      const saved = await alphaApi.createEmployee(scope.organizationId, scope.employerId, input);
      createdIds.push(saved.id);
      created.push({ id: saved.id, personId: saved.personId, ...input, status: 1, endDate: null });
    }
    const employmentIds = Array.from(new Set([...excelIntake.matchedEmploymentIds, ...createdIds]));
    if (!employmentIds.length) throw new Error("לא נמצאו עובדים תקינים להוספה לדיווח.");

    if (!manualReportId) {
      const report = await alphaApi.createManualReport(scope.organizationId, scope.employerId, { reportingMonth: `${month}-01`, salaryPaymentDate, employmentIds, paymentAccountId: selectedPaymentAccountId });
      setManualReportId(report.id);
    } else {
      await alphaApi.syncManualReportEmployees(scope.organizationId, scope.employerId, manualReportId, employmentIds);
    }
    setEmployees((current) => [...created, ...current.filter((item) => !created.some((createdEmployee) => createdEmployee.id === item.id))]);
    setSelectedIds(employmentIds);
    setExcelIntake({ ...excelIntake, matchedEmploymentIds: employmentIds, newEmployees: [] });
  }

  async function next() {
    if (step >= summaryStep || !scope || !employer || !canCreateReport) return;
    setError(""); setAdvancing(true);
    try {
      if (step === 1) {
        const localError = validateStepOne();
        if (localError) throw new Error(localError);
        if (reportKind === 1 && mode === "manual" && !manualReportId) {
          const report = await alphaApi.createManualReport(scope.organizationId, scope.employerId, { reportingMonth: `${month}-01`, salaryPaymentDate, employmentIds: selectedIds, paymentAccountId: selectedPaymentAccountId });
          setManualReportId(report.id);
        }
        if (reportKind !== 1 && !manualReportId) {
          const report = await derivedReportsApi.create(scope.organizationId, scope.employerId, { sourceReportId: selectedSourceReportId, reportKind, reportingMonth: `${month}-01`, salaryPaymentDate, paymentAccountId: selectedPaymentAccountId });
          setManualReportId(report.id); setSelectedIds(await loadReportEmploymentIds(report.id));
        }
      }
      if (step === 1 && manualReportId) {
        await alphaApi.updateManualReportPaymentAccount(scope.organizationId, scope.employerId, manualReportId, selectedPaymentAccountId);
      }

      if (isExcel && step === 2) await processExcelEmployees();

      const employeeStep = isExcel ? 3 : 2;
      const depositsStep = isExcel ? 4 : 3;
      if (step === employeeStep && manualReportId) {
        if (!selectedIds.length) throw new Error("יש לבחור לפחות עובד אחד לדיווח.");
        await alphaApi.syncManualReportEmployees(scope.organizationId, scope.employerId, manualReportId, selectedIds);
        await validatePersistedReport("employees");
      }
      if (step === depositsStep && manualReportId) await validatePersistedReport("deposits");
      setStep((value) => value + 1);
    } catch (err) { setError(err instanceof Error ? err.message : "בדיקת הדיווח נכשלה"); }
    finally { setAdvancing(false); }
  }

  async function sendReport() {
    if (!scope || !manualReportId || sending || sentExternalId || !canTransmitReport) return;
    setSending(true);
    try {
      const freshBillingGate = await alphaApi.employerBillingGate(scope.organizationId, scope.employerId);
      setBillingGate(freshBillingGate);
      if (!freshBillingGate.canTransmit) return;
      const validation = await reportValidationApi.commit(scope.organizationId, scope.employerId, manualReportId, "final");
      if (!validation.isValid) throw new Error(validationMessage(validation.errors));
      const result = await reportTransmissionApi.send(scope.organizationId, scope.employerId, manualReportId);
      setSentExternalId(result.transmission.externalId || result.transmission.id);
      toast.success("הדיווח נשלח בהצלחה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחת הדיווח נכשלה");
    } finally {
      setSending(false);
    }
  }

  const steps = isExcel ? excelSteps : manualSteps;
  return <AppShell title="דיווח חדש" hideScopeController={step > 1}><div className="wizard"><div className="page-head"><div><h1>יצירת דיווח פנסיוני</h1><p>{employer && scope ? <><Link className="profile-link" href={`/employers/${employer.id}?organizationId=${scope.organizationId}`}>{employer.legalName}</Link>{` · ח.פ. ${employer.registrationNumber}`}</> : "יש לבחור מעסיק בבורר העליון"}</p></div></div><ReportTypeBanner reportKind={reportKind} source={selectedSource} month={month} /><div className="steps">{steps.map((label, index) => { const number = index + 1; return <div key={label} className={`step${number === step ? " current" : number < step ? " done" : ""}`}><div className="step-number">{number < step ? <Check size={16} /> : number}</div>{label}</div>; })}</div>{error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}{!loading && employer && !canCreateReport ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה במעסיק, אך אין לך הרשאה ליצור או לערוך דיווחים.</div> : null}{loading ? <div className="card empty">טוען את המעסיק והעובדים...</div> : !employer ? <div className="card empty"><Info size={34} /><h3>עדיין לא נבחר מעסיק</h3><button className="btn btn-primary" onClick={() => router.push("/dashboard")}>לבחירת מעסיק</button></div> : <section className="card">
    {step === 1 && scope ? <EmployerInterfaceXmlIntake organizationId={scope.organizationId} employerId={scope.employerId} disabled={!canCreateReport} onReportImported={() => router.push("/reports")} /> : null}
    {step === 1 ? <ReportDetails reportKind={reportKind} setReportKind={chooseKind} mode={mode} setMode={chooseMode} month={month} setMonth={setMonth} salaryPaymentDate={salaryPaymentDate} setSalaryPaymentDate={setSalaryPaymentDate} paymentAccounts={paymentAccounts} selectedPaymentAccountId={selectedPaymentAccountId} setSelectedPaymentAccountId={setSelectedPaymentAccountId} sourceReports={sourceReports} sourceSearch={sourceSearch} setSourceSearch={setSourceSearch} sourceHasMore={sourceHasMore} loadingSources={loadingSources} selectedSourceReportId={selectedSourceReportId} chooseSource={chooseSource} searchSources={() => void loadSources(true, sourceSearch)} loadMoreSources={() => void loadSources(false, sourceSearch)} /> : null}
    {step === 2 && isExcel && scope ? <ExcelEmployeeIntake organizationId={scope.organizationId} employerId={scope.employerId} reportingMonth={month} onChange={(result) => { setExcelIntake(result); setFileName(result?.fileName ?? ""); setError(""); }} /> : null}
    {((!isExcel && step === 2) || (isExcel && step === 3)) && manualReportId && scope ? <ManualReportData organizationId={scope.organizationId} employerId={scope.employerId} reportId={manualReportId} month={month} employees={employees} selectedIds={selectedIds} setSelectedIds={setSelectedIds} /> : null}
    {((!isExcel && step === 3) || (isExcel && step === 4)) && manualReportId && scope ? <ManualDepositData organizationId={scope.organizationId} employerId={scope.employerId} reportId={manualReportId} /> : null}
    {step === summaryStep ? <>
      <Summary employer={employer} month={month} reportKind={reportKind} mode={mode} selectedCount={selectedIds.length} fileName={fileName} source={selectedSource} paymentAccount={paymentAccounts.find((x) => x.id === selectedPaymentAccountId) ?? null} sentExternalId={sentExternalId} />
      
      {billingGate?.canTransmit ? <div className="notice notice-info" style={{ marginTop: 18 }}><b>חיוב Alpha תקין לשידור</b>{billingGate.billedThroughName ? <div>מחויב דרך: {billingGate.billedThroughName}</div> : null}</div> : null}
    </> : null}
    <div className="wizard-footer"><button className="btn btn-secondary" disabled={step === 1 || advancing || sending || Boolean(sentExternalId)} onClick={() => { setError(""); setStep((value) => value - 1); }}><ArrowRight size={17} />חזרה</button>{step < summaryStep ? <button className="btn btn-primary" disabled={!canContinue || advancing || !canCreateReport} onClick={() => void next()}>{advancing ? "בודק ושומר..." : isExcel && step === 2 ? "אישור עובדים והמשך" : "המשך"}<ArrowLeft size={17} /></button> : <button className="btn btn-primary" disabled={sending || Boolean(sentExternalId) || !manualReportId || !canTransmitReport || billingGate?.canTransmit === false} onClick={() => void sendReport()}><Send size={17} />{sending ? "מבצע ולידציה ושולח..." : sentExternalId ? "הדיווח נשלח" : "שליחת דיווח"}</button>}</div>
  </section>}</div>{scope && billingGate && !billingGate.canTransmit ? <BillingGateModal gate={billingGate} organizationId={scope.organizationId} employerId={scope.employerId} /> : null}</AppShell>;
}

function ReportTypeBanner({ reportKind, source, month }: { reportKind: ManualReportKind; source: SourceManualReport | null; month: string }) { return <div className="notice" style={{ marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}><b>סוג הדיווח: {reportKindLabel[reportKind]}</b><span>· חודש {formatMonth(month)}</span>{reportKind !== 1 && source ? <span>· מתקן דיווח מחודש {formatMonth(source.reportingMonth)}</span> : null}</div>; }

function ReportDetails({ reportKind, setReportKind, mode, setMode, month, setMonth, salaryPaymentDate, setSalaryPaymentDate, paymentAccounts, selectedPaymentAccountId, setSelectedPaymentAccountId, sourceReports, sourceSearch, setSourceSearch, sourceHasMore, loadingSources, selectedSourceReportId, chooseSource, searchSources, loadMoreSources }: { reportKind: ManualReportKind; setReportKind: (value: ManualReportKind) => void; mode: IntakeMode; setMode: (value: IntakeMode) => void; month: string; setMonth: (value: string) => void; salaryPaymentDate: string; setSalaryPaymentDate: (value: string) => void; paymentAccounts: EmployerPaymentAccount[]; selectedPaymentAccountId: string; setSelectedPaymentAccountId: (value: string) => void; sourceReports: SourceManualReport[]; sourceSearch: string; setSourceSearch: (value: string) => void; sourceHasMore: boolean; loadingSources: boolean; selectedSourceReportId: string; chooseSource: (report: SourceManualReport) => void; searchSources: () => void; loadMoreSources: () => void; }) {
  const kindChoices: { value: ManualReportKind; icon: typeof Keyboard; title: string; text: string }[] = [{ value: 1, icon: Keyboard, title: "דיווח שוטף", text: "הדיווח החודשי הרגיל עבור תקופת השכר שנבחרה" }, { value: 2, icon: FilePenLine, title: "דיווח הפרשים", text: "דיווח המשלים סכומים ביחס לדיווח קודם" }, { value: 3, icon: FilePenLine, title: "דיווח שלילי", text: "הפחתה או ביטול של נתונים שכבר דווחו בדיווח קודם" }];
  return <><div className="card-head"><div><h2>סוג הדיווח</h2><span style={{ color: "var(--muted)" }}>בחרו קודם מה מטרת הדיווח. הבחירה תישאר מוצגת לאורך כל התהליך.</span></div></div><div className="grid choice-grid" style={{ marginBottom: 24 }}>{kindChoices.map(({ value, icon: Icon, title, text }) => <button type="button" key={value} className={`choice-card${reportKind === value ? " selected" : ""}`} onClick={() => setReportKind(value)}><Icon className="choice-icon" size={28} /><b>{title}</b><p>{text}</p></button>)}</div>{reportKind === 1 ? <><div className="grid two-cols" style={{ marginBottom: 24 }}><div className="field"><label htmlFor="month">חודש דיווח *</label><input id="month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} required /></div><div className="field"><label htmlFor="salary-date">תאריך תשלום שכר *</label><input id="salary-date" type="date" value={salaryPaymentDate} onChange={(event) => setSalaryPaymentDate(event.target.value)} required /></div></div><div className="field" style={{ marginBottom: 24 }}><label htmlFor="payment-account">חשבון לתשלום פנסיוני *</label>{paymentAccounts.length ? <><select id="payment-account" value={selectedPaymentAccountId} onChange={(event) => setSelectedPaymentAccountId(event.target.value)} required><option value="">בחרו חשבון</option>{paymentAccounts.map((account) => <option key={account.id} value={account.id}>{`בנק ${account.bankId} · סניף ${account.branchId} · ${account.maskedAccountNumber}${account.isDefault ? " · ברירת מחדל" : ""}`}</option>)}</select><small>החשבון נשמר כצילום מצב בדיווח ולא ישתנה אם פרטי המעסיק יעודכנו בעתיד.</small></> : <div className="notice notice-error">לא הוגדר למעסיק חשבון תשלום פעיל. הגדירו חשבון בפרופיל המעסיק לפני יצירת דיווח.</div>}</div><div className="card-head"><div><h3 style={{ margin: 0 }}>אופן קליטת הנתונים</h3></div></div><div className="grid choice-grid"><button type="button" className={`choice-card${mode === "manual" ? " selected" : ""}`} onClick={() => setMode("manual")}><Keyboard className="choice-icon" size={28} /><b>דיווח ידני</b><p>בחירת עובדים והזנת המוצרים וההפקדות במערכת</p></button><button type="button" className={`choice-card${mode === "excel" ? " selected" : ""}`} onClick={() => setMode("excel")}><FileSpreadsheet className="choice-icon" size={28} /><b>קובץ Excel</b><p>העלאת קובץ שכר, התאמת עובדים והקמת עובדים חדשים באישורכם</p></button></div></> : <><div className="notice" style={{ marginBottom: 18 }}>{reportKind === 3 ? "דיווח שלילי חייב להיות מקושר לדיווח שאותו הוא מפחית או מבטל." : "דיווח הפרשים חייב להיות מקושר לדיווח שעליו משלימים את ההפרשים."}</div><SourceReportsList reports={sourceReports} loading={loadingSources} selectedId={selectedSourceReportId} search={sourceSearch} setSearch={setSourceSearch} chooseSource={chooseSource} onSearch={searchSources} hasMore={sourceHasMore} onLoadMore={loadMoreSources} />{selectedSourceReportId ? <div className="grid two-cols" style={{ marginTop: 24 }}><div className="field"><label>חודש הדיווח *</label><input type="month" value={month} readOnly disabled /></div><div className="field"><label>תאריך תשלום שכר *</label><input required type="date" value={salaryPaymentDate} onChange={(event) => setSalaryPaymentDate(event.target.value)} /></div></div> : null}</>}</>;
}

function SourceReportsList({ reports, loading, selectedId, search, setSearch, chooseSource, onSearch, hasMore, onLoadMore }: { reports: SourceManualReport[]; loading: boolean; selectedId: string; search: string; setSearch: (value: string) => void; chooseSource: (report: SourceManualReport) => void; onSearch: () => void; hasMore: boolean; onLoadMore: () => void; }) { return <div><div className="card-head"><div><h3 style={{ margin: 0 }}>בחרו את הדיווח שאותו מתקנים</h3><span style={{ color: "var(--muted)" }}>ניתן לטעון דיווחים נוספים לפי הצורך.</span></div></div><div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}><input aria-label="חיפוש לפי חודש" placeholder="חיפוש חודש, למשל 2026-09" maxLength={7} value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSearch(); }} style={{ flex: "1 1 220px" }} /><button type="button" className="btn btn-secondary" onClick={onSearch} disabled={loading}>חיפוש</button></div>{loading && reports.length === 0 ? <div className="empty">טוען דיווחים קודמים...</div> : null}{!loading && reports.length === 0 ? <div className="empty"><b>לא נמצאו דיווחים</b><span>אין כרגע דיווח זמין לבסס עליו את התיקון.</span></div> : null}{reports.length > 0 ? <div className="manual-employee-list">{reports.map((report) => { const selected = report.id === selectedId; return <button type="button" key={report.id} className={`manual-employee-row correction-report-row${selected ? " selected" : ""}`} onClick={() => chooseSource(report)}><span className="manual-employee-check"><input type="radio" readOnly checked={selected} /></span><span className="manual-employee-main"><b>חודש {formatMonth(report.reportingMonth)} · {kindLabel(report.reportKind)}</b><span>{report.employeeCount} עובדים · {report.productCount} מוצרים · עודכן {new Date(report.updatedAt).toLocaleDateString("he-IL")}</span></span></button>; })}</div> : null}{hasMore ? <div style={{ marginTop: 14, textAlign: "center" }}><button type="button" className="btn btn-secondary" disabled={loading} onClick={onLoadMore}>{loading ? "טוען..." : "טען דיווחים נוספים"}</button></div> : null}</div>; }

function Summary({ employer, month, reportKind, mode, selectedCount, fileName, source, paymentAccount, sentExternalId }: { employer: Employer; month: string; reportKind: ManualReportKind; mode: IntakeMode; selectedCount: number; fileName: string; source: SourceManualReport | null; paymentAccount: EmployerPaymentAccount | null; sentExternalId: string; }) { return <><div className="card-head"><div><h2>סיכום הדיווח</h2><span style={{ color: "var(--muted)" }}>הנתונים עברו בדיקות חובה ותקינות לפני ההגעה לשלב הזה.</span></div></div><div className="grid two-cols"><div className="field"><label>מעסיק</label><b>{employer.legalName}</b></div><div className="field"><label>סוג דיווח</label><b>{reportKindLabel[reportKind]}</b></div><div className="field"><label>חודש</label><b>{formatMonth(month)}</b></div>{reportKind === 1 ? <div className="field"><label>קליטת נתונים</label><b>{mode === "excel" ? `Excel${fileName ? ` · ${fileName}` : ""}` : "ידני"}</b></div> : null}{reportKind !== 1 && source ? <div className="field"><label>דיווח מקור</label><b>חודש {formatMonth(source.reportingMonth)}</b></div> : null}<div className="field"><label>עובדים בדיווח</label><b>{selectedCount}</b></div>{paymentAccount ? <div className="field"><label>חשבון תשלום</label><b>בנק {paymentAccount.bankId} · סניף {paymentAccount.branchId} · {paymentAccount.maskedAccountNumber}</b></div> : null}</div>{reportKind !== 1 ? <div className="notice" style={{ marginTop: 20 }}>הדיווח החדש שומר קישור לדיווח המקורי, והנתונים הועתקו ממנו כבסיס לתיקון.</div> : null}{sentExternalId ? <div className="notice notice-info" style={{ marginTop: 20 }}><b>הדיווח נשלח בהצלחה</b><div>מזהה חיצוני: {sentExternalId}</div></div> : null}</>; }