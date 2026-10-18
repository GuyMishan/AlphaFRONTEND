import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import type { ReportWizard } from "../../new-report/use-report-wizard";
import type { ReportSetup } from "../../new-report/use-report-setup";

export function ReportWizardFooter({ wizard, capabilities }: {
  wizard: ReportWizard;
  capabilities: ReportSetup["capabilities"];
}) {
  const router = useRouter();
  const { state, patch, steps, isExcel, isXml, billing } = wizard;
  const busy = state.advancing || state.sending;
  const sent = Boolean(state.sentExternalId);
  if (state.step === 1 && (state.showOpenReports || isXml)) return null;

  function continueReport() {
    if (state.step === 1) void wizard.next();
    else if (!state.paymentAccountId) billing.setOpen(true);
    else if (wizard.canContinue) void wizard.next();
  }

  const sendLabel = state.reportKind === 2 ? "סיום התיקון יהיה זמין לאחר בחירת מסלול"
    : state.sending ? "מבצע ולידציה ושולח..." : sent ? "הדיווח נשלח" : "שליחת דיווח";

  return <div className="wizard-footer">
    <button type="button" className="btn btn-secondary"
      disabled={state.step === 1 || (state.resumingDraft && state.step === 2) || busy || sent}
      onClick={() => patch({ error: "", step: state.step - 1 })}>
      <ArrowRight size={17} />חזרה
    </button>
    {state.step < steps.summary ? <button type="button" className="btn btn-primary"
      disabled={busy || !capabilities.canCreateReport} onClick={continueReport} aria-busy={state.advancing}>
      {state.advancing ? "בודק ושומר..." : isExcel && state.step === 2 ? "אישור עובדים והמשך" : "המשך"}
      <ArrowLeft size={17} />
    </button> : <>
      {sent || state.reportKind === 2 ? <button type="button" className="btn btn-secondary" onClick={() => router.push("/reports")}>
        {state.reportKind === 2 ? "חזרה לדיווחים" : "יציאה"}
      </button> : null}
      <button type="button" className="btn btn-primary"
        disabled={state.reportKind === 2 || state.sending || sent || !state.reportId || !capabilities.canTransmitReport}
        onClick={() => void wizard.send()} aria-busy={state.sending}>
        <Send size={17} />{sendLabel}
      </button>
    </>}
  </div>;
}
