import type { EmployerSelection } from "@/lib/session/app-store";
import { ExcelEmployeeIntake } from "@/features/employees/components/excel-employee-intake";
import { EmployerInterfaceXmlIntake } from "../employer-interface-xml-intake";
import { ManualReportData } from "../manual-report-data";
import { ManualDepositData } from "../manual-deposit-data";
import type { ReportEntry } from "../../new-report/model";
import type { ReportSetup } from "../../new-report/use-report-setup";
import type { ReportWizard } from "../../new-report/use-report-wizard";
import { ReportDetails } from "./report-details";
import { OpenReportDrafts } from "./open-report-drafts";
import { Summary } from "./report-summary";

export function ReportWizardStages({ scope, entry, setup, wizard }: {
  scope: EmployerSelection;
  entry: ReportEntry;
  setup: ReportSetup;
  wizard: ReportWizard;
}) {
  const { state, patch, isCorrection, isExcel, isXml, steps, sources, billing, drafts } = wizard;
  if (state.step === 1) return <>
    <ReportDetails
      reportKind={state.reportKind} setReportKind={wizard.chooseKind}
      selectingExisting={state.showOpenReports}
      onSelectExisting={() => patch({ showOpenReports: true, error: "" })}
      mode={state.mode} setMode={wizard.chooseMode}
      correctionOperationCode={state.correctionOperationCode}
      setCorrectionOperationCode={correctionOperationCode => patch({ correctionOperationCode })}
      month={state.month} setMonth={month => patch({ month })}
      salaryPaymentDate={state.salaryPaymentDate}
      setSalaryPaymentDate={salaryPaymentDate => patch({ salaryPaymentDate, ...(salaryPaymentDate ? { error: "" } : {}) })}
      showValidation={state.stepOneAttempted}
      sourceReports={isCorrection ? sources.eligible : sources.items}
      sourceSearch={sources.search} setSourceSearch={sources.setSearch}
      sourceHasMore={sources.hasMore} loadingSources={sources.loading}
      selectedSourceReportId={state.sourceReportId} chooseSource={report => void wizard.openSource(report)}
      advancing={state.advancing}
      searchSources={() => void sources.load()}
      loadMoreSources={() => void sources.load(false)}
    />
    {state.showOpenReports && setup.capabilities.canCreateReport ? <OpenReportDrafts
      openReports={drafts.items} loadingOpenReports={drafts.loading} openReportsHasMore={drafts.hasMore}
      advancing={state.advancing} deletingDraftId={drafts.deletingId} loadMoreOpenReports={drafts.loadMore}
      onResume={draft => void wizard.resume(draft.id)} onDelete={drafts.setSelected}
      search={drafts.search} setSearch={drafts.setSearch} onSearch={() => void drafts.searchDrafts()}
    /> : null}
  </>;

  if (isXml && state.step === 2) return <EmployerInterfaceXmlIntake
      {...scope} paymentAccountId={state.paymentAccountId} salaryPaymentDate={state.salaryPaymentDate}
      disabled={!setup.capabilities.canCreateReport || !state.paymentAccountId}
      onBeforeImport={() => billing.ensureAccess(state.paymentAccountId)} onReportImported={wizard.onXmlImported}
    />;

  if (isExcel && state.step === 2) return <ExcelEmployeeIntake
    {...scope} reportingMonth={state.month}
    onChange={excelIntake => patch({ excelIntake, fileName: excelIntake?.fileName ?? "", error: "" })}
  />;

  if (state.step === steps.employees && state.reportId) return <ManualReportData
    {...scope} reportId={state.reportId} month={state.month}
    employees={state.employees} selectedIds={state.selectedIds}
    setSelectedIds={selectedIds => patch({ selectedIds })}
    correctionWorkspace={entry.correctionWorkspace || state.reportKind === 2}
    negative={state.reportKind === 3}
    focusReportEmployeeId={state.validationFocus?.employeeId ?? entry.focusEmployeeId}
    focusReportProductId={state.validationFocus?.productId ?? state.focusedProductId}
    focusMissingFieldNumber={entry.missingFieldNumber}
    focusDocumentTypeCode={entry.documentTypeCode}
  />;

  if (state.step === steps.deposits && state.reportId) return <ManualDepositData
    {...scope} reportId={state.reportId}
    focusReportProductId={state.validationFocus?.productId ?? state.focusedProductId}
    focusDocumentTypeCode={entry.documentTypeCode}
  />;

  if (state.step !== steps.summary) return null;
  return <>
    <Summary
      employer={setup.employer} month={state.month} reportKind={state.reportKind} mode={state.mode}
      correctionOperationCode={isCorrection ? state.correctionOperationCode : null}
      selectedCount={state.selectedIds.length} fileName={state.fileName} source={wizard.selectedSource}
      paymentAccount={billing.accounts.find(item => item.id === state.paymentAccountId) ?? null}
      sentExternalId={state.sentExternalId}
    />
    {state.reportKind === 2 ? <div className="notice notice-info" style={{ marginTop: 18 }}>
      <b>{"טיוטת תיקון לדיווח שנשלח"}</b>
      <div>{"השינויים נשמרים בגרסה נפרדת. עדיין אין שליחה ישירה מסביבת התיקון; הסיום יתאפשר לאחר חיבור בחירת המסלול ויצירת מסמכי 006."}</div>
    </div> : null}
    {billing.gate?.canTransmit && state.reportKind !== 2 ? <div className="notice notice-info" style={{ marginTop: 18 }}>
      <b>חיוב Alpha תקין לשידור</b>
      {billing.gate.billedThroughName ? <div>מחויב דרך: {billing.gate.billedThroughName}</div> : null}
    </div> : null}
  </>;
}
