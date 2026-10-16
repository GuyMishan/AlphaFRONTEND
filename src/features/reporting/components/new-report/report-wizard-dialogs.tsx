import { Trash2 } from "lucide-react";
import { AppModal } from "@/components/ui/app-modal";
import { BillingGateModal } from "@/features/billing/components/billing-gate-modal";
import { formatReportingMonth } from "@/lib/format/date";
import type { EmployerSelection } from "@/lib/session/app-store";
import { ReportValidationErrorsModal } from "../report-validation-errors-modal";
import { reportKindLabel } from "../../labels";
import type { ReportSetup } from "../../new-report/use-report-setup";
import type { ReportWizard } from "../../new-report/use-report-wizard";

export function ReportWizardDialogs({ scope, setup, wizard }: {
  scope: EmployerSelection;
  setup: ReportSetup;
  wizard: ReportWizard;
}) {
  const { billing, drafts, state, patch, steps } = wizard;
  return <>
    {billing.open ? <BillingGateModal
      {...scope}
      gate={billing.gate ?? {
        canTransmit: false, error: "pension_payment_account_required", billingMode: null,
        source: null, billedThroughName: null, paymentMethodType: null, paymentMethodStatus: null, configured: false,
      }}
      canManageOrganizationBilling={setup.canManageOrganizationBilling}
      canManageEmployerBilling={setup.capabilities.canManageEmployer}
      onClose={() => billing.setOpen(false)}
    /> : null}
    {drafts.selected ? <AppModal
      title="מחיקת טיוטה"
      subtitle={`${reportKindLabel(drafts.selected.reportKind)} · ${formatReportingMonth(drafts.selected.reportingMonth)}`}
      width="sm" onClose={() => drafts.setSelected(null)} closeDisabled={Boolean(drafts.deletingId)}
      actions={<>
        <button type="button" className="btn btn-secondary" disabled={Boolean(drafts.deletingId)}
          onClick={() => drafts.setSelected(null)}>ביטול</button>
        <button type="button" className="btn btn-danger" disabled={Boolean(drafts.deletingId)}
          onClick={() => void drafts.removeSelected()}>
          <Trash2 size={15} />{drafts.deletingId ? "מוחק..." : "מחיקת הטיוטה"}
        </button>
      </>}>
      <p style={{ marginTop: 0 }}>הטיוטה עדיין לא נשלחה ולכן ניתן למחוק אותה. דיווח שהיה בו ניסיון שידור נשמר בהיסטוריה ולא ניתן למחיקה.</p>
    </AppModal> : null}
    {state.validationResult ? <ReportValidationErrorsModal
      {...scope} result={state.validationResult} reportMonth={state.month} reportId={state.reportId}
      onClose={() => patch({ validationResult: null })}
      onEdit={issue => {
        const step = issue.scope === "Payment" || issue.code.startsWith("PAYMENT_") ? steps.deposits
          : issue.scope === "Report" || issue.code === "SALARY_PAYMENT_DATE_REQUIRED" ? 1 : steps.employees;
        patch({
          step, validationResult: null, error: "",
          validationFocus: { employeeId: issue.employeeId ?? "", productId: issue.productId ?? "" },
        });
      }}
    /> : null}
  </>;
}
