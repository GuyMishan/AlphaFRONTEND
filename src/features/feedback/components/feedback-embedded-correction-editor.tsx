"use client";

import { useEffect, useState } from "react";
import { ManualDepositData } from "@/features/reporting/components/manual-deposit-data";
import { EmployerForm } from "@/features/employers/components/employer-form";
import { employersApi } from "@/features/employers/api";
import type { Employer } from "@/features/employers/types";
import { reportFeedbackApi, type FeedbackResolutionGroup, type FeedbackResolutionProblem } from "@/features/feedback/api";
import { LoadingState } from "@/components/loading/loading-state";
import { errorMessage } from "@/lib/api/error-messages";

// Field ownership is defined by the existing form, not by any feedback error code.
const employerContactFields: Record<string, keyof import("@/features/employers/types").EmployerInput> = {
  "SHEM-PRATI-PONE-LEMISLAKA": "contactFirstName",
  "SHEM-MISHPACHA-PONE-LEMISLAKA": "contactLastName",
  "MISPAR-TELEPHONE-KAVI-PONE-LEMISLAKA": "contactPhone",
  "E-MAIL-PONE-LEMISLAKA": "contactEmail",
  "MISPAR-CELLULARI": "contactMobile",
};


export function embeddedCorrectionSurface(problem: FeedbackResolutionProblem): "employer" | "deposit" | null {
  const values = problem.feedbackValues;
  const missing = values.missingFieldMapped === "true";
  if (missing && problem.targetScope === "employer"
      && Boolean(employerContactFields[values.missingFieldXmlTag ?? ""])) return "employer";
  const hasConcreteEdit = problem.availableActions.some(action =>
    ["editProduct", "editContribution", "editPayment", "editEmployment", "prepareCorrection"].includes(action));
  if (problem.targetScope !== "deposit" || !problem.reportProductId
      || !problem.treatmentCanCorrect || (!missing && !hasConcreteEdit)
      || values.missingFieldCorrectionSupported === "false"
      || values.missingFieldEditSurface === "employeeProfile"
      || ["57", "58"].includes(values.missingFieldNumber ?? "")) return null;
  // Restrict to correction resolvers supported by the backend workspace contract.
  if (!["split", "conditionalField", "contribution", "productPolicy", "employmentStatus", "payment"].includes(problem.resolverType)) return null;
  return "deposit";
}

export function FeedbackEmbeddedCorrectionEditor({
  organizationId, employerId, group, footerTargetId, canEditEmployer, onSaved,
}: {
  organizationId: string;
  employerId: string;
  group: FeedbackResolutionGroup;
  footerTargetId: string;
  canEditEmployer: boolean;
  onSaved: () => void;
}) {
  const problem = group.problems[0];
  const tag = problem?.feedbackValues.missingFieldXmlTag ?? "";
  const fieldName = problem?.feedbackValues.missingFieldName;
  const fieldNumber = problem?.feedbackValues.missingFieldNumber;
  const employerField = employerContactFields[tag];
  const surface = problem ? embeddedCorrectionSurface(problem) : null;
  const employerMode = surface === "employer";
  const depositMode = surface === "deposit";

  const [employer, setEmployer] = useState<Employer | null>(null);
  const [workspace, setWorkspace] = useState<{ reportId: string; productId: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!employerMode) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    employersApi.employer(organizationId, employerId)
      .then(result => { if (!cancelled) setEmployer(result); })
      .catch(cause => { if (!cancelled) setError(errorMessage(cause, "טעינת פרטי מעסיק נכשלה")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [organizationId, employerId, employerMode, employerField]);

  useEffect(() => {
    if (!depositMode || !problem?.reportProductId || !group.canExecute) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setWorkspace(null);
    reportFeedbackApi.prepareInternalResolution(
      organizationId, employerId, problem.reportId, group.groupKey,
      group.resolverType, problem.reportProductId,
      group.problems.map(item => item.problemId),
    ).then(result => {
      if (!result.workspaceReportProductId)
        throw new Error("סביבת התיקון לא החזירה מוצר לעריכה.");
      if (!cancelled) setWorkspace({
        reportId: result.workspaceReportId,
        productId: result.workspaceReportProductId,
      });
    }).catch(cause => {
      if (!cancelled) setError(errorMessage(cause, "פתיחת סביבת התיקון נכשלה."));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // A selected group identifies one correction request. Do not recreate it on unrelated renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, employerId, group.groupKey, depositMode]);

  if (!problem || (!employerMode && !depositMode)) return null;

  return <section className="feedback-embedded-correction-editor" aria-label="תיקון מוטמע">
    <div className="notice notice-info" role="status">
      <strong>{fieldName ? `תיקון: ${fieldName}` : "תיקון הנתון הרלוונטי"}</strong>
      {fieldNumber ? <div>מספר שדה {fieldNumber} · <code dir="ltr">{tag}</code></div> : null}
      <p>מוצג טופס העריכה הקיים. הדיווח שנשלח נשמר ללא שינוי; התיקון ייכלל בתהליך הדיווח המתקן.</p>
    </div>
    {loading ? <LoadingState label="טוען סביבת תיקון..." /> : null}
    {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
    {employerMode && employer && !loading && !error ? <EmployerForm
      key={employer.id}
      organizationId={organizationId}
      employer={employer}
      focusField={employerField}
      editable={canEditEmployer}
      embedded
      showBackLink={false}
      onCreated={saved => { setEmployer(saved); onSaved(); }}
    /> : null}
    {depositMode && workspace && !loading && !error ? <div className="feedback-embedded-deposit-workspace"><ManualDepositData
      key={workspace.reportId + workspace.productId}
      organizationId={organizationId}
      employerId={employerId}
      reportId={workspace.reportId}
      embeddedEditor
      footerTargetId={footerTargetId}
      focusReportProductId={workspace.productId}
    /></div> : null}
  </section>;
}
