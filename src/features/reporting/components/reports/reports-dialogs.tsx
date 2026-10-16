import { Trash2 } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { DepositPaymentEditor } from "../deposit-payment-editor";
import { ReportFeedbackModal } from "@/features/feedback/components/report-feedback-modal";
import { formatReportingMonth } from "@/lib/format/date";
import type { EmployerSelection } from "@/lib/session/app-store";
import type { useReportActions } from "../../hooks/use-report-actions";

export function ReportsDialogs({ scope, actions }: {
  scope: EmployerSelection;
  actions: ReturnType<typeof useReportActions>;
}) {
  const { feedbackModal, setFeedbackModal, editDepositFromFeedback, editingDeposit, setEditingDeposit,
    retransmitReport, setRetransmitReport, correctionBusyId, materializeCorrection,
    deleteReport, setDeleteReport, deletingReportId, removeDraft, onDepositSaved } = actions;
  return <>
    {feedbackModal ? <ReportFeedbackModal
      mode={feedbackModal.mode}
      organizationId={scope.organizationId}
      employerId={scope.employerId}
      reportId={feedbackModal.report?.id}
      reportProductId={feedbackModal.deposit?.id}
      hasFeedback={feedbackModal.deposit?.hasFeedback ?? false}
      depositView={feedbackModal.depositView ?? "details"}
      resolveOnOpen={feedbackModal.resolveOnOpen ?? false}
      onClose={() => setFeedbackModal(null)}
      onEditDeposit={feedbackModal.mode === "deposit"
        && feedbackModal.report
        && feedbackModal.deposit
        && (feedbackModal.report.canEdit || feedbackModal.report.canStartCorrectionWorkspace)
        ? (problemIds = []) => {
            const report = feedbackModal.report!;
            const deposit = feedbackModal.deposit!;
            setFeedbackModal(null);
            void editDepositFromFeedback(report, deposit, problemIds);
          }
        : undefined}
    /> : null}

    {editingDeposit ? <DepositPaymentEditor
      key={editingDeposit.deposit.id}
      employer={null}
      organizationId={scope.organizationId}
      employerId={scope.employerId}
      reportId={editingDeposit.editReportId}
      row={editingDeposit.deposit}
      contributionLimits={editingDeposit.contributionLimits}
      readOnly={false}
      onEvidenceChanged={() => {}}
      onClose={() => setEditingDeposit(null)}
      onSaved={onDepositSaved}
    /> : null}

    {retransmitReport ? <AppModal
      title="דיווח חוזר"
      subtitle={`${retransmitReport.employerName} · ${formatReportingMonth(retransmitReport.reportingMonth)}`}
      width="md"
      onClose={() => setRetransmitReport(null)}
      closeDisabled={correctionBusyId === retransmitReport.id}
      actions={<>
        <button className="btn btn-secondary" disabled={Boolean(correctionBusyId)} onClick={() => setRetransmitReport(null)}>ביטול</button>
        <button className="btn btn-primary" disabled={Boolean(correctionBusyId)} onClick={() => void materializeCorrection()}>
          יצירת דיווח חוזר
        </button>
      </>}
    >
      <p style={{ marginTop: 0 }}>ALPHA תשווה את גרסת העבודה לגרסה האפקטיבית האחרונה ותחשב Added / Changed / Removed.</p>
      <div className="notice notice-info">
        ייווצרו רק מסמכי 006 שנדרשים לדלתא: שלילי לרשומות שבוטלו או שונו, ושוטף לרשומות חדשות או מתוקנות. רשומות שלא השתנו לא יישלחו מחדש.
      </div>
    </AppModal> : null}

    {deleteReport ? <AppModal
      title="מחיקת טיוטה"
      subtitle={`${deleteReport.employerName} · ${formatReportingMonth(deleteReport.reportingMonth)}`}
      width="sm"
      onClose={() => setDeleteReport(null)}
      closeDisabled={deletingReportId === deleteReport.id}
      actions={<>
        <button className="btn btn-secondary" disabled={Boolean(deletingReportId)} onClick={() => setDeleteReport(null)}>ביטול</button>
        <button className="btn btn-danger" disabled={Boolean(deletingReportId)} onClick={() => void removeDraft(deleteReport)}>
          <Trash2 size={15} />{deletingReportId ? "מוחק..." : "מחיקת הטיוטה"}
        </button>
      </>}
    >
      <p style={{ marginTop: 0 }}>הטיוטה טרם יצאה מ־ALPHA ולכן ניתן למחוק אותה. לאחר שידור או ניסיון שידור, דיווחים נשמרים בהיסטוריה ולא ניתנים למחיקה.</p>
    </AppModal> : null}
  </>;
}
