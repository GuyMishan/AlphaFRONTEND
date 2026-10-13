"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Info, Send, Trash2 } from "lucide-react";
import { AppShell } from "@/features/shell/components/app-shell";
import { AppModal } from "@/components/ui/app-modal";
import { DataTable } from "@/components/ui/data-table";
import { BillingGateModal } from "@/features/billing/components/billing-gate-modal";
import { ExcelEmployeeIntake, type ExcelEmployeeIntakeResult } from "@/features/employees/components/excel-employee-intake";
import { EmployerInterfaceXmlIntake } from "@/features/reporting/components/employer-interface-xml-intake";
import { employerInterfaceApi, type EmployerInterfaceImportResult } from "@/features/reporting/employer-interface-api";
import { ManualReportData } from "@/features/reporting/components/manual-report-data";
import { ManualDepositData } from "@/features/reporting/components/manual-deposit-data";
import { manualDepositsApi } from "@/features/reporting/deposits-api";
import { billingApi } from "@/features/billing/api";
import { employeesApi } from "@/features/employees/api";
import { employersApi } from "@/features/employers/api";
import { paymentAccountsApi } from "@/features/payment-accounts/api";
import { manualReportsApi } from "@/features/reporting/api";
import { getScopeContext } from "@/features/scope/scope-context";
import { derivedReportsApi } from "@/features/reporting/derived-reports-api";
import { reportValidationApi, type ReportValidationResult } from "@/features/reporting/validation-api";
import { reportFeedbackApi } from "@/features/feedback/api";
import { ReportValidationErrorsModal } from "@/features/reporting/components/report-validation-errors-modal";
import { reportTransmissionApi } from "@/features/reporting/transmission-api";
import { getEmployerSelection } from "@/lib/session/storage";
import { formatDateDDMMYYYY } from "@/lib/format/date";
import type { BillingGateStatus } from "@/features/billing/types";
import type { Employee } from "@/features/employees/types";
import type { Employer } from "@/features/employers/types";
import type { EmployerPaymentAccount } from "@/features/payment-accounts/types";
import type { EmployeePensionProductInput } from "@/features/pension/types";
import type { ManualReportKind, ResumableManualReport, SourceManualReport } from "@/features/reporting/types";
import { subscribeToScopeChanges, type ScopeChange } from "@/features/scope/scope-events";
import { formatReportingMonth } from "@/lib/format/date";
import { reportKindLabel as kindLabel } from "@/features/reporting/labels";
import { type IntakeMode } from "@/features/reporting/new-report-options";
import { ReportTypeBanner } from "@/features/reporting/components/new-report/report-type-banner";
import { ReportDetails } from "@/features/reporting/components/new-report/report-details";
import { Summary } from "@/features/reporting/components/new-report/report-summary";

