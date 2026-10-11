"use client";

import { useState } from "react";
import { ManualDepositData } from "@/components/manual-deposit-data";
import { reportFeedbackApi, type FeedbackResolutionGroup } from "@/lib/report-feedback-api";

export function FeedbackCode18DepositEditor({
  organizationId, employerId, group,
}: {
  organizationId: string;
  employerId: string;
  group: FeedbackResolutionGroup;
}) {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState<{
    reportId: string;
    productId: string;
  } | null>(null);
  const problem = group.problems[0];

  if (!problem) return null;

  async function openEditor() {
    if (!problem || !problem.reportProductId) {
      setError("לא ניתן לזהות את ההפקדה שאליה שייך השדה.");
      return;
    }
    setPreparing(true);
    setError("");
    try {
      const result = await reportFeedbackApi.prepareInternalResolution(
        organizationId,
        employerId,
        problem.reportId,
        group.groupKey,
        group.resolverType,
        problem.reportProductId,
        group.problems.map(item => item.problemId),
      );
      if (!result.workspaceReportProductId)
        throw new Error("סביבת התיקון לא החזירה מזהה מוצר לעריכה.");
      setWorkspace({
        reportId: result.workspaceReportId,
        productId: result.workspaceReportProductId,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "פתיחת סביבת התיקון נכשלה.");
    } finally {
      setPreparing(false);
    }
  }

  return <section aria-label="תיקון שדה הפקדה" className="feedback-code18-embedded-editor">
    <div className="notice notice-info">
      <strong>השדה לתיקון: {problem.feedbackValues.missingFieldName}</strong>
      <div>מספר {problem.feedbackValues.missingFieldNumber} · <code dir="ltr">{problem.feedbackValues.missingFieldXmlTag}</code></div>
      <p>העריכה מתבצעת בעותק התיקון של הדיווח. שמירה אינה שולחת דיווח חדש; לאחר תיקון כל השגיאות מפיקים דיווח חוזר אחד.</p>
    </div>
    {error ? <div role="alert" className="notice notice-error">{error}</div> : null}
    {!workspace ? <button
      type="button"
      className="btn btn-primary"
      disabled={preparing || !group.canExecute || problem.feedbackValues.missingFieldMapped !== "true"}
      onClick={() => void openEditor()}>
      {preparing ? "מכין סביבת תיקון..." : "פתיחת עריכת ההפקדה בתוך פתרון בעיות"}
    </button> : <div className="feedback-code18-deposit-workspace">
      <ManualDepositData
        key={workspace.reportId + workspace.productId}
        organizationId={organizationId}
        employerId={employerId}
        reportId={workspace.reportId}
        embeddedEditor
        focusReportProductId={workspace.productId}
      />
    </div>}
  </section>;
}
