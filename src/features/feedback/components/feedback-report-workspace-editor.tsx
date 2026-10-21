"use client";

import { useEffect, useMemo, useState } from "react";
import { ReportWizard } from "@/features/reporting/components/new-report/report-wizard";
import { useReportSetup } from "@/features/reporting/new-report/use-report-setup";
import { parseReportEntry } from "@/features/reporting/new-report/model";
import { reportFeedbackApi, type FeedbackResolutionGroup } from "@/features/feedback/api";
import { LoadingState } from "@/components/loading/loading-state";
import { errorMessage } from "@/lib/api/error-messages";
import { documentFocusFromFields } from "@/features/feedback/document-focus";

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
  const configuredDocumentType = documentFocusFromFields(source?.correctionFields);
  const negativeSourceReportId = group.resolverType === "documents" ? source?.feedbackValues.negativeCorrectionSourceReportId : null;
  const negativeSourceProductId = group.resolverType === "documents" ? source?.feedbackValues.negativeCorrectionSourceProductId : null;
  const negativeReferencePresent = group.resolverType === "documents" && group.problems.some(problem =>
    Boolean(problem.feedbackValues.negativeCorrectionSourceReportId || problem.feedbackValues.negativeCorrectionSourceProductId));
  const negativeDocumentRoute = Boolean(negativeSourceReportId && negativeSourceProductId
    && group.problems.every(problem => problem.feedbackValues.negativeCorrectionSourceReportId === negativeSourceReportId
      && problem.feedbackValues.negativeCorrectionSourceProductId === negativeSourceProductId));

  useEffect(() => {
    if (!source || !group.canExecute || !group.problems.every(problem => problem.treatmentCanCorrect)) {
      setError("אין הרשאה לתקן את קבוצת השגיאות שנבחרה.");
      setPreparing(false);
      return;
    }
    if ([3, 4, 6].includes(configuredDocumentType) && !negativeDocumentRoute) {
      setWorkspace(null);
      setError("לסוג המסמך שנדרש יש לצרף PDF בדיווח שלילי המשויך למוצר המקורי. לא נמצאו במשוב מזהי מקור מלאים; לא נפתח עורך דיווח שגוי.");
      setPreparing(false);
      return;
    }
    if (negativeReferencePresent && !negativeDocumentRoute) {
      setWorkspace(null);
      setError("מסמכי הדיווח משויכים למקורות שונים או שחסר מזהה מקור. יש לפתור כל מסמך בהקשר המקור הנכון.");
      setPreparing(false);
      return;
    }
    if (negativeDocumentRoute) {
      setWorkspace(null);
      setError("");
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
  }, [organizationId, employerId, group.groupKey, configuredDocumentType, negativeDocumentRoute, negativeReferencePresent]);

  const entry = useMemo(() => {
    const params = new URLSearchParams();
    if (!source) return parseReportEntry(params);
    if (configuredDocumentType) params.set("focusDocumentTypeCode", String(configuredDocumentType));
    if (negativeDocumentRoute && negativeSourceReportId && negativeSourceProductId) {
      params.set("sourceReportId", negativeSourceReportId);
      params.set("sourceProductId", negativeSourceProductId);
      params.set("sourceKind", "1");
      if (source.feedbackValues.negativeCorrectionSourceMonth)
        params.set("sourceMonth", source.feedbackValues.negativeCorrectionSourceMonth);
      params.set("resolutionResolver", "documents");
      return parseReportEntry(params);
    }
    if (!workspace) return parseReportEntry(params);
    params.set("resumeReportId", workspace.reportId);
    params.set("correctionWorkspace", "1");
    if (workspace.reportProductId) params.set("focusReportProductId", workspace.reportProductId);
    if (workspace.reportEmployeeId) params.set("focusReportEmployeeId", workspace.reportEmployeeId);
    params.set("resolutionResolver", group.resolverType);
    params.set("resolutionSourceReportId", source.reportId);
    params.set("resolutionProblemIds", group.problems.map(problem => problem.problemId).join(","));
    return parseReportEntry(params);
  }, [workspace, source, group.resolverType, group.problems, configuredDocumentType, negativeDocumentRoute, negativeSourceReportId, negativeSourceProductId]);

  if (error) return <div role="alert" className="notice notice-error">{error}</div>;
  if (preparing || setup.isLoading) return <LoadingState label="מכין את אשף הדיווח הקיים לתיקון..." />;
  if (setup.error || !setup.data)
    return <div role="alert" className="notice notice-error">{errorMessage(setup.error, "טעינת נתוני הדיווח נכשלה.")}</div>;
  if (!workspace && !negativeDocumentRoute) return <div role="status" className="notice notice-info">לא נמצאה סביבת תיקון. ודאו שהדיווח המקורי נשלח והוא מסוג שוטף.</div>;

  return <section className="feedback-embedded-report-workspace" aria-label="תיקון דיווח בתוך פתרון בעיות">
    <div className="notice notice-info">
      {negativeDocumentRoute
        ? "המסמך מחייב מסלול דיווח שלילי. נפתח האשף הקיים לפי נתוני המקור המדויקים שבמשוב; בדקו את התנועות לפני כל השלמה. לא תתבצע שליחה מתוך המודל."
        : "התיקון מתבצע בעותק עבודה נפרד. הדיווח שכבר נשלח אינו משתנה."}
    </div>
    <ReportWizard key={workspace?.reportId ?? `${negativeSourceReportId}:${negativeSourceProductId}`} scope={scope} setup={setup.data} entry={entry} embedded />
  </section>;
}
