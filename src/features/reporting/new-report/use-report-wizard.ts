"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { EmployerSelection } from "@/lib/session/app-store";
import { useLatestRequest } from "@/lib/hooks/use-latest-request";
import { errorMessage } from "@/lib/api/error-messages";
import { manualReportsApi } from "../api";
import type { EmployerInterfaceImportResult } from "../employer-interface-api";
import type { ManualReportKind } from "../types";
import type { IntakeMode } from "../new-report-options";
import { defaultSalaryDate, reportSteps, type ReportEntry, type ReportWizardState } from "./model";
import { loadEditableReport, loadReportEmploymentIds } from "./draft-operations";
import type { ReportSetup } from "./use-report-setup";
import { useReportBilling } from "./use-report-billing";
import { useOpenReportDrafts } from "./use-open-report-drafts";
import { useReportSources } from "./use-report-sources";
import { useReportResolution } from "./use-report-resolution";
import { useReportWizardActions } from "./use-report-wizard-actions";

/** One employer and one URL entry own one isolated wizard workspace. */
export function useReportWizard(scope: EmployerSelection, entry: ReportEntry, setup: ReportSetup) {
  const [state, setState] = useState<ReportWizardState>(() => {
    const month = new Date().toISOString().slice(0, 7);
    const negativeSource = entry.sourceKind === "3" || entry.sourceKind === "Negative";
    return {
      step: 1,
      reportKind: entry.sourceReportId && !negativeSource ? 3 : 1,
      mode: entry.sourceReportId && negativeSource ? "correction" : "manual",
      month,
      salaryPaymentDate: defaultSalaryDate(month, setup.defaultSalaryPaymentDay),
      paymentAccountId: setup.accounts.find(item => item.isDefault)?.id ?? setup.accounts[0]?.id ?? "",
      reportId: "",
      sourceReportId: "",
      correctionOperationCode: 2,
      employees: setup.employees,
      selectedIds: setup.employees.filter(item => item.status === 1).map(item => item.id),
      resumingDraft: false,
      isCorrectionWorkspace: entry.correctionWorkspace,
      showOpenReports: false,
      stepOneAttempted: false,
      excelIntake: null,
      fileName: "",
      sentExternalId: "",
      error: "",
      advancing: false,
      sending: false,
      validationResult: null,
      validationFocus: null,
      focusedProductId: entry.focusProductId,
    };
  });
  const patch = useCallback((change: Partial<ReportWizardState>) => setState(current => ({ ...current, ...change })), []);
  const requests = useLatestRequest();
  const isCorrection = state.reportKind === 1 && state.mode === "correction";
  const isExcel = state.reportKind === 1 && state.mode === "excel";
  const isXml = state.mode === "xml";
  const steps = reportSteps(isExcel || isXml);
  const sourceSelectionKey = (state.reportKind !== 1 || isCorrection) && !state.reportId
    ? `${state.reportKind}:${state.mode}` : null;
  const sources = useReportSources(scope, entry, sourceSelectionKey, patch);
  const selectedSource = sources.items.find(item => item.id === state.sourceReportId) ?? null;
  const billing = useReportBilling(scope, setup.accounts, patch);
  const drafts = useOpenReportDrafts(scope, setup.drafts, state.showOpenReports);
  const resolution = useReportResolution(scope, entry, state.reportId);
  const actions = useReportWizardActions({
    scope, entry: { ...entry, resolver: resolution.resolver }, state, patch,
    canCreate: setup.capabilities.canCreateReport,
    canTransmit: setup.capabilities.canTransmitReport,
    selectedSource, billing, resolveAfterValidation: resolution.resolveAfterValidation,
  });

  async function resume(reportId: string) {
    if (!setup.capabilities.canCreateReport || state.advancing) return;
    const isCurrent = requests.begin();
    patch({ advancing: true });
    try {
      const { report, selectedIds } = await loadEditableReport(scope, reportId);
      if (!isCurrent()) return;
      const kind = Number(report.reportKind);
      const depositResolver = ["employmentStatus", "payment", "documents"].includes(resolution.resolver)
        && entry.documentTypeCode !== 3;
      patch({
        reportKind: kind === 2 || kind === 3 ? kind : 1,
        mode: "manual",
        resumingDraft: true,
        isCorrectionWorkspace: Boolean(report.isCorrectionWorkspace),
        reportId: report.id,
        selectedIds,
        month: report.reportingMonth.slice(0, 7),
        salaryPaymentDate: report.salaryPaymentDate?.slice(0, 10) ?? "",
        paymentAccountId: report.paymentAccountId ?? "",
        sourceReportId: report.sourceReportId ?? "",
        fileName: "", excelIntake: null, sentExternalId: "",
        stepOneAttempted: false, showOpenReports: false, error: "",
        step: state.focusedProductId && depositResolver ? 3 : 2,
      });
      toast.success("הטיוטה נטענה. ניתן להמשיך לערוך ולשמור.");
    } catch (error) {
      if (isCurrent()) toast.error(errorMessage(error, "לא ניתן לפתוח את הטיוטה"));
    } finally {
      if (isCurrent()) patch({ advancing: false });
    }
  }

  useEffect(() => {
    if (entry.resumeReportId) void resume(entry.resumeReportId);
    return requests.cancel;
    // A workspace is mounted once per employer/URL entry; do not restart on draft edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.resumeReportId, requests]);

  async function onXmlImported(result: EmployerInterfaceImportResult) {
    if (!result.reportId) return;
    const isCurrent = requests.begin();
    const [report, selectedIds] = await Promise.all([
      manualReportsApi.manualReport(scope.organizationId, scope.employerId, result.reportId),
      loadReportEmploymentIds(scope, result.reportId),
    ]);
    if (!isCurrent()) return;
    patch({
      reportId: report.id, month: report.reportingMonth.slice(0, 7),
      salaryPaymentDate: report.salaryPaymentDate?.slice(0, 10) ?? "",
      selectedIds, fileName: result.fileName ?? "",
      reportKind: result.documentType === "NegativeReport" ? 3 : 1,
      isCorrectionWorkspace: false,
      error: "", sentExternalId: "", step: 3,
    });
  }

  function chooseKind(reportKind: ManualReportKind) {
    patch({
      reportKind, showOpenReports: false, resumingDraft: false, isCorrectionWorkspace: false, reportId: "", sourceReportId: "",
      correctionOperationCode: 2, fileName: "", excelIntake: null, error: "", sentExternalId: "",
      ...(reportKind !== 1 ? { mode: "manual" as const } : {}),
    });
  }

  function chooseMode(mode: IntakeMode) {
    patch({ mode, resumingDraft: false, isCorrectionWorkspace: false, reportId: "", fileName: "", excelIntake: null, error: "", sentExternalId: "", step: 1 });
  }

  const canContinue = state.step === 1
    ? Boolean(!state.showOpenReports && state.month && state.salaryPaymentDate && state.paymentAccountId
      && (state.reportKind !== 1 || isCorrection ? state.sourceReportId : true))
    : isXml && state.step === 2 ? false
    : isExcel && state.step === 2
      ? Boolean(state.excelIntake && !state.excelIntake.blockedCount
        && state.excelIntake.matchedEmploymentIds.length + state.excelIntake.newEmployees.length > 0)
      : state.step !== steps.employees || state.selectedIds.length > 0;

  return {
    state, patch, isCorrection, isExcel, isXml, steps, selectedSource,
    sources, billing, drafts, canContinue, resume, onXmlImported, chooseKind, chooseMode, ...actions,
  };
}

export type ReportWizard = ReturnType<typeof useReportWizard>;
