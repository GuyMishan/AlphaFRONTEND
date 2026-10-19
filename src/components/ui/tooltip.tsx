"use client";

import { Info } from "lucide-react";
import { cloneElement, isValidElement, useEffect, useId, useRef, useState, type ReactElement, type ReactNode, type MouseEvent, type FocusEvent } from "react";
import { createPortal } from "react-dom";

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
  portaled = false,
}: {
  content: ReactNode;
  children?: ReactNode;
  label?: string;
  className?: string;
  portaled?: boolean;
}) {
  const bubbleId = useId();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, below: false });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const interactiveChild = isValidElement(children) && typeof children.type === "string" && INTERACTIVE.has(children.type);
  const describes = !(typeof content === "string" && content === label);
  const trigger = interactiveChild
    ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, { "aria-describedby": bubbleId })
    : children ?? <Info size={14} aria-hidden="true" />;

  useEffect(() => {
    if (!portaled || !visible) return;
    function reposition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const height = bubbleRef.current?.offsetHeight ?? 100;
      setPosition({
        x: Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2)),
        y: rect.top < height + 16 && window.innerHeight - rect.bottom > height + 16 ? rect.bottom : rect.top,
        below: rect.top < height + 16 && window.innerHeight - rect.bottom > height + 16,
      });
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [portaled, visible, content]);

  return (
    <span ref={triggerRef} className={["tooltip", children ? "" : "tooltip-icon", dismissed ? "is-dismissed" : "", className].filter(Boolean).join(" ")}
      tabIndex={interactiveChild ? undefined : 0}
      aria-label={interactiveChild ? undefined : label}
      aria-describedby={!interactiveChild && describes ? bubbleId : undefined}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || dismissed) return;
        // Close the tooltip first; a second Escape reaches the surrounding dialog.
        event.preventDefault();
        event.stopPropagation();
        setDismissed(true);
        setVisible(false);
      }}
      onMouseEnter={() => { if (portaled) { setDismissed(false); setVisible(true); } }}
      onFocus={() => { if (portaled) { setDismissed(false); setVisible(true); } }}
      onBlur={() => { setDismissed(false); setVisible(false); }}
      onMouseLeave={() => { setDismissed(false); setVisible(false); }}>
      <span className="tooltip-trigger">{trigger}</span>
      {portaled ? (visible && !dismissed && typeof document !== "undefined" ? createPortal(
        <span ref={bubbleRef} className="tooltip-bubble tooltip-portal-bubble" role="tooltip" id={bubbleId}
          data-side={position.below ? "bottom" : "top"}
          style={{ left: position.x, top: position.y }}>{content}</span>, document.body,
      ) : null) : <span className="tooltip-bubble" role="tooltip" id={bubbleId}>{content}</span>}
    </span>
  );
}

/** Delegated, viewport-positioned tooltip for text clipped inside DataTable cells.
 * Uses the same tooltip-bubble design tokens as Tooltip, without native title delays.
 */
export function useTableOverflowTooltip() {
  const [active, setActive] = useState<{ text: string; x: number; y: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const show = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("button, input, select, textarea, [role='button'], .tooltip")) {
      setActive(null);
      return;
    }
    const cell = target.closest("td");
    if (!cell?.closest(".data-table-row")) { setActive(null); return; }
    let clipped: HTMLElement | null = null;
    for (let node: HTMLElement | null = target; node && cell.contains(node); node = node.parentElement) {
      if (node.hasAttribute("title") && !node.dataset.tableOverflowTitle) break;
      const style = getComputedStyle(node);
      const isClipped = (node.scrollWidth > node.clientWidth + 1 && style.overflowX !== "visible")
        || (node.scrollHeight > node.clientHeight + 1 && style.overflowY !== "visible");
      if (isClipped && node.clientWidth && node.textContent?.trim()) { clipped = node; break; }
      if (node === cell) break;
    }
    if (!clipped) { setActive(null); return; }
    const text = clipped.textContent?.trim() ?? "";
    const rect = clipped.getBoundingClientRect();
    // Anchor to the visible text rather than the full-height table cell.
    const range = document.createRange();
    range.selectNodeContents(clipped);
    const textRect = Array.from(range.getClientRects()).find((part) => part.width > 0 && part.height > 0);
    range.detach();
    const anchor = textRect && textRect.top >= rect.top - 1 && textRect.top <= rect.bottom
      ? textRect : rect;
    // Remove tooltip titles created by the old implementation, to avoid duplicate native bubbles.
    if (clipped.dataset.tableOverflowTitle === "true") {
      clipped.removeAttribute("title");
      delete clipped.dataset.tableOverflowTitle;
    }
    setActive({ text, x: Math.min(window.innerWidth - 16, Math.max(16, anchor.left + anchor.width / 2)), y: anchor.top });
    setDismissed(false);
  };

  return {
    onMouseOver: (event: MouseEvent<HTMLTableElement>) => show(event.target),
    onMouseLeave: () => { setActive(null); setDismissed(false); },
    onFocusCapture: (event: FocusEvent<HTMLTableElement>) => show(event.target),
    onBlurCapture: () => setActive(null),
    onKeyDownCapture: (event: React.KeyboardEvent<HTMLTableElement>) => {
      if (event.key === "Escape" && active) {
        event.stopPropagation();
        setDismissed(true);
      }
    },
    tooltip: active && !dismissed && typeof document !== "undefined"
      ? createPortal(
        <span className="tooltip-bubble table-overflow-tooltip" role="tooltip"
          style={{ left: active.x, top: active.y }}>{active.text}</span>,
        document.body,
      ) : null,
  };
}
