"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical } from "lucide-react";
import { useFloatingMenu } from "@/components/ui/floating-menu";

export type UiActionMenuItem = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  separatorBefore?: boolean;
  onSelect: () => void;
};

export function UiActionMenu({
  items,
  ariaLabel = "פעולות נוספות",
}: {
  items: UiActionMenuItem[];
  ariaLabel?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const { mounted, placement } = useFloatingMenu({
    open, setOpen, anchorRef: triggerRef, menuRef,
    desiredHeight: Math.max(48, items.length * 48 + 14), desiredWidth: 260,
  });

  // Focus lands on the first item once the panel is positioned and visible (the panel is portaled,
  // so Tab cannot reach it). Only once per opening: repositioning on scroll must not move focus.
  const focusedOnOpen = useRef(false);
  useEffect(() => {
    if (!open) { focusedOnOpen.current = false; return; }
    if (focusedOnOpen.current || placement.visibility !== "visible") return;
    focusedOnOpen.current = true;
    menuItems()[0]?.focus();
  }, [open, placement]);

  function menuItems() {
    return Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
  }

  function select(item: UiActionMenuItem) {
    if (item.disabled) return;
    setOpen(false);
    triggerRef.current?.focus();
    item.onSelect();
  }

  function menuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const enabled = menuItems();
    const index = enabled.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (next: number) => { event.preventDefault(); enabled[(next + enabled.length) % enabled.length]?.focus(); };
    if (event.key === "ArrowDown") focusAt(index + 1);
    else if (event.key === "ArrowUp") focusAt(index - 1);
    else if (event.key === "Home") focusAt(0);
    else if (event.key === "End") focusAt(enabled.length - 1);
    else if (event.key === "Tab") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return <span className="ui-action-menu">
    <button
      ref={triggerRef}
      type="button"
      className="ui-action-menu-trigger"
      aria-label={ariaLabel}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onClick={(event) => {
        event.stopPropagation();
        setOpen((current) => !current);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        setOpen(true);
      }}
    >
      <EllipsisVertical size={18} />
    </button>
    {open && mounted ? createPortal(
      <div ref={menuRef} id={menuId} className="ui-action-menu-panel" role="menu" aria-label={ariaLabel} style={placement} onKeyDown={menuKeyDown}
        onClick={event => event.stopPropagation()}>
        {items.map((item) => <div key={item.key} className={item.separatorBefore ? "ui-action-menu-group-start" : undefined}>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={item.disabled}
            onClick={() => select(item)}
          >
            {item.icon ? <span className="ui-action-menu-icon" aria-hidden="true">{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        </div>)}
      </div>,
      document.body,
    ) : null}
  </span>;
}

