"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reportFeedbackApi, type ReportFeedbackRow, type ReportFeedbackDepositRow } from "@/features/feedback/api";
import type { ReportFeedbackModalMode } from "@/features/feedback/components/report-feedback-modal";
import { manualDepositsApi, type ManualDepositRow, type ManualDepositContributionLimit } from "../deposits-api";
import { manualReportsApi } from "../api";
import { derivedReportsApi } from "../derived-reports-api";
import { reportTransmissionApi } from "../transmission-api";
import type { EmployerSelection } from "@/lib/session/app-store";
import { errorMessage } from "@/lib/api/error-messages";
import { saveBlob } from "@/lib/download";
import type { useReportDeposits } from "./use-report-deposits";

type Dependencies = Pick<ReturnType<typeof useReportDeposits>, "loadExpanded" | "removeReport"> & {
  load: () => Promise<void>;
};

/** Mutations and dialogs used by report rows and deposit feedback. */
export function useReportActions(scope: EmployerSelection, { load, loadExpanded, removeReport }: Dependencies) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [feedbackModal, setFeedbackModal] = useState<{
    mode: ReportFeedbackModalMode;
    report?: ReportFeedbackRow;
    deposit?: ReportFeedbackDepositRow;
    depositView?: "details" | "errors";
    resolveOnOpen?: boolean;
  } | null>(null);
  const [editingDeposit, setEditingDeposit] = useState<{
    report: ReportFeedbackRow;
    sourceDeposit: ReportFeedbackDepositRow;
    editReportId: string;
    deposit: ManualDepositRow;
    contributionLimits: ManualDepositContributionLimit[];
    resolutionProblemIds: string[];
  } | null>(null);
  const [retransmitReport, setRetransmitReport] = useState<ReportFeedbackRow | null>(null);
  const [deleteReport, setDeleteReport] = useState<ReportFeedbackRow | null>(null);
  const [correctionBusyId, setCorrectionBusyId] = useState("");
  const [deletingReportId, setDeletingReportId] = useState("");

  const [exportingReportId, setExportingReportId] = useState("");
  async function exportReport(report: ReportFeedbackRow, type: "contributions" | "deposits" | "feedback") {
    if (!scope || exportingReportId) return;
    setExportingReportId(report.id);
    setError("");
    try {
      const blob = await reportFeedbackApi.exportReport(scope.organizationId, scope.employerId, report.id, type);
      const [year, month] = report.reportingMonth.slice(0, 7).split("-");
      const monthLabel = year && month ? `${month}-${year}` : report.reportingMonth.slice(0, 7);
      const fileLabel = type === "contributions"
        ? "פירוט עובדים והפרשות"
        : type === "deposits"
          ? "סיכום הפקדות"
          : "משוב קופות";
      saveBlob(blob, `${fileLabel} - ${monthLabel}.xlsx`);
    } catch (err) {
      setError(errorMessage(err, "ייצוא הדוח נכשל"));
    } finally {
      setExportingReportId("");
    }
  }

  async function editDepositFromFeedback(
    report: ReportFeedbackRow,
    sourceDeposit: ReportFeedbackDepositRow,
    resolutionProblemIds: string[] = [],
  ) {
    const reportProductId = sourceDeposit.id;
    if (!scope || correctionBusyId) return;
    setError("");
    setCorrectionBusyId(report.id);
    try {
      let editReportId = report.id;
      let editProductId = reportProductId;

      if (!report.canEdit) {
        if (!report.canStartCorrectionWorkspace)
          throw new Error("הדיווח אינו פתוח לעריכה או לתיקון.");
        const workspace = await derivedReportsApi.ensureCorrectionWorkspace(
          scope.organizationId, scope.employerId, report.id, reportProductId,
        );
        if (!workspace.reportProductId)
          throw new Error("לא ניתן היה ליצור גרסת תיקון להפַקדה.");
        editReportId = workspace.reportId;
        editProductId = workspace.reportProductId;
      }

      const page = await manualDepositsApi.list(
        scope.organizationId, scope.employerId, editReportId, "", 0, 1, editProductId,
      );
      const deposit = page.items[0];
      if (!deposit) throw new Error("לא ניתן היה לטעון את פרטי ההפקדה לעריכה.");
      setFeedbackModal(null);
      setEditingDeposit({
        report,
        sourceDeposit,
        editReportId,
        deposit,
        contributionLimits: page.contributionLimits,
        resolutionProblemIds,
      });
    } catch (err) {
      setError(errorMessage(err, "טעינת פרטי ההפקדה לעריכה נכשלה"));
    } finally {
      setCorrectionBusyId("");
    }
  }

  async function resumeHybridTransmission(report: ReportFeedbackRow) {
    if (!scope || correctionBusyId || !report.canResumeHybrid) return;
    setCorrectionBusyId(report.id);
    setError("");
    try {
      await reportTransmissionApi.resumeHybrid(
        scope.organizationId, scope.employerId, report.id,
      );
      await load();
    } catch (err) {
      setError(errorMessage(err, "המשך השידור ליצרנים נכשל."));
      await load();
    } finally {
      setCorrectionBusyId("");
    }
  }

  async function openCorrectionWorkspace(report: ReportFeedbackRow) {
    if (!scope || correctionBusyId) return;
    setError("");
    setCorrectionBusyId(report.id);
    try {
      const workspace = await derivedReportsApi.ensureCorrectionWorkspace(
        scope.organizationId, scope.employerId, report.id,
      );
      router.push(`/reports/new?resumeReportId=${workspace.reportId}&correctionWorkspace=1`);
    } catch (err) {
      setError(errorMessage(err, "פתיחת תיקון הדיווח נכשלה"));
    } finally {
      setCorrectionBusyId("");
    }
  }

  async function materializeCorrection() {
    if (!scope || !retransmitReport || !retransmitReport.correctionWorkspaceId || correctionBusyId) return;
    const report = retransmitReport;
    const workspaceId = retransmitReport.correctionWorkspaceId;
    setCorrectionBusyId(report.id);
    setError("");
    try {
      const result = await derivedReportsApi.materializeCorrection(
        scope.organizationId, scope.employerId, workspaceId,
      );
      setRetransmitReport(null);
      if (result.negativeReportId) {
        const followUp = result.currentReportId ? `&followUpReportId=${result.currentReportId}` : "";
        router.push(`/reports/new?resumeReportId=${result.negativeReportId}${followUp}&correctionStage=negative`);
      } else if (result.currentReportId) {
        router.push(`/reports/new?resumeReportId=${result.currentReportId}&correctionStage=current`);
      } else {
        await load();
      }
    } catch (err) {
      setError(errorMessage(err, "יצירת הדיווח החוזר נכשלה"));
    } finally {
      setCorrectionBusyId("");
    }
  }

  async function removeDraft(report: ReportFeedbackRow) {
    if (!scope || deletingReportId) return;
    setDeletingReportId(report.id);
    setError("");
    try {
      await manualReportsApi.deleteManualReport(scope.organizationId, scope.employerId, report.id);
      setDeleteReport(null);
      removeReport(report.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, "מחיקת הטיוטה נכשלה"));
    } finally {
      setDeletingReportId("");
    }
  }

  async function onDepositSaved() {
    if (!editingDeposit) return;
    const { report, sourceDeposit, resolutionProblemIds, editReportId } = editingDeposit;
    try {
      if (resolutionProblemIds.length) {
        await reportFeedbackApi.resolveProblems(
          scope.organizationId, scope.employerId, report.id, resolutionProblemIds, "deposit-save", editReportId,
        );
      }
      setEditingDeposit(null);
      await Promise.all([loadExpanded(report, true), load()]);
      if (resolutionProblemIds.length) {
        setFeedbackModal({
          mode: "deposit", report, deposit: sourceDeposit, depositView: "errors", resolveOnOpen: true,
        });
      }
    } catch (err) {
      setError(errorMessage(err, "ההפקדה נשמרה אך סימון התקלה כמתוקנת נכשל."));
      setEditingDeposit(null);
      void loadExpanded(report, true);
      void load();
    }
  }

  return {
    error, setError, feedbackModal, setFeedbackModal, editingDeposit, setEditingDeposit,
    retransmitReport, setRetransmitReport, deleteReport, setDeleteReport,
    correctionBusyId, deletingReportId, exportingReportId, exportReport,
    editDepositFromFeedback, resumeHybridTransmission, openCorrectionWorkspace,
    materializeCorrection, removeDraft, onDepositSaved,
  };
}
