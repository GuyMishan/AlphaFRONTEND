"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EmployerSelection } from "@/lib/session/app-store";
import { errorMessage } from "@/lib/api/error-messages";
import { useLatestRequest } from "@/lib/hooks/use-latest-request";
import { manualReportsApi } from "../api";
import { reportValidationApi } from "../validation-api";
import { reportTransmissionApi } from "../transmission-api";
import type { SourceManualReport } from "../types";
import { createReportFromDetails } from "./draft-operations";
import { importExcelReport } from "./import-excel-report";
import { reportSteps, validationMessage, type PatchReportWizard, type ReportEntry, type ReportWizardState } from "./model";
import type { useReportBilling } from "./use-report-billing";

type Options = {
  scope: EmployerSelection;
  entry: ReportEntry;
  state: ReportWizardState;
  patch: PatchReportWizard;
  canCreate: boolean;
  canTransmit: boolean;
  selectedSource: SourceManualReport | null;
  billing: ReturnType<typeof useReportBilling>;
  resolveAfterValidation: () => Promise<void>;
};

function detailsError(state: ReportWizardState, entry: ReportEntry, source: SourceManualReport | null) {
  if (!/^\d{4}-\d{2}$/.test(state.month)) return "חודש דיווח הוא שדה חובה.";
  if (!state.salaryPaymentDate) return "תאריך תשלום שכר הוא שדה חובה.";
  if (!state.paymentAccountId) return "יש לבחור חשבון תשלום לדיווח.";
  const correction = state.reportKind === 1 && state.mode === "correction";
  if (!state.reportId && (state.reportKind !== 1 || correction) && !state.sourceReportId) {
    return "יש לבחור את הדיווח הקודם שעליו מבוסס הדיווח.";
  }
  const focused = entry.sourceProductId && state.sourceReportId === entry.sourceReportId;
  if (correction && !source?.canBeCurrentCorrectionSource && !focused) {
    return "יש לבחור דיווח שלילי קוד 6 שכבר נשלח או יובא ממקור חיצוני.";
  }
  return "";
}

