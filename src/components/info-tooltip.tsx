"use client";

import { Info } from "lucide-react";

export function InfoTooltip({ text, label = "מידע נוסף" }: { text: string; label?: string }) {
  return (
    <span className="info-tooltip" tabIndex={0} aria-label={label}>
      <Info size={14} aria-hidden="true" />
      <span className="info-tooltip-bubble" role="tooltip">{text}</span>
    </span>
  );
}
