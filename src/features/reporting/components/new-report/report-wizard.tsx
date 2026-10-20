"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { AppShell } from "@/features/shell/components/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import type { EmployerSelection } from "@/lib/session/app-store";
import type { ReportEntry } from "../../new-report/model";
import type { ReportSetup } from "../../new-report/use-report-setup";
import { useReportWizard } from "../../new-report/use-report-wizard";
import { ReportTypeBanner } from "./report-type-banner";
import { ReportWizardStages } from "./report-wizard-stages";
import { ReportWizardFooter } from "./report-wizard-footer";
import { ReportWizardDialogs } from "./report-wizard-dialogs";

export function ReportWizard({ scope, entry, setup }: {
  scope: EmployerSelection;
  entry: ReportEntry;
  setup: ReportSetup;
}) {
  const wizard = useReportWizard(scope, entry, setup);
  const { state, steps } = wizard;
  return <AppShell title="דיווח חדש" hideScopeController={state.step > 1 || state.advancing || state.sending}>
    <div className={state.step > 1 ? "wizard wizard-wide" : "wizard"}>
      <PageHeader title="יצירת דיווח פנסיוני" description={<>
        <Link className="profile-link" href={`/employers/${setup.employer.id}?organizationId=${scope.organizationId}`}>
          {setup.employer.legalName}
        </Link>
        {` · ח.פ. ${setup.employer.registrationNumber}`}
      </>} />
      {state.step > 1 ? <ReportTypeBanner
        reportKind={state.isCorrectionWorkspace ? 1 : state.reportKind}
        source={wizard.selectedSource}
        month={state.month}
        correctionOperationCode={wizard.isCorrection ? state.correctionOperationCode : null}
      /> : null}
      <div className="steps">
        {steps.labels.map((label, index) => {
          const number = index + 1;
          return <div key={label} className={`step${number === state.step ? " current" : number < state.step ? " done" : ""}`}>
            <div className="step-number">{number < state.step ? <Check size={16} /> : number}</div>
            {label}
          </div>;
        })}
      </div>
      {state.error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{state.error}</div> : null}
      {!setup.capabilities.canCreateReport ? <div className="notice notice-info" style={{ marginBottom: 18 }}>
        יש לך הרשאת צפייה במעסיק, אך אין לך הרשאה ליצור או לערוך דיווחים.
      </div> : null}
      <section className="card">
        <ReportWizardStages scope={scope} entry={entry} setup={setup} wizard={wizard} />
        <ReportWizardFooter wizard={wizard} capabilities={setup.capabilities} scope={scope} />
      </section>
    </div>
    <ReportWizardDialogs scope={scope} setup={setup} wizard={wizard} />
  </AppShell>;
}
