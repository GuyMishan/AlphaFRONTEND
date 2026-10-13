"use client";

import { Info } from "lucide-react";
import { cloneElement, isValidElement, useId, useState, type ReactElement, type ReactNode } from "react";

const INTERACTIVE = new Set(["a", "button", "input", "select", "textarea"]);

/**
 * Hover/focus tooltip. The bubble describes its trigger (aria-describedby) and Escape dismisses it
 * (WCAG 1.4.13). An interactive child (e.g. a button) stays the only tab stop; other triggers,
 * including the default info icon, become focusable themselves.
 */
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
  const bubbleId = useId();
  const [dismissed, setDismissed] = useState(false);
  const interactiveChild = isValidElement(children) && typeof children.type === "string" && INTERACTIVE.has(children.type);
  const describes = !(typeof content === "string" && content === label);
  const trigger = interactiveChild
    ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, { "aria-describedby": bubbleId })
    : children ?? <Info size={14} aria-hidden="true" />;

  return (
    <span className={["tooltip", children ? "" : "tooltip-icon", dismissed ? "is-dismissed" : "", className].filter(Boolean).join(" ")}
      tabIndex={interactiveChild ? undefined : 0}
      aria-label={interactiveChild ? undefined : label}
      aria-describedby={!interactiveChild && describes ? bubbleId : undefined}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || dismissed) return;
        // Close the tooltip first; a second Escape reaches the surrounding dialog.
        event.preventDefault();
        event.stopPropagation();
        setDismissed(true);
      }}
      onBlur={() => setDismissed(false)}
      onMouseLeave={() => setDismissed(false)}>
      <span className="tooltip-trigger">{trigger}</span>
      <span className="tooltip-bubble" role="tooltip" id={bubbleId}>{content}</span>
    </span>
  );
}
