"use client";

import Link from "next/link";
import { AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { AppShell } from "@/features/shell/components/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { useEmployerScope } from "@/features/scope/use-employer-scope";
import type { EmployerSelection } from "@/lib/session/app-store";
import { useReportsView } from "../hooks/use-reports-view";
import { useReportDeposits } from "../hooks/use-report-deposits";
import { useReportActions } from "../hooks/use-report-actions";
import { ReportsFilters } from "../components/reports/reports-filters";
import { ReportsTable } from "../components/reports/reports-table";
import { ReportsDialogs } from "../components/reports/reports-dialogs";
import "./reports-screen.css";

export default function ReportsPage() {
  const scope = useEmployerScope();
  // A new employer gets a fresh filter, expansion and dialog workspace.
  return <ReportsWorkspace key={scope.organizationId + ":" + scope.employerId} scope={scope} />;
}

function ReportsWorkspace({ scope: selectedScope }: { scope: EmployerSelection }) {
  const scope = selectedScope.organizationId && selectedScope.employerId ? selectedScope : null;
  const view = useReportsView(selectedScope);
  const deposits = useReportDeposits(selectedScope);
  const actions = useReportActions(selectedScope, { load: view.load, loadExpanded: deposits.loadExpanded, removeReport: deposits.removeReport });
  const { employerIssueCount, loading, summary, listError } = view;
  const { error, setFeedbackModal } = actions;
  async function load() {
    actions.setError("");
    await view.load();
  }

  return <AppShell title="דיווחים ומשובים">
    <PageHeader title="דיווחים ומשובים" description="מעקב, משוב, מצב כספים וטיפול ידני — במקום אחד."
      actions={<div className="report-page-actions">
        {scope && employerIssueCount > 0 ? <button
          type="button"
          className="employer-error-section"
          onClick={() => setFeedbackModal({ mode: "employer", resolveOnOpen: true })}
          aria-label={`שגיאות מעסיק · ${employerIssueCount}`}
        >
          <AlertTriangle size={18} aria-hidden="true" />
          <span><b>שגיאות מעסיק</b><small>{employerIssueCount} {employerIssueCount === 1 ? "שגיאה דורשת טיפול" : "שגיאות דורשות טיפול"}</small></span>
          <span className="employer-error-section-cta">פתור בעיות</span>
        </button> : null}
        <button className="btn btn-secondary" type="button" onClick={() => void load()} disabled={!scope || loading}>
          <RefreshCw size={16} />רענון
        </button>
        <Link className="btn btn-primary" href="/reports/new"><Plus size={16} />דיווח חדש</Link>
      </div>} />

    {!scope ? <div className="notice notice-info">יש לבחור ארגון ומעסיק בבורר העליון כדי לצפות בדיווחים.</div> : null}
    {error || listError ? <div className="notice notice-error report-page-error">{error || listError}</div> : null}

    <div className="report-feedback-summary">
      <div className="card"><strong>{summary.total}</strong><span>דיווחים בתצוגה</span></div>
      <div className="card"><strong>{summary.completed}</strong><span>הושלמו</span></div>
      <div className="card"><strong>{summary.attention}</strong><span>שורות דורשות טיפול</span></div>
      <div className="card"><strong>{summary.pending}</strong><span>ממתינים למשוב</span></div>
    </div>

    <ReportsFilters view={view} />
    <ReportsTable view={view} deposits={deposits} actions={actions} />
    {scope ? <ReportsDialogs scope={scope} actions={actions} /> : null}
  </AppShell>;
}
