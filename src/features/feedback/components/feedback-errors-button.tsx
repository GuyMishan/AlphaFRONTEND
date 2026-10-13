"use client";

import { AlertTriangle } from "lucide-react";

export function FeedbackErrorsButton({
  count,
  label,
  compact = false,
  onClick,
}: {
  count?: number;
  label?: string;
  compact?: boolean;
  onClick: () => void;
}) {
  const text = label ?? (count && count > 0 ? `שגיאות · ${count}` : "שגיאות");
  return <button
    type="button"
    className={["feedback-errors-button", compact ? "compact" : ""].filter(Boolean).join(" ")}
    onClick={onClick}
    aria-label={text}
  >
    <AlertTriangle size={compact ? 14 : 17} aria-hidden="true" />
    <span>{text}</span>
  </button>;
}