/** Stage transitions and transmission; presentation never performs these requests. */
export function useReportWizardActions({ scope, entry, state, patch, canCreate, canTransmit, selectedSource, billing, resolveAfterValidation }: Options) {
  const router = useRouter();
  const busy = useRef(false);
  const requests = useLatestRequest();
  const isExcel = state.reportKind === 1 && state.mode === "excel";
  const isXml = state.reportKind === 1 && state.mode === "xml";
  const steps = reportSteps(isExcel || isXml);

  async function validateStage(stage: "employees" | "deposits") {
    const result = await reportValidationApi.validate(scope.organizationId, scope.employerId, state.reportId, stage);
    if (!result.isValid) {
      patch({ validationResult: result });
      throw new Error(validationMessage(result.errors));
    }
    if (stage === "deposits") await resolveAfterValidation();
  }

  async function importExcel() {
    if (!state.excelIntake) throw new Error("יש להעלות ולבדוק קובץ Excel לפני שממשיכים.");
    const { created, employmentIds } = await importExcelReport({
      scope,
      intake: state.excelIntake,
      reportId: state.reportId,
      month: state.month,
      salaryPaymentDate: state.salaryPaymentDate,
      paymentAccountId: state.paymentAccountId,
      onReportCreated: reportId => patch({ reportId }),
    });
    patch({
      employees: [...created, ...state.employees.filter(item => !created.some(employee => employee.id === item.id))],
      selectedIds: employmentIds,
      excelIntake: { ...state.excelIntake, matchedEmploymentIds: employmentIds, newEmployees: [] },
    });
    toast.success(`קובץ ה־Excel נקלט במלואו: ${employmentIds.length} עובדים ו־${state.excelIntake.reportRows.length} מוצרי דיווח.`);
  }

  async function next() {
    if (busy.current || state.advancing || state.sending || state.step >= steps.summary || !canCreate) return;
    if (state.showOpenReports && state.step === 1) return;
    busy.current = true;
    const isCurrent = requests.begin();
    patch({ error: "", advancing: true });
    try {
      if (state.step === 1) {
        patch({ stepOneAttempted: true });
        const error = detailsError(state, entry, selectedSource);
        if (error) {
          if (!state.paymentAccountId) {
            await billing.ensureAccess(state.paymentAccountId);
            billing.setOpen(true);
          } else toast.error(error, { id: "report-step-one-validation" });
          return;
        }
        if (!await billing.ensureAccess(state.paymentAccountId) || !isCurrent()) return;
        if (!isXml) {
          const created = await createReportFromDetails(scope, state, entry, reportId => patch({ reportId }));
          if (!isCurrent()) return;
          patch(created);
          if (created.step) return;
        }
      }
      if (isExcel && state.step === 2) await importExcel();
      if (state.step === steps.employees && state.reportId) {
        if (!state.selectedIds.length) throw new Error("יש לבחור לפחות עובד אחד לדיווח.");
        await manualReportsApi.syncManualReportEmployees(scope.organizationId, scope.employerId, state.reportId, state.selectedIds);
        await validateStage("employees");
      }
      if (state.step === steps.deposits && state.reportId) await validateStage("deposits");
      if (isCurrent()) patch({ step: state.step + 1 });
    } catch (error) {
      if (isCurrent()) patch({ error: errorMessage(error, "בדיקת הדיווח נכשלה") });
    } finally {
      busy.current = false;
      if (isCurrent()) patch({ advancing: false });
    }
  }

  async function openSource(report: SourceManualReport) {
    if (busy.current || state.advancing || state.sending || !canCreate) return;
    busy.current = true;
    const isCurrent = requests.begin();
    const nextState: ReportWizardState = {
      ...state,
      sourceReportId: report.id,
      month: report.reportingMonth.slice(0, 7),
      salaryPaymentDate: report.salaryPaymentDate?.slice(0, 10) ?? "",
      error: "",
      stepOneAttempted: true,
    };
    patch({ advancing: true, sourceReportId: nextState.sourceReportId,
      month: nextState.month, salaryPaymentDate: nextState.salaryPaymentDate,
      error: "", stepOneAttempted: true });
    try {
      const issue = detailsError(nextState, entry, report);
      if (issue) {
        if (!nextState.paymentAccountId) {
          await billing.ensureAccess(nextState.paymentAccountId);
          billing.setOpen(true);
        } else toast.error(issue, { id: "report-step-one-validation" });
        return;
      }
      if (!await billing.ensureAccess(nextState.paymentAccountId) || !isCurrent()) return;
      const created = await createReportFromDetails(scope, nextState, entry, reportId => patch({ reportId }));
      if (!isCurrent()) return;
      patch({ ...created, step: created.step ?? 2 });
    } catch (error) {
      if (isCurrent()) patch({ error: errorMessage(error, "פתיחת הדיווח לתיקון נכשלה") });
    } finally {
      busy.current = false;
      if (isCurrent()) patch({ advancing: false });
    }
  }

  async function send() {
    if (busy.current || !state.reportId || state.sending || state.sentExternalId || !canTransmit) return;
    if (state.reportKind === 2) {
      toast.error("דיווח הפרשים אינו נשלח ישירות כממשק 006. יש להפוך את ההפרש לדיווח שוטף מתקן או לדיווח שלילי.");
      return;
    }
    busy.current = true;
    const isCurrent = requests.begin();
    patch({ sending: true });
    try {
      if (!await billing.checkTransmission() || !isCurrent()) return;
      const validation = await reportValidationApi.commit(scope.organizationId, scope.employerId, state.reportId, "final");
      if (!isCurrent()) return;
      if (!validation.isValid) {
        patch({ validationResult: validation, error: validationMessage(validation.errors) });
        return;
      }
      const result = await reportTransmissionApi.send(scope.organizationId, scope.employerId, state.reportId);
      if (!isCurrent()) return;
      patch({ sentExternalId: result.transmission?.externalId || result.transmission?.id
        || result.transmissions?.map(item => item.externalId || item.id).join(", ") || "" });
      toast.success("הדיווח נשלח בהצלחה");
      if (entry.followUpReportId) router.replace(`/reports/new?resumeReportId=${entry.followUpReportId}&correctionStage=current`);
    } catch (error) {
      if (isCurrent()) toast.error(errorMessage(error, "שליחת הדיווח נכשלה"));
    } finally {
      busy.current = false;
      if (isCurrent()) patch({ sending: false });
    }
  }

  return { next, send, openSource };
}
