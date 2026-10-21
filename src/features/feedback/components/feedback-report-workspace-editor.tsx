"use client";

import { useEffect, useMemo, useState } from "react";
import { ReportWizard } from "@/features/reporting/components/new-report/report-wizard";
import { useReportSetup } from "@/features/reporting/new-report/use-report-setup";
import { parseReportEntry } from "@/features/reporting/new-report/model";
import { reportFeedbackApi, type FeedbackResolutionGroup } from "@/features/feedback/api";
import { LoadingState } from "@/components/loading/loading-state";
import { errorMessage } from "@/lib/api/error-messages";

/** Reuses the normal report wizard, but on an isolated correction copy of the sent report. */
export function FeedbackReportWorkspaceEditor({ organizationId, employerId, group }: {
  organizationId: string;
  employerId: string;
  group: FeedbackResolutionGroup;
}) {
  const scope = useMemo(() => ({ organizationId, employerId }), [organizationId, employerId]);
  const setup = useReportSetup(scope);
  const [workspace, setWorkspace] = useState<{
    reportId: string;
    reportProductId: string | null;
    reportEmployeeId: string | null;
  } | null>(null);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(true);
  const source = group.problems[0];

  useEffect(() => {
    if (!source || !group.canExecute || !group.problems.every(problem => problem.treatmentCanCorrect)) {
      setError("אין הרשאה לתקן את קבוצת השגיאות שנבחרה.");
      setPreparing(false);
      return;
    }
    let cancelled = false;
    setWorkspace(null);
    setError("");
    setPreparing(true);
    reportFeedbackApi.prepareInternalResolution(
      organizationId, employerId, source.reportId, group.groupKey, group.resolverType,
      source.reportProductId,
      group.problems.map(problem => problem.problemId),
    ).then(result => {
      if (!cancelled) setWorkspace({
        reportId: result.workspaceReportId,
        reportProductId: result.workspaceReportProductId,
        reportEmployeeId: result.workspaceReportEmployeeId,
      });
    }).catch(cause => {
      if (!cancelled) setError(errorMessage(cause, "לא ניתן להכין עותק תיקון לדיווח."));
    }).finally(() => { if (!cancelled) setPreparing(false); });
    return () => { cancelled = true; };
  // The group key uniquely identifies the selected correction operation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, employerId, group.groupKey]);

  const entry = useMemo(() => {
    const params = new URLSearchParams();
    if (!workspace || !source) return parseReportEntry(params);
    params.set("resumeReportId", workspace.reportId);
    params.set("correctionWorkspace", "1");
    if (workspace.reportProductId) params.set("focusReportProductId", workspace.reportProductId);
    if (workspace.reportEmployeeId) params.set("focusReportEmployeeId", workspace.reportEmployeeId);
    params.set("resolutionResolver", group.resolverType);
    params.set("resolutionSourceReportId", source.reportId);
    params.set("resolutionProblemIds", group.problems.map(problem => problem.problemId).join(","));
    return parseReportEntry(params);
  }, [workspace, source, group.resolverType, group.problems]);

  if (error) return <div role="alert" className="notice notice-error">{error}</div>;
  if (preparing || setup.isLoading) return <LoadingState label="מכין את אשף הדיווח הקיים לתיקון..." />;
  if (setup.error || !setup.data)
    return <div role="alert" className="notice notice-error">{errorMessage(setup.error, "טעינת נתוני הדיווח נכשלה.")}</div>;
  if (!workspace) return <div role="status" className="notice notice-info">לא נמצאה סביבת תיקון.</div>;

  return <section className="feedback-embedded-report-workspace" aria-label="תיקון דיווח בתוך פתרון בעיות">
    <div className="notice notice-info">
      התיקון מתבצע בעותק עבודה נפרד. הדיווח שכבר נשלח אינו משתנה.
    </div>
    <ReportWizard key={workspace.reportId} scope={scope} setup={setup.data} entry={entry} embedded />
  </section>;
}
