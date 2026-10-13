"use client";

import { useEffect, useState } from "react";
import { employersApi } from "@/features/employers/api";
import type { Employer } from "@/features/employers/types";
import { EmployerForm } from "@/features/employers/components/employer-form";
import type { FeedbackResolutionProblem } from "@/features/feedback/api";
import { LoadingState } from "@/components/loading/loading-state";

// Only fields actually stored by EmployerForm are editable here.
// Clearinghouse sender/recipient identifiers must be edited in integration
// configuration, not falsely represented as ordinary employer properties.
const contactFieldKeys: Record<string, string> = {
  "SHEM-PRATI-PONE-LEMISLAKA": "contactFirstName",
  "SHEM-MISHPACHA-PONE-LEMISLAKA": "contactLastName",
  "MISPAR-TELEPHONE-KAVI-PONE-LEMISLAKA": "contactPhone",
  "E-MAIL-PONE-LEMISLAKA": "contactEmail",
  "MISPAR-CELLULARI": "contactMobile",
};

export function FeedbackCode18EmployerEditor({
  organizationId, employerId, problem, canEdit, onSaved,
}: {
  organizationId: string;
  employerId: string;
  problem: FeedbackResolutionProblem;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const xmlTag = problem.feedbackValues.missingFieldXmlTag ?? "";
  const fieldKey = contactFieldKeys[xmlTag];
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [loading, setLoading] = useState(Boolean(fieldKey));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fieldKey) return;
    let active = true;
    setLoading(true);
    setError("");
    employersApi.employer(organizationId, employerId)
      .then(result => { if (active) setEmployer(result); })
      .catch(cause => {
        if (active) setError(cause instanceof Error ? cause.message : "טעינת פרטי מעסיק נכשלה");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId, employerId, fieldKey]);

  if (!fieldKey) return <div className="notice notice-info">
    <strong>השדה אינו חלק מטופס המעסיק.</strong>
    <p>מזהי שולח ונמען והגדרות ממשק אינם שדות של פרופיל המעסיק. יש לטפל בהם בהגדרות האינטגרציה; שינוי פרטי איש קשר לא יפתור את התקלה.</p>
  </div>;

  return <section aria-label="עריכת איש קשר למעסיק" className="feedback-code18-embedded-editor">
    <div className="notice notice-info" role="status">
      <strong>שדה לתיקון: {problem.feedbackValues.missingFieldName}</strong>
      <div>מספר {problem.feedbackValues.missingFieldNumber} · <code dir="ltr">{xmlTag}</code></div>
    </div>
    {loading ? <LoadingState label="טוען טופס עריכה..." /> : null}
    {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
    {employer && !loading && !error ? <EmployerForm
      key={employer.id}
      organizationId={organizationId}
      employer={employer}
      focusField={fieldKey as keyof import("@/features/employers/types").EmployerInput}
      editable={canEdit}
      embedded
      showBackLink={false}
      onCreated={saved => {
        setEmployer(saved);
        onSaved();
      }}
    /> : null}
  </section>;
}