const manualSteps = ["פרטי הדיווח", "רשימת עובדים", "נתוני הפקדות", "סיכום ושליחה"];
const excelSteps = ["פרטי הדיווח", "העלאת קובץ דיווח", "רשימת עובדים", "נתוני הפקדות", "סיכום ושליחה"];
const monthNow = new Date().toISOString().slice(0, 7);
function formatDraftUpdate(value: string) {
  const updated = new Date(value);
  if (Number.isNaN(updated.getTime())) return "—";
  const dayKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem",
    year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const today = new Date();
  const todayKey = dayKey(today);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dateLabel = dayKey(updated) === todayKey ? "היום" : dayKey(updated) === dayKey(yesterday)
    ? "אתמול" : formatDateDDMMYYYY(value, "—");
  const time = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false }).format(updated);
  return `${dateLabel} בשעה ${time}`;
}
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
  const [requestedSource, setRequestedSource] = useState({ reportId: "", productId: "", month: "", kind: "" });
  const [requestedResumeReportId, setRequestedResumeReportId] = useState("");
  const [followUpReportId, setFollowUpReportId] = useState("");
  const [correctionWorkspaceEntry, setCorrectionWorkspaceEntry] = useState(false);
  const [focusedReportProductId, setFocusedReportProductId] = useState("");
  const [focusedReportEmployeeId, setFocusedReportEmployeeId] = useState("");
  const [focusMissingFieldNumber, setFocusMissingFieldNumber] = useState("");
  const [resolutionResolver, setResolutionResolver] = useState("");
  const [resolutionSourceReportId, setResolutionSourceReportId] = useState("");
  const [resolutionProblemIds, setResolutionProblemIds] = useState<string[]>([]);
  const [draftToDelete, setDraftToDelete] = useState<ResumableManualReport | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState("");
  const resumeEntryInitialized = useRef(false);
  const requestedSourceReportId = requestedSource.reportId;
  const requestedSourceProductId = requestedSource.productId;
  const requestedSourceMonth = requestedSource.month;
  const requestedSourceKind = requestedSource.kind;
  const requestedSourceIsNegative = requestedSourceKind === "3" || requestedSourceKind === "Negative";
  const correctionEntryInitialized = useRef(false);
  const [step, setStep] = useState(1);
  const [reportKind, setReportKind] = useState<ManualReportKind>(1);
  const [mode, setMode] = useState<IntakeMode>("manual");
  const [month, setMonth] = useState(monthNow);
  const [salaryPaymentDate, setSalaryPaymentDate] = useState("");
  const [stepOneAttempted, setStepOneAttempted] = useState(false);
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualReportId, setManualReportId] = useState("");
  const [resumingDraft, setResumingDraft] = useState(false);
  const [openReports, setOpenReports] = useState<ResumableManualReport[]>([]);
  const [showOpenReports, setShowOpenReports] = useState(false);
  const [openReportsHasMore, setOpenReportsHasMore] = useState(false);
  const [loadingOpenReports, setLoadingOpenReports] = useState(false);
  const [fileName, setFileName] = useState("");
  const [excelIntake, setExcelIntake] = useState<ExcelEmployeeIntakeResult | null>(null);
  const [error, setError] = useState("");
  const [validationResult, setValidationResult] = useState<ReportValidationResult | null>(null);
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
  const [correctionOperationCode, setCorrectionOperationCode] = useState<2 | 3>(2);
  const [canCreateReport, setCanCreateReport] = useState(false);
  const [canTransmitReport, setCanTransmitReport] = useState(false);
  const [canManageEmployerBilling, setCanManageEmployerBilling] = useState(false);
  const [canManageOrganizationBilling, setCanManageOrganizationBilling] = useState(false);
  const [paymentAccounts, setPaymentAccounts] = useState<EmployerPaymentAccount[]>([]);
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState("");
  const [billingGate, setBillingGate] = useState<BillingGateStatus | null>(null);
  const [showBillingGateModal, setShowBillingGateModal] = useState(false);
  const scopeLoadKeyRef = useRef("");

  const selectedSource = useMemo(() => sourceReports.find((report) => report.id === selectedSourceReportId) ?? null, [sourceReports, selectedSourceReportId]);
  const eligibleCorrectionSources = useMemo(
    () => sourceReports.filter((report) => report.canBeCurrentCorrectionSource
      || Boolean(requestedSourceProductId && report.id === requestedSourceReportId)),
    [sourceReports, requestedSourceProductId, requestedSourceReportId],
  );
  const isCorrection = reportKind === 1 && mode === "correction";
  const isExcel = reportKind === 1 && mode === "excel";
  const isXml = mode === "xml";
  const summaryStep = isExcel ? 5 : 4;

  async function loadScope(nextScope: { organizationId: string; employerId: string }) {
    const scopeKey = `${nextScope.organizationId}:${nextScope.employerId}`;
    if (scopeLoadKeyRef.current === scopeKey) return;
    scopeLoadKeyRef.current = scopeKey;
    setLoading(true); setError(""); setValidationResult(null); setScope(nextScope); setManualReportId(""); setResumingDraft(false); setShowOpenReports(false); setOpenReports([]); setSelectedSourceReportId(""); setSourceReports([]); setExcelIntake(null); setFileName(""); setSentExternalId(""); setBillingGate(null);
    try {
      const [employerItem, employeePage, capabilities, profileSettings, accountRows, globalScope, draftPage] = await Promise.all([
        employersApi.employer(nextScope.organizationId, nextScope.employerId),
        employeesApi.employeeSearch(nextScope.organizationId, nextScope.employerId, "", 0, 100),
        employersApi.employerCapabilities(nextScope.organizationId, nextScope.employerId),
        employersApi.employerProfileCenterSettings(nextScope.organizationId, nextScope.employerId),
        paymentAccountsApi.employerPaymentAccounts(nextScope.organizationId, nextScope.employerId),
        getScopeContext(),
        manualReportsApi.openManualReports(nextScope.organizationId, nextScope.employerId),
      ]);
      if (scopeLoadKeyRef.current !== scopeKey) return;
      setOpenReports(draftPage.items);
      setOpenReportsHasMore(draftPage.hasMore);
      setEmployer(employerItem);
      setCanCreateReport(capabilities.canCreateReport);
      setCanTransmitReport(capabilities.canTransmitReport);
      setCanManageEmployerBilling(capabilities.canManageEmployer);
      const currentOrganization = globalScope.organizations.find((item) => item.id === nextScope.organizationId);
      setCanManageOrganizationBilling(Boolean(currentOrganization?.hasOrganizationScope && currentOrganization?.canManageOrganization));
      setEmployees(employeePage.items);
      setSelectedIds(employeePage.items.filter((x) => x.status === 1).map((x) => x.id));
      setPaymentAccounts(accountRows);
      setSelectedPaymentAccountId(accountRows.find((x) => x.isDefault)?.id ?? accountRows[0]?.id ?? "");
      setShowBillingGateModal(accountRows.length === 0);
      if (!salaryPaymentDate) {
        setSalaryPaymentDate(defaultSalaryDate(month, profileSettings.reporting.defaultSalaryPaymentDay));
      }
    } catch (err) {
      scopeLoadKeyRef.current = "";
      setError(err instanceof Error ? err.message : "טעינת הנתונים נכשלה");
    } finally { setLoading(false); }
  }

  async function loadMoreOpenReports() {
    if (!scope || loadingOpenReports || !openReportsHasMore) return;
    setLoadingOpenReports(true);
    try {
      const result = await manualReportsApi.openManualReports(scope.organizationId, scope.employerId, openReports.length);
      setOpenReports((current) => [...current, ...result.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setOpenReportsHasMore(result.hasMore);
    } catch (err) { toast.error(err instanceof Error ? err.message : "טעינת הטיוטות נכשלה"); }
    finally { setLoadingOpenReports(false); }
  }

  async function resumeReportById(reportId: string) {
    if (!scope || !canCreateReport || advancing) return;
    setAdvancing(true);
    try {
      // Re-fetch and enforce scope/editable state rather than trusting stale list data.
      const [current, employmentIds] = await Promise.all([
        manualReportsApi.manualReport(scope.organizationId, scope.employerId, reportId),
        loadReportEmploymentIds(reportId),
      ]);
      if (!["1", "2", "9", "Draft", "ReadyForValidation", "Error"].includes(String(current.status)))
        throw new Error("הדיווח כבר אינו ניתן לעריכה.");
      const kind = Number(current.reportKind) as ManualReportKind;
      setReportKind(kind === 2 || kind === 3 ? kind : 1);
      // Imported Excel/XML rows have already been persisted, so resume directly in the
      // common manual employee/deposit editor without re-importing the source file.
      setMode("manual");
      setResumingDraft(true);
      setManualReportId(current.id);
      setSelectedIds(employmentIds);
      setMonth(current.reportingMonth.slice(0, 7));
      setSalaryPaymentDate(current.salaryPaymentDate?.slice(0, 10) ?? "");
      setSelectedPaymentAccountId(current.paymentAccountId || "");
      setSelectedSourceReportId(current.sourceReportId ?? "");
      setFileName("");
      setExcelIntake(null);
      setSentExternalId("");
      setStepOneAttempted(false);
      setShowOpenReports(false);
      setError("");
      const depositResolvers = new Set(["employmentStatus", "payment", "documents"]);
      setStep(focusedReportProductId && depositResolvers.has(resolutionResolver) ? 3 : 2);
      toast.success("הטיוטה נטענה. ניתן להמשיך לערוך ולשמור.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "לא ניתן לפתוח את הטיוטה");
    } finally { setAdvancing(false); }
  }

  async function resumeReport(draft: ResumableManualReport) {
    await resumeReportById(draft.id);
  }

  async function loadSources(reset = true, search = sourceSearch) {
    if (!scope) return;
    setLoadingSources(true);
    try {
      const skip = reset ? 0 : sourceReports.length;
      const first = await derivedReportsApi.sourceReports(scope.organizationId, scope.employerId, search.trim(), skip, 30);
      let items = first.items;
      let hasMore = first.hasMore;

      // A correction opened from Reports & Feedback points at one exact source report.
      // Do not silently lose that selection just because more than one API page exists
      // for the same salary month.
      if (reset && requestedSourceReportId && !items.some((item) => item.id === requestedSourceReportId)) {
        let nextSkip = items.length;
        while (hasMore && nextSkip < 5000) {
          const page = await derivedReportsApi.sourceReports(
            scope.organizationId, scope.employerId, search.trim(), nextSkip, 100,
          );
          items = [...items, ...page.items.filter((item) => !items.some((existing) => existing.id === item.id))];
          hasMore = page.hasMore;
          if (items.some((item) => item.id === requestedSourceReportId) || page.items.length === 0) break;
          nextSkip += page.items.length;
        }
      }

      setSourceReports((current) => reset ? items : [...current, ...items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setSourceHasMore(hasMore);
      if (reset) {
        const requested = requestedSourceReportId ? items.find((item) => item.id === requestedSourceReportId) : null;
        if (requested) {
          setSelectedSourceReportId(requested.id);
          setMonth(requested.reportingMonth.slice(0, 7));
          setSalaryPaymentDate(requested.salaryPaymentDate?.slice(0, 10) ?? "");
        } else {
          setSelectedSourceReportId("");
        }
      }
    } catch (err) { setError(err instanceof Error ? err.message : "טעינת הדיווחים הקודמים נכשלה"); }
    finally { setLoadingSources(false); }
  }

  async function loadReportEmploymentIds(reportId: string) {
    if (!scope) return [] as string[];
    const ids: string[] = []; let skip = 0; let hasMore = true;
    while (hasMore && ids.length < 5000) {
      const page = await manualReportsApi.manualReportEmployees(scope.organizationId, scope.employerId, reportId, "", skip, 100);
      ids.push(...page.items.map((item) => item.employmentId)); hasMore = page.hasMore; skip += page.items.length;
      if (page.items.length === 0) break;
    }
    return ids;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRequestedSource({
      reportId: params.get("sourceReportId") ?? "",
      productId: params.get("sourceProductId") ?? "",
      month: params.get("sourceMonth") ?? "",
      kind: params.get("sourceKind") ?? "",
    });
    setRequestedResumeReportId(params.get("resumeReportId") ?? "");
    setFollowUpReportId(params.get("followUpReportId") ?? "");
    setCorrectionWorkspaceEntry(params.get("correctionWorkspace") === "1");
    setFocusedReportProductId(params.get("focusReportProductId") ?? "");
    setFocusedReportEmployeeId(params.get("focusReportEmployeeId") ?? "");
    setFocusMissingFieldNumber(params.get("focusMissingFieldNumber") ?? "");
    setResolutionResolver(params.get("resolutionResolver") ?? "");
    setResolutionSourceReportId(params.get("resolutionSourceReportId") ?? "");
    setResolutionProblemIds(
      (params.get("resolutionProblemIds") ?? "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean),
    );
  }, []);
  useEffect(() => { const selected = getEmployerSelection(); if (selected) void loadScope(selected); else setLoading(false); }, []);
  useEffect(() => {
    if (!scope || !manualReportId || !correctionWorkspaceEntry || resolutionProblemIds.length) return;
    let cancelled = false;
    reportFeedbackApi.correctionWorkspaceResolutionLinks(
      scope.organizationId,
      scope.employerId,
      manualReportId,
    ).then((result) => {
      if (cancelled || !result.problemIds.length) return;
      setResolutionSourceReportId(result.sourceReportId ?? "");
      setResolutionProblemIds(result.problemIds);
      if (!resolutionResolver && result.resolverTypes.length === 1)
        setResolutionResolver(result.resolverTypes[0]);
    }).catch(() => {
      // A correction workspace can also be opened for ordinary report correction without feedback.
    });
    return () => { cancelled = true; };
  }, [
    scope?.organizationId,
    scope?.employerId,
    manualReportId,
    correctionWorkspaceEntry,
    resolutionProblemIds.length,
    resolutionResolver,
  ]);
  useEffect(() => {
    if (!scope || !canCreateReport || !requestedResumeReportId || resumeEntryInitialized.current) return;
    resumeEntryInitialized.current = true;
    void resumeReportById(requestedResumeReportId);
  }, [scope?.organizationId, scope?.employerId, canCreateReport, requestedResumeReportId]);
  useEffect(() => { const handler = (detail: ScopeChange) => { if (step !== 1) return; if (detail.employerId) void loadScope({ organizationId: detail.organizationId, employerId: detail.employerId }); }; const unsubscribeScope = subscribeToScopeChanges(handler); return () => unsubscribeScope(); }, [step]);
  useEffect(() => {
    if (!scope || !requestedSourceReportId || correctionEntryInitialized.current) return;
    correctionEntryInitialized.current = true;
    setReportKind(requestedSourceIsNegative ? 1 : 3);
    setMode(requestedSourceIsNegative ? "correction" : "manual");
    setShowOpenReports(false);
    setSourceSearch(requestedSourceMonth);
    void loadSources(true, requestedSourceMonth);
  }, [scope?.organizationId, scope?.employerId, requestedSourceReportId, requestedSourceMonth, requestedSourceIsNegative]);
  useEffect(() => {
    const needsSources = reportKind !== 1 || mode === "correction";
    if (!needsSources || !scope || manualReportId) return;
    if (reportKind !== 1 && mode !== "manual") setMode("manual");
    const initialSearch = requestedSourceReportId ? requestedSourceMonth : "";
    setSourceSearch(initialSearch); setSentExternalId(""); void loadSources(true, initialSearch);
  }, [reportKind, mode, manualReportId, scope?.organizationId, scope?.employerId]);

  function chooseSource(report: SourceManualReport) { setSelectedSourceReportId(report.id); setMonth(report.reportingMonth.slice(0, 7)); setSalaryPaymentDate(report.salaryPaymentDate?.slice(0, 10) ?? ""); setError(""); setSentExternalId(""); }
  function chooseKind(kind: ManualReportKind) { setShowOpenReports(false); setResumingDraft(false); setReportKind(kind); setManualReportId(""); setSelectedSourceReportId(""); setCorrectionOperationCode(2); setFileName(""); setExcelIntake(null); setError(""); setSentExternalId(""); if (kind !== 1) setMode("manual"); }
  function chooseMode(value: IntakeMode) { setResumingDraft(false); setMode(value); setManualReportId(""); setFileName(""); setExcelIntake(null); setError(""); setSentExternalId(""); setStep(1); }

  const canContinue = step === 1
    ? Boolean(!showOpenReports && !isXml && employer && month && salaryPaymentDate && selectedPaymentAccountId
        && (reportKind !== 1 ? selectedSourceReportId : !isCorrection || selectedSourceReportId))
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
    if (!manualReportId && (reportKind !== 1 || isCorrection) && !selectedSourceReportId) return "יש לבחור את הדיווח הקודם שעליו מבוסס הדיווח.";
    const focusedRequestedCorrection = Boolean(
      requestedSourceProductId && selectedSourceReportId === requestedSourceReportId,
    );
    if (isCorrection && !selectedSource?.canBeCurrentCorrectionSource && !focusedRequestedCorrection)
      return "יש לבחור דיווח שלילי קוד 6 שכבר נשלח או יובא ממקור חיצוני.";
    return "";
  }

  async function validatePersistedReport(stage: "employees" | "deposits") {
    if (!scope || !manualReportId) return;
    const result = await reportValidationApi.validate(scope.organizationId, scope.employerId, manualReportId, stage);
    if (!result.isValid) {
      setValidationResult(result);
      throw new Error(validationMessage(result.errors));
    }

    if (stage === "deposits"
      && correctionWorkspaceEntry
      && resolutionSourceReportId
      && resolutionProblemIds.length) {
      await reportFeedbackApi.resolveProblems(
        scope.organizationId,
        scope.employerId,
        resolutionSourceReportId,
        resolutionProblemIds,
        "workspace-validation",
        manualReportId,
      );
      setResolutionProblemIds([]);
      toast.success("התיקונים עברו ולידציה. השגיאות יישארו פתוחות עד להשלמת הדיווח החוזר.");
    }
  }

  async function processExcelEmployees() {
    if (!scope || !excelIntake) throw new Error("יש להעלות ולבדוק קובץ Excel לפני שממשיכים.");
    if (excelIntake.blockedCount) throw new Error("יש שורות חסומות בקובץ. תקנו את הקובץ והעלו אותו מחדש לפני המשך.");

    const created: Employee[] = [];
    const employmentByNationalId = new Map<string, string>();

    for (const matched of excelIntake.matchedEmployees) {
      employmentByNationalId.set(matched.input.nationalId.replace(/\D/g, ""), matched.employmentId);
      if (excelIntake.updateEmployeeProfiles)
        await employeesApi.updateEmployee(scope.organizationId, scope.employerId, matched.employmentId, matched.input);
    }

    for (const input of excelIntake.newEmployees) {
      const saved = await employeesApi.createEmployee(scope.organizationId, scope.employerId, input);
      employmentByNationalId.set(input.nationalId.replace(/\D/g, ""), saved.id);
      created.push({ id: saved.id, personId: saved.personId, ...input, status: 1, endDate: null });
    }

    const employmentIds = Array.from(new Set(employmentByNationalId.values()));
    if (!employmentIds.length) throw new Error("לא נמצאו עובדים תקינים להוספה לדיווח.");

    let reportId = manualReportId;
    if (!reportId) {
      const report = await manualReportsApi.createManualReport(scope.organizationId, scope.employerId, {
        reportingMonth: `${month}-01`,
        salaryPaymentDate,
        employmentIds,
        paymentAccountId: selectedPaymentAccountId,
      });
      reportId = report.id;
      setManualReportId(report.id);
    } else {
      await manualReportsApi.syncManualReportEmployees(scope.organizationId, scope.employerId, reportId, employmentIds);
    }

    const reportEmployees = [];
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const page = await manualReportsApi.manualReportEmployees(scope.organizationId, scope.employerId, reportId, "", skip, 100);
      reportEmployees.push(...page.items);
      hasMore = page.hasMore;
      skip += page.items.length;
      if (!page.items.length) break;
    }
    const reportEmployeeByEmploymentId = new Map(reportEmployees.map((item) => [item.employmentId, item]));

    const rowsByEmploymentId = new Map<string, typeof excelIntake.reportRows>();
    for (const row of excelIntake.reportRows) {
      const employmentId = employmentByNationalId.get(row.nationalId.replace(/\D/g, ""));
      if (!employmentId) continue;
      const list = rowsByEmploymentId.get(employmentId) ?? [];
      list.push(row);
      rowsByEmploymentId.set(employmentId, list);
    }

    for (const [employmentId, rows] of rowsByEmploymentId) {
      const reportEmployee = reportEmployeeByEmploymentId.get(employmentId);
      if (!reportEmployee) throw new Error(`לא נמצא העובד ${employmentId} בתוך טיוטת הדיווח.`);
      const sorted = [...rows].sort((a, b) => Number(a.product.allocationOrder ?? 0) - Number(b.product.allocationOrder ?? 0));
      const employeeInput = excelIntake.matchedEmployees.find((x) => x.employmentId === employmentId)?.input
        ?? excelIntake.newEmployees.find((x) => employmentByNationalId.get(x.nationalId.replace(/\D/g, "")) === employmentId);
      const monthlySalary = employeeInput?.monthlySalary ?? Math.max(...sorted.map((x) => x.product.salary), 0);

      await manualReportsApi.saveManualReportEmployee(
        scope.organizationId, scope.employerId, reportId, reportEmployee.id, monthlySalary,
        sorted.map((x) => x.product),
        employeeInput,
      );

      const detail = await manualReportsApi.manualReportEmployee(scope.organizationId, scope.employerId, reportId, reportEmployee.id);
      for (const sourceRow of sorted) {
        const product = detail.products.find((item) => Number(item.allocationOrder ?? 0) === Number(sourceRow.product.allocationOrder ?? 0)
          && item.fundCode === sourceRow.product.fundCode
          && item.policyNumber === sourceRow.product.policyNumber)
          ?? detail.products.find((item) => Number(item.allocationOrder ?? 0) === Number(sourceRow.product.allocationOrder ?? 0));
        if (!product) throw new Error(`לא ניתן היה להתאים את מוצר שורה ${sourceRow.rowNumber} לאחר הקליטה.`);

        await employerInterfaceApi.updateProductMetadata(
          scope.organizationId, scope.employerId, reportId, product.id, sourceRow.metadata,
        );
        if (sourceRow.previousReference.previousIdentifier || sourceRow.previousReference.previousClearingIdentifier
          || sourceRow.previousReference.previousReferenceExceptionCode != null) {
          await employerInterfaceApi.updatePreviousReference(
            scope.organizationId, scope.employerId, reportId, product.id, sourceRow.previousReference,
          );
        }

        if (sourceRow.metadata.operationCode !== 6) {
          await manualDepositsApi.savePayment(
            scope.organizationId, scope.employerId, reportId, product.id, sourceRow.payment,
          );
        }
      }

      if (excelIntake.updatePensionMix) {
        const effectiveFrom = `${month}-01`;
        const mixProducts: EmployeePensionProductInput[] = sorted.map(({ product }) => ({
          productType: product.productType,
          policyNumber: product.policyNumber,
          fundExternalKey: product.fundExternalKey,
          fundCode: product.fundCode,
          fundName: product.fundName,
          fundCompanyName: product.fundCompanyName,
          fundClassification: product.fundClassification,
          salary: product.salary,
          reportingType: product.reportingType,
          salaryLayer: product.salaryLayer,
          section14: product.section14,
          section14Code: product.section14Code,
          section14StartDate: product.section14StartDate,
          isActive: true,
          effectiveFrom,
          effectiveTo: null,
          institutionalBody: product.fundCompanyName ?? "",
          manufacturer: product.fundCompanyName ?? "",
          salaryAllocationType: product.salaryAllocationType,
          salaryAllocationValue: product.salaryAllocationValue,
          allocationOrder: product.allocationOrder,
          employerContributions: product.employerContributions,
          employeeContributions: product.employeeContributions,
        }));
        await employeesApi.saveEmployeePensionMix(scope.organizationId, scope.employerId, employmentId, mixProducts, monthlySalary);
      }
    }

    setEmployees((current) => [...created, ...current.filter((item) => !created.some((createdEmployee) => createdEmployee.id === item.id))]);
    setSelectedIds(employmentIds);
    setExcelIntake({ ...excelIntake, matchedEmploymentIds: employmentIds, newEmployees: [] });
    toast.success(`קובץ ה־Excel נקלט במלואו: ${employmentIds.length} עובדים ו־${excelIntake.reportRows.length} מוצרי דיווח.`);
  }

  async function handleXmlImported(result: EmployerInterfaceImportResult) {
    if (!scope || !result.reportId) return;

    const [report, employmentIds] = await Promise.all([
      manualReportsApi.manualReport(scope.organizationId, scope.employerId, result.reportId),
      loadReportEmploymentIds(result.reportId),
    ]);

    setManualReportId(report.id);
    setMonth(report.reportingMonth.slice(0, 7));
    setSalaryPaymentDate(report.salaryPaymentDate?.slice(0, 10) ?? "");
    setSelectedIds(employmentIds);
    setFileName(result.fileName ?? "");
    setReportKind(result.documentType === "NegativeReport" ? 3 : 1);
    setError("");
    setSentExternalId("");
    setStep(2);
  }

  async function ensureBillingAccess() {
    if (!scope) return false;
    const freshAccounts = await paymentAccountsApi.employerPaymentAccounts(scope.organizationId, scope.employerId);
    setPaymentAccounts(freshAccounts);
    setSelectedPaymentAccountId((current) => current || freshAccounts.find((x) => x.isDefault)?.id || freshAccounts[0]?.id || "");
    if (freshAccounts.length === 0) {
      setShowBillingGateModal(true);
      return false;
    }
    const freshBillingGate = await billingApi.employerBillingGate(scope.organizationId, scope.employerId);
    setBillingGate(freshBillingGate);
    if (freshBillingGate.canTransmit) {
      setShowBillingGateModal(false);
      return true;
    }

    setShowBillingGateModal(true);
    return false;
  }

  async function next() {
    if (showOpenReports && step === 1) return;
    if (step >= summaryStep || !scope || !employer || !canCreateReport) return;
    setError(""); setAdvancing(true);
    try {
      if (step === 1) {
        setStepOneAttempted(true);
        const localError = validateStepOne();
        if (localError) {
          if (!selectedPaymentAccountId) {
            await ensureBillingAccess();
            setShowBillingGateModal(true);
            return;
          }
          toast.error(localError, { id: "report-step-one-validation" });
          return;
        }
        if (!await ensureBillingAccess()) return;
        if (reportKind === 1 && mode === "manual" && !manualReportId) {
          const report = await manualReportsApi.createManualReport(scope.organizationId, scope.employerId, { reportingMonth: `${month}-01`, salaryPaymentDate, employmentIds: selectedIds, paymentAccountId: selectedPaymentAccountId });
          setManualReportId(report.id);
        }
        if (isCorrection && !manualReportId) {
          const report = await derivedReportsApi.create(scope.organizationId, scope.employerId, {
            sourceReportId: selectedSourceReportId, reportKind: 1, reportingMonth: `${month}-01`, salaryPaymentDate,
            paymentAccountId: selectedPaymentAccountId, correctionOperationCode,
            reportProductIds: requestedSourceProductId && selectedSourceReportId === requestedSourceReportId ? [requestedSourceProductId] : undefined,
          });
          setManualReportId(report.id); setSelectedIds(await loadReportEmploymentIds(report.id));
        }
        if (reportKind !== 1 && !manualReportId) {
          const report = await derivedReportsApi.create(scope.organizationId, scope.employerId, {
            sourceReportId: selectedSourceReportId, reportKind, reportingMonth: `${month}-01`, salaryPaymentDate,
            paymentAccountId: selectedPaymentAccountId,
            reportProductIds: requestedSourceProductId && selectedSourceReportId === requestedSourceReportId ? [requestedSourceProductId] : undefined,
          });
          setManualReportId(report.id); setSelectedIds(await loadReportEmploymentIds(report.id));
          if (reportKind === 3 && resolutionResolver === "documents" && requestedSourceProductId
            && selectedSourceReportId === requestedSourceReportId) {
            const page = await manualDepositsApi.list(scope.organizationId, scope.employerId, report.id, "", 0, 10);
            const selected = page.items.find(item => item.sourceReportProductId === requestedSourceProductId)
              ?? (page.items.length === 1 ? page.items[0] : null);
            if (selected) {
              const current = await employerInterfaceApi.productMetadata(
                scope.organizationId, scope.employerId, report.id, selected.id);
              await employerInterfaceApi.updateProductMetadata(
                scope.organizationId, scope.employerId, report.id, selected.id,
                { ...current, operationCode: 5 });
              setFocusedReportProductId(selected.id);
              setStep(3);
              return;
            }
          }
        }
      }
      if (step === 1 && manualReportId) {
        await manualReportsApi.updateManualReportPaymentAccount(scope.organizationId, scope.employerId, manualReportId, selectedPaymentAccountId);
      }

      if (isExcel && step === 2) await processExcelEmployees();

      const employeeStep = isExcel ? 3 : 2;
      const depositsStep = isExcel ? 4 : 3;
      if (step === employeeStep && manualReportId) {
        if (!selectedIds.length) throw new Error("יש לבחור לפחות עובד אחד לדיווח.");
        await manualReportsApi.syncManualReportEmployees(scope.organizationId, scope.employerId, manualReportId, selectedIds);
        await validatePersistedReport("employees");
      }
      if (step === depositsStep && manualReportId) await validatePersistedReport("deposits");
      setStep((value) => value + 1);
    } catch (err) { setError(err instanceof Error ? err.message : "בדיקת הדיווח נכשלה"); }
    finally { setAdvancing(false); }
  }

  async function deleteOpenDraft(draft: ResumableManualReport) {
    if (!scope || deletingDraftId) return;
    setDeletingDraftId(draft.id);
    try {
      await manualReportsApi.deleteManualReport(scope.organizationId, scope.employerId, draft.id);
      setOpenReports((current) => current.filter((item) => item.id !== draft.id));
      setDraftToDelete(null);
      toast.success("הטיוטה נמחקה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "מחיקת הטיוטה נכשלה");
    } finally {
      setDeletingDraftId("");
    }
  }

  async function sendReport() {
    if (!scope || !manualReportId || sending || sentExternalId || !canTransmitReport) return;
    if (reportKind === 2) {
      toast.error("דיווח הפרשים אינו נשלח ישירות כממשק 006. יש להפוך את ההפרש לדיווח שוטף מתקן או לדיווח שלילי.");
      return;
    }
    setSending(true);
    try {
      const freshBillingGate = await billingApi.employerBillingGate(scope.organizationId, scope.employerId);
      setBillingGate(freshBillingGate);
      if (!freshBillingGate.canTransmit) {
        setShowBillingGateModal(true);
        return;
      }
      const validation = await reportValidationApi.commit(scope.organizationId, scope.employerId, manualReportId, "final");
      if (!validation.isValid) {
        setValidationResult(validation);
        setError(validationMessage(validation.errors));
        return;
      }
      const result = await reportTransmissionApi.send(scope.organizationId, scope.employerId, manualReportId);
      setSentExternalId(result.transmission?.externalId || result.transmission?.id
        || result.transmissions?.map(item => item.externalId || item.id).join(", ") || "");
      toast.success("הדיווח נשלח בהצלחה");
      if (followUpReportId) {
        router.replace(`/reports/new?resumeReportId=${followUpReportId}&correctionStage=current`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחת הדיווח נכשלה");
    } finally {
      setSending(false);
    }
  }

  const steps = isExcel ? excelSteps : manualSteps;
  return <AppShell title="דיווח חדש" hideScopeController={step > 1}><div className={step > 1 ? "wizard wizard-wide" : "wizard"}><div className="page-head"><div><h1>יצירת דיווח פנסיוני</h1><p>{employer && scope ? <><Link className="profile-link" href={`/employers/${employer.id}?organizationId=${scope.organizationId}`}>{employer.legalName}</Link>{` · ח.פ. ${employer.registrationNumber}`}</> : "יש לבחור מעסיק בבורר העליון"}</p></div></div><ReportTypeBanner reportKind={reportKind} source={selectedSource} month={month} correctionOperationCode={isCorrection ? correctionOperationCode : null} /><div className="steps">{steps.map((label, index) => { const number = index + 1; return <div key={label} className={`step${number === step ? " current" : number < step ? " done" : ""}`}><div className="step-number">{number < step ? <Check size={16} /> : number}</div>{label}</div>; })}</div>{error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}{!loading && employer && !canCreateReport ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה במעסיק, אך אין לך הרשאה ליצור או לערוך דיווחים.</div> : null}{loading ? <div className="card empty">טוען את המעסיק והעובדים...</div> : !employer ? <div className="card empty"><Info size={34} /><h3>עדיין לא נבחר מעסיק</h3><button className="btn btn-primary" onClick={() => router.push("/dashboard")}>לבחירת מעסיק</button></div> : <section className="card">
    {step === 1 ? <ReportDetails reportKind={reportKind} setReportKind={chooseKind} selectingExisting={showOpenReports} onSelectExisting={() => { setShowOpenReports(true); setError(""); }} mode={mode} setMode={chooseMode} correctionOperationCode={correctionOperationCode} setCorrectionOperationCode={setCorrectionOperationCode} month={month} setMonth={setMonth} salaryPaymentDate={salaryPaymentDate} setSalaryPaymentDate={(value) => { setSalaryPaymentDate(value); if (value) setError(""); }} showValidation={stepOneAttempted} paymentAccounts={paymentAccounts} selectedPaymentAccountId={selectedPaymentAccountId} sourceReports={isCorrection ? eligibleCorrectionSources : sourceReports} sourceSearch={sourceSearch} setSourceSearch={setSourceSearch} sourceHasMore={sourceHasMore} loadingSources={loadingSources} selectedSourceReportId={selectedSourceReportId} chooseSource={chooseSource} searchSources={() => void loadSources(true, sourceSearch)} loadMoreSources={() => void loadSources(false, sourceSearch)} /> : null}
    {step === 1 && showOpenReports && canCreateReport ? <div className="resume-report-section">
      <div id="open-report-drafts" className="resume-report-list">
        <h3>טיוטות שניתן להמשיך לערוך</h3>
        <DataTable
          items={openReports}
          rowKey={(draft) => draft.id}
          columns={[
            { key: "kind", label: "סוג דיווח", width: "16%" },
            { key: "month", label: "חודש", width: "12%" },
            { key: "employees", label: "עובדים", width: "10%" },
            { key: "products", label: "מוצרים", width: "10%" },
            { key: "updated", label: "עודכן לאחרונה", width: "27%" },
            { key: "action", label: "פעולה", width: "25%" },
          ]}
          rowHeight={54} maxHeight={340} overscan={5}
          minTableWidth={680}
          loading={loadingOpenReports && openReports.length === 0}
          loadingMore={loadingOpenReports && openReports.length > 0}
          hasMore={openReportsHasMore} onLoadMore={loadMoreOpenReports}
          emptyState="אין כרגע טיוטות פתוחות למעסיק הנבחר."
          renderCells={(draft) => [
            <b key="kind">{kindLabel(draft.reportKind)}</b>,
            <span key="month">{formatReportingMonth(draft.reportingMonth)}</span>,
            <span key="employees">{draft.employeeCount}</span>,
            <span key="products">{draft.productCount}</span>,
            <span key="updated">{formatDraftUpdate(draft.updatedAt)}</span>,
            <div key="action" className="resume-report-actions">
              <button type="button" className="btn btn-primary resume-report-continue"
                disabled={advancing || deletingDraftId === draft.id} onClick={() => void resumeReport(draft)}>
                המשך עריכה <ArrowLeft size={15} />
              </button>
              <button type="button" className="btn btn-danger resume-report-delete" aria-label="מחיקת טיוטה"
                disabled={advancing || Boolean(deletingDraftId)} onClick={() => setDraftToDelete(draft)}>
                <Trash2 size={15} />
              </button>
            </div>,
          ]}
        />
      </div>
    </div> : null}
    {step === 1 && !showOpenReports && isXml && scope ? <EmployerInterfaceXmlIntake organizationId={scope.organizationId} employerId={scope.employerId} paymentAccountId={selectedPaymentAccountId} salaryPaymentDate={salaryPaymentDate} disabled={!canCreateReport || !selectedPaymentAccountId} onBeforeImport={ensureBillingAccess} onReportImported={handleXmlImported} /> : null}
    {step === 2 && isExcel && scope ? <ExcelEmployeeIntake organizationId={scope.organizationId} employerId={scope.employerId} reportingMonth={month} onChange={(result) => { setExcelIntake(result); setFileName(result?.fileName ?? ""); setError(""); }} /> : null}
    {((!isExcel && step === 2) || (isExcel && step === 3)) && manualReportId && scope ? <ManualReportData organizationId={scope.organizationId} employerId={scope.employerId} reportId={manualReportId} month={month} employees={employees} selectedIds={selectedIds} setSelectedIds={setSelectedIds} correctionWorkspace={correctionWorkspaceEntry} focusReportEmployeeId={focusedReportEmployeeId} focusReportProductId={focusedReportProductId} focusMissingFieldNumber={focusMissingFieldNumber} /> : null}
    {((!isExcel && step === 3) || (isExcel && step === 4)) && manualReportId && scope ? <ManualDepositData organizationId={scope.organizationId} employerId={scope.employerId} reportId={manualReportId} focusReportProductId={focusedReportProductId} /> : null}
    {step === summaryStep ? <>
      <Summary employer={employer} month={month} reportKind={reportKind} mode={mode} correctionOperationCode={isCorrection ? correctionOperationCode : null} selectedCount={selectedIds.length} fileName={fileName} source={selectedSource} paymentAccount={paymentAccounts.find((x) => x.id === selectedPaymentAccountId) ?? null} sentExternalId={sentExternalId} />
      
      {reportKind === 2 ? <div className="notice notice-info" style={{ marginTop: 18 }}><b>{correctionWorkspaceEntry ? "טיוטת תיקון לדיווח שנשלח" : "דיווח הפרשים הוא טיוטת עבודה"}</b><div>{correctionWorkspaceEntry ? "השינויים נשמרים כגרסה חדשה. לאחר שסיימתם, חזרו למסך דיווחים ומשובים ובחרו דיווח חוזר כדי ליצור את רצף התיקון הרשמי." : "לא ניתן לשדר אותו ישירות למסלקה. יש ליצור ממנו דיווח שוטף מתקן או דיווח שלילי בהתאם לכיוון ההפרש."}</div></div> : null}
      {billingGate?.canTransmit && reportKind !== 2 ? <div className="notice notice-info" style={{ marginTop: 18 }}><b>חיוב Alpha תקין לשידור</b>{billingGate.billedThroughName ? <div>מחויב דרך: {billingGate.billedThroughName}</div> : null}</div> : null}
    </> : null}
    {!(showOpenReports && step === 1) && !(isXml && step === 1) ? <div className="wizard-footer"><button className="btn btn-secondary" disabled={step === 1 || (resumingDraft && step === 2) || advancing || sending || Boolean(sentExternalId)} onClick={() => { setError(""); setStep((value) => value - 1); }}><ArrowRight size={17} />חזרה</button>{step < summaryStep ? <button className="btn btn-primary" disabled={advancing || !canCreateReport} onClick={() => { if (step === 1) { void next(); return; } if (!selectedPaymentAccountId) { setShowBillingGateModal(true); return; } if (canContinue) void next(); }}>{advancing ? "בודק ושומר..." : isExcel && step === 2 ? "אישור עובדים והמשך" : "המשך"}<ArrowLeft size={17} /></button> : <>{sentExternalId || reportKind === 2 ? <button className="btn btn-secondary" onClick={() => router.push("/reports")}>{reportKind === 2 ? "שמירה וחזרה לדיווחים" : "יציאה"}</button> : null}<button className="btn btn-primary" disabled={reportKind === 2 || sending || Boolean(sentExternalId) || !manualReportId || !canTransmitReport} onClick={() => void sendReport()}><Send size={17} />{reportKind === 2 ? "יש לממש את ההפרש לפני שליחה" : sending ? "מבצע ולידציה ושולח..." : sentExternalId ? "הדיווח נשלח" : "שליחת דיווח"}</button></>}</div> : null}
  </section>}</div>{scope && showBillingGateModal ? <BillingGateModal
    gate={billingGate ?? { canTransmit: false, error: "pension_payment_account_required", billingMode: null, source: null, billedThroughName: null, paymentMethodType: null, paymentMethodStatus: null, configured: false }}
    organizationId={scope.organizationId}
    employerId={scope.employerId}
    canManageOrganizationBilling={canManageOrganizationBilling}
    canManageEmployerBilling={canManageEmployerBilling}
    onClose={() => setShowBillingGateModal(false)}
  /> : null}
  {draftToDelete ? <AppModal
    title="מחיקת טיוטה"
    subtitle={`${kindLabel(draftToDelete.reportKind)} · ${formatReportingMonth(draftToDelete.reportingMonth)}`}
    width="sm"
    onClose={() => setDraftToDelete(null)}
    closeDisabled={deletingDraftId === draftToDelete.id}
    actions={<>
      <button className="btn btn-secondary" disabled={Boolean(deletingDraftId)} onClick={() => setDraftToDelete(null)}>ביטול</button>
      <button className="btn btn-danger" disabled={Boolean(deletingDraftId)} onClick={() => void deleteOpenDraft(draftToDelete)}>
        <Trash2 size={15} />{deletingDraftId ? "מוחק..." : "מחיקת הטיוטה"}
      </button>
    </>}
  >
    <p style={{ marginTop: 0 }}>הטיוטה עדיין לא נשלחה ולכן ניתן למחוק אותה. דיווח שהיה בו ניסיון שידור נשמר בהיסטוריה ולא ניתן למחיקה.</p>
  </AppModal> : null}
  {validationResult ? <ReportValidationErrorsModal result={validationResult} reportMonth={month}
    onClose={() => setValidationResult(null)} /> : null}
  </AppShell>;
}
