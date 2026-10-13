import type { ReactNode } from "react";
import { AlphaSymbol } from "@/components/brand/alpha-logo";

/**
 * Inline loading message for a section, card or dialog body whose shape is not worth a
 * skeleton. `compact` puts the mark and label on one line (load-more rows, small panels).
 */
export function LoadingState({ label = "טוען...", compact = false, className }: { label?: ReactNode; compact?: boolean; className?: string }) {
  return <div role="status" aria-live="polite"
    className={["loading-state", compact ? "loading-state-compact" : "", className].filter(Boolean).join(" ")}>
    <AlphaSymbol animated className="loading-state-symbol" />
    <span>{label}</span>
  </div>;
}

/** Small circular spinner for buttons and inline actions; inherits the text color. */
export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden="true" className={["spinner", className].filter(Boolean).join(" ")} />;
}
