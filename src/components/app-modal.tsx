"use client";

import { Children, Fragment, isValidElement, useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * All application dialogs use one shell. Header and actions are fixed flex rows;
 * the body is the only scrolling region. Nested dialogs keep background scroll
 * locked until the final dialog closes.
 */
let openModalCount = 0;
let initialBodyOverflow = "";

/** Footer action placement is semantic and independent of the caller's JSX order. */
function groupModalActions(actions: ReactNode) {
  const cancel: ReactNode[] = [];
  const positive: ReactNode[] = [];
  function visit(node: ReactNode) {
    Children.forEach(node, child => {
      if (child == null || typeof child === "boolean") return;
      if (isValidElement(child) && child.type === Fragment) {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }
      if (isValidElement(child)) {
        const props = child.props as { className?: string; "data-modal-side"?: string };
        const klass = props.className ?? "";
        if (props["data-modal-side"] === "positive" ||
          (props["data-modal-side"] !== "cancel" && klass.includes("btn-primary"))) positive.push(child);
        else cancel.push(child);
      } else cancel.push(child);
    });
  }
  visit(actions);
  return { cancel, positive };
}

export function AppModal({
  open = true, title, subtitle, children, actions, onClose, width = "md",
  closeOnBackdrop = true, closeDisabled = false, ariaLabel, className, bodyClassName,
}: {
  open?: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
  width?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
  closeDisabled?: boolean;
  ariaLabel?: string;
  className?: string;
  bodyClassName?: string;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    if (openModalCount++ === 0) {
      initialBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) document.body.style.overflow = initialBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !onClose || closeDisabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // A portalled select can handle Escape itself; only the top dialog closes.
      const dialogs = document.querySelectorAll<HTMLElement>(".app-modal[role='dialog']");
      const last = dialogs.item(dialogs.length - 1);
      if (last?.getAttribute("aria-labelledby") !== titleId) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, closeDisabled, titleId]);

  if (!open) return null;
  const groups = groupModalActions(actions);
  return <div className="app-modal-backdrop" role="presentation" onMouseDown={event => {
    if (closeOnBackdrop && !closeDisabled && event.target === event.currentTarget) onClose?.();
  }}>
    <section className={["app-modal", `app-modal-${width}`, className ?? ""].filter(Boolean).join(" ")}
      role="dialog" aria-modal="true" aria-labelledby={titleId}
      aria-label={ariaLabel}>
      <header className="app-modal-header">
        <div className="app-modal-heading">
          <h2 id={titleId}>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {onClose ? <button type="button" className="app-modal-close"
          onClick={onClose} disabled={closeDisabled} aria-label="סגירה"><X size={20} /></button> : null}
      </header>
      <div className={["app-modal-body", bodyClassName ?? ""].filter(Boolean).join(" ")}>
        {children}
      </div>
      {actions ? <footer className="app-modal-actions">
        {groups.cancel.length ? <div className="app-modal-actions-cancel">{groups.cancel}</div> : null}
        {groups.positive.length ? <div className="app-modal-actions-positive">{groups.positive}</div> : null}
      </footer> : null}
    </section>
  </div>;
}
