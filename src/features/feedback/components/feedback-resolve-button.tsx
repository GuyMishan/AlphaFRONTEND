"use client";

import { Sparkles } from "lucide-react";

export function FeedbackResolveButton({
  count,
  label: explicitLabel,
  disabled = false,
  compact = false,
  onClick,
}: {
  count?: number;
  label?: string;
  disabled?: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  const label = explicitLabel ?? (count && count > 1 ? `פתור תקלות · ${count}` : "פתור בעיה");
  return <button
    type="button"
    className={["feedback-resolve-button", compact ? "compact" : ""].filter(Boolean).join(" ")}
    disabled={disabled}
    onClick={onClick}
    aria-label={disabled ? `${label} — תהליך הפתרון יוגדר בהמשך` : label}
    title={disabled ? "תהליך פתרון התקלות יחובר בשלב הבא" : label}
  >
    <Sparkles size={compact ? 14 : 16} aria-hidden="true" />
    <span>{label}</span>
  </button>;
}
