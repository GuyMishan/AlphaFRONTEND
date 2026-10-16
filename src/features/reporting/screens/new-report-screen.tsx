"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/features/shell/components/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingState } from "@/components/loading/loading-state";
import { useEmployerScope } from "@/features/scope/use-employer-scope";
import { errorMessage } from "@/lib/api/error-messages";
import { parseReportEntry } from "../new-report/model";
import { useReportSetup } from "../new-report/use-report-setup";
import { ReportWizard } from "../components/new-report/report-wizard";

export default function NewReportPage() {
  const params = useSearchParams();
  const scope = useEmployerScope();
  const setup = useReportSetup(scope);
  const hasScope = Boolean(scope.organizationId && scope.employerId);

  if (hasScope && setup.data) return <ReportWizard
    key={`${scope.organizationId}:${scope.employerId}:${params.toString()}`}
    scope={scope} entry={parseReportEntry(params)} setup={setup.data}
  />;

  return <AppShell title="דיווח חדש">
    <div className="wizard">
      <PageHeader title="יצירת דיווח פנסיוני" description="יש לבחור מעסיק בבורר העליון" />
      {setup.error ? <div className="notice notice-error">
        {errorMessage(setup.error, "טעינת הנתונים נכשלה")}
        <button type="button" className="btn btn-secondary" onClick={() => void setup.refetch()}>ניסיון חוזר</button>
      </div> : hasScope ? <div className="card"><LoadingState label="טוען את המעסיק והעובדים..." /></div>
        : <div className="card empty">
          <h3>עדיין לא נבחר מעסיק</h3>
          <Link className="btn btn-primary" href="/dashboard">לבחירת מעסיק</Link>
        </div>}
    </div>
  </AppShell>;
}
