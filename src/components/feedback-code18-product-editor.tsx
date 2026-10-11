"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { reportFeedbackApi, type FeedbackResolutionGroup } from "@/lib/report-feedback-api";

export function FeedbackCode18ProductEditor({
  organizationId, employerId, group,
}: {
  organizationId: string;
  employerId: string;
  group: FeedbackResolutionGroup;
}) {
  const router = useRouter();
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const problem = group.problems[0];
  if (!problem) return null;
  const field = problem.feedbackValues.missingFieldNumber ?? "";
  const source = ["79", "80", "81", "82"].includes(field) ? "הפרשות" : "פרטי מוצר";

  async function openWorkspace() {
    if (!problem.reportProductId) { setError("לא זוהה המוצר בדיווח המקורי."); return; }
    setPreparing(true);
    setError("");
    try {
      const result = await reportFeedbackApi.prepareInternalResolution(
        organizationId, employerId, problem.reportId, group.groupKey,
        group.resolverType, problem.reportProductId,
        group.problems.map(item => item.problemId),
      );
      if (!result.workspaceReportProductId || !result.workspaceReportEmployeeId)
        throw new Error("לא התקבל שיוך מדויק של עובד ומוצר בסביבת התיקון.");
      const params = new URLSearchParams({
        resumeReportId: result.workspaceReportId,
        correctionWorkspace: "1",
        focusReportEmployeeId: result.workspaceReportEmployeeId,
        focusReportProductId: result.workspaceReportProductId,
        focusMissingFieldNumber: field,
        resolutionResolver: group.resolverType,
        resolutionSourceReportId: problem.reportId,
        resolutionProblemIds: group.problems.map(item => item.problemId).join(","),
      });
      router.push(`/reports/new?${params.toString()}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "פתיחת עורך התיקון נכשלה.");
    } finally {
      setPreparing(false);
    }
  }

  return <section className="feedback-code18-embedded-editor" aria-label="תיקון שדות מוצר והפרשות">
    <div className="notice notice-info">
      <strong>תיקון שדה {field} — {problem.feedbackValues.missingFieldName}</strong>
      <p>הנתון שייך ל{source} של העובד והמוצר בדיווח. נפתח את העורך הקיים בסביבת התיקון עם העובד והמוצר הרלוונטיים. הדיווח שנשלח לא ישתנה.</p>
    </div>
    {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
    <button type="button" className="btn btn-primary"
      disabled={!group.canExecute || preparing || problem.feedbackValues.missingFieldCorrectionSupported === "false"}
      onClick={() => void openWorkspace()}>
      {preparing ? "מכין סביבת תיקון..." : `פתיחת עורך ${source}`}
      <ArrowLeft size={16} aria-hidden="true" />
    </button>
  </section>;
}
