"use client";

import { type ReportFeedbackDepositRow } from "@/features/feedback/api";

export function feedbackErrorScopeLabel(scope: keyof ReportFeedbackDepositRow["feedbackErrorSummary"]) {
  switch (scope) {
    case "deposit": return "ברמת הפקדה / מוצר";
    case "employee": return "ברמת עובד";
    case "money": return "ברמת מעסיק";
    case "report": return "ברמת דיווח";
    case "contribution": return "ברמת רכיב הפרשה";
  }
}
export function feedbackErrorSummaryRows(deposit: ReportFeedbackDepositRow) {
  const order: Array<keyof ReportFeedbackDepositRow["feedbackErrorSummary"]> = [
    "employee", "deposit", "contribution",
  ];
  return order
    .map((scope) => ({ scope, count: deposit.feedbackErrorSummary?.[scope] ?? 0 }))
    .filter((item) => item.count > 0);
}
export function depositOwnedErrorCount(deposit: ReportFeedbackDepositRow) {
  return (deposit.feedbackErrorSummary?.employee ?? 0)
    + (deposit.feedbackErrorSummary?.deposit ?? 0)
    + (deposit.feedbackErrorSummary?.contribution ?? 0);
}
