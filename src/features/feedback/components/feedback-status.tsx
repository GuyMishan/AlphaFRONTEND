"use client";

import { AlertTriangle, CheckCircle2, Clock3, FileClock } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { type ReportFeedbackRow } from "@/features/feedback/api";

export function FeedbackWaitingTooltip({ row }: { row: ReportFeedbackRow }) {
  const waiting = row.awaitingFeedback;
  if (!waiting || waiting.totalDestinations < 1) return null;
  return <Tooltip
    label="פירוט הכספות שממתינים למשוב מהן"
    content={<span className="report-feedback-waiting-info">
      <span>ממתינים למשוב מ־{waiting.manufacturerCount} יצרנים</span>
      {waiting.manufacturers.length > 0
        ? <span>{waiting.manufacturers.join("، ")}</span> : null}
      <span>{waiting.clearinghouse
        ? "ממתינים גם למשוב מהמסלקה"
        : "לא ממתינים למשוב מהמסלקה"}</span>
    </span>}
  />;
}
export function feedbackLabel(status: ReportFeedbackRow["feedbackStatus"]) {
  switch (status) {
    case "completed": return "הושלם";
    case "attention": return "דורש טיפול";
    case "partial": return "משוב חלקי";
    case "pending": return "ממתין למשוב";
    default: return "לא נשלח";
  }
}
export function StatusBadge({ status }: { status: ReportFeedbackRow["feedbackStatus"] }) {
  const icon = status === "completed"
    ? <CheckCircle2 size={15} />
    : status === "attention"
      ? <AlertTriangle size={15} />
      : status === "partial" || status === "pending"
        ? <Clock3 size={15} />
        : <FileClock size={15} />;
  return <span className={`report-feedback-badge ${status}`}>{icon}{feedbackLabel(status)}</span>;
}
export function DepositStatusBadge({ value, label }: { value: string; label: string }) {
  return <span className={`feedback-state ${value}`}>{label}</span>;
}
