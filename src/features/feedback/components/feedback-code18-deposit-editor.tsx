"use client";

import { useEffect, useState } from "react";
import { ManualDepositData } from "@/features/reporting/components/manual-deposit-data";
import { reportFeedbackApi, type FeedbackResolutionGroup } from "@/features/feedback/api";

export function FeedbackCode18DepositEditor({
  organizationId, employerId, group, footerTargetId,
}: {
  organizationId: string;
  employerId: string;
  group: FeedbackResolutionGroup;
  footerTargetId: string;
}) {
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState<{
    reportId: string;
    productId: string;
  } | null>(null);
  const problem = group.problems[0];

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

  useEffect(() => {
    if (group.canExecute && problem?.reportProductId
      && problem.feedbackValues.missingFieldMapped === "true"
      && problem.feedbackValues.missingFieldCorrectionSupported !== "false") void openEditor();
    // The editor is prepared once for this selected group.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.groupKey]);

  if (!problem) return null;

  return <section aria-label="תיקון שדה הפקדה" className="feedback-code18-embedded-editor">
    <div className="notice notice-info">
      <strong>השדה לתיקון: {problem.feedbackValues.missingFieldName}</strong>
      <div>מספר {problem.feedbackValues.missingFieldNumber} · <code dir="ltr">{problem.feedbackValues.missingFieldXmlTag}</code></div>
      <p>העריכה מתבצעת בעותק התיקון של הדיווח. שמירה אינה שולחת דיווח חדש; לאחר תיקון כל השגיאות מפיקים דיווח חוזר אחד.</p>
    </div>
    {problem.feedbackValues.missingFieldCorrectionSupported === "false"
      ? <div role="status" className="notice notice-info">הממשק הנוכחי אינו מאפשר להכין סביבת תיקון אוטומטית לדיווח שלילי. אין לערוך את הדיווח שנשלח; יש להשתמש בתהליך התיקון הייעודי שלו.</div> : null}
    {error ? <div role="alert" className="notice notice-error">{error}</div> : null}
    {!workspace ? <div className="empty" role="status">{preparing ? "מכין סביבת תיקון..." : "לא ניתן לפתוח את סביבת התיקון באופן אוטומטי."}</div> : <div className="feedback-code18-deposit-workspace">
      <ManualDepositData
        key={workspace.reportId + workspace.productId}
        organizationId={organizationId}
        employerId={employerId}
        reportId={workspace.reportId}
        embeddedEditor
        footerTargetId={footerTargetId}
        focusReportProductId={workspace.productId}
      />
    </div>}
  </section>;
}
