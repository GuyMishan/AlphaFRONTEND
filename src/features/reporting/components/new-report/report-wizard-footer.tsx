import { useRouter } from "next/navigation";
import { useState } from "react";
import { CorrectionRouteModal } from "./correction-route-modal";
import type { EmployerSelection } from "@/lib/session/app-store";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import type { ReportWizard } from "../../new-report/use-report-wizard";
import type { ReportSetup } from "../../new-report/use-report-setup";

export function ReportWizardFooter({ wizard, capabilities, scope, embedded = false }: {
  wizard: ReportWizard;
  capabilities: ReportSetup["capabilities"];
  scope: EmployerSelection;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [showRoutes, setShowRoutes] = useState(false);
  const { state, patch, steps, isExcel, isXml, billing } = wizard;
  const busy = state.advancing || state.sending;
  const sent = Boolean(state.sentExternalId);
  if (state.step === 1 && (state.showOpenReports || state.reportKind === 2)) return null;

  function continueReport() {
    if (state.step === 1) void wizard.next();
    else if (!state.paymentAccountId) billing.setOpen(true);
    else if (wizard.canContinue) void wizard.next();
  }

  const sendLabel = state.reportKind === 2 ? "סיום דיווח"
    : state.sending ? "מבצע ולידציה ושולח..." : sent ? "הדיווח נשלח" : "שליחת דיווח";

  return <>
  <div className="wizard-footer">
    {state.step > 1 ? <button type="button" className="btn btn-secondary"
      disabled={(state.resumingDraft && state.step === 2) || busy || sent}
      onClick={() => patch(state.step === 2 && state.reportKind === 2
        ? { error: "", step: 1, sourceReportId: "", reportId: "", isCorrectionWorkspace: false, resumingDraft: false, stepOneAttempted: false }
        : { error: "", step: state.step - 1 })}>
      <ArrowRight size={17} />חזרה
    </button> : <span aria-hidden="true" />}
    {isXml && state.step === 2 ? null : state.step < steps.summary ? <button type="button" className="btn btn-primary"
      disabled={busy || !capabilities.canCreateReport} onClick={continueReport} aria-busy={state.advancing}>
      {state.advancing ? "בודק ושומר..." : isExcel && state.step === 2 ? "אישור עובדים והמשך" : "המשך"}
      <ArrowLeft size={17} />
    </button> : <>
      {!embedded && (sent || state.reportKind === 2) ? <button type="button" className="btn btn-secondary" onClick={() => router.push("/reports")}>
        {state.reportKind === 2 ? "חזרה לדיווחים" : "יציאה"}
      </button> : null}
      {!embedded ? <button type="button" className="btn btn-primary"
        disabled={state.sending || sent || !state.reportId || (state.reportKind === 2 ? !capabilities.canCreateReport : !capabilities.canTransmitReport)}
        onClick={() => state.reportKind === 2 ? setShowRoutes(true) : void wizard.send()} aria-busy={state.sending}>
        <Send size={17} />{sendLabel}
      </button> : null}
    </>}
  </div>
  {embedded && state.step >= steps.summary ? <div role="status" className="notice notice-info">
    התיקונים נשמרים בטיוטת הדיווח. שליחה תתבצע ממסך הדיווחים לאחר טיפול בכלל השגיאות.
  </div> : null}
  {showRoutes && state.reportKind === 2 && state.reportId ? <CorrectionRouteModal
    organizationId={scope.organizationId} employerId={scope.employerId}
    workspaceId={state.reportId} onClose={() => setShowRoutes(false)} /> : null}
  </>;
}
