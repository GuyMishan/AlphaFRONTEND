"use client";

type Details = { errorAmount?: number | string | null; errorDate?: string | null };
export function FeedbackErrorDetails({ details }: { details: Details }) {
  const amount = details.errorAmount;
  const date = details.errorDate;
  if ((amount === null || amount === undefined || amount === "") && !date) return null;
  return <div className="feedback-error-detail-fields">
    {amount !== null && amount !== undefined && amount !== "" ? <small>פירוט שגיאה (סכום): <b dir="ltr">{String(amount)}</b></small> : null}
    {date ? <small>פירוט שגיאה (תאריך): <b dir="ltr">{date}</b></small> : null}
  </div>;
}
