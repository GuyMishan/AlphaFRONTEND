"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function Tooltip({
  content,
  children,
  label = "מידע נוסף",
  className,
}: {
  content: ReactNode;
  children?: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <span className={["tooltip", children ? "" : "tooltip-icon", className].filter(Boolean).join(" ")} tabIndex={0} aria-label={label}>
      <span className="tooltip-trigger">{children ?? <Info size={14} aria-hidden="true" />}</span>
      <span className="tooltip-bubble" role="tooltip">{content}</span>
    </span>
  );
}
