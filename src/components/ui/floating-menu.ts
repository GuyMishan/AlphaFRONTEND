"use client";

import { useEffect, useState, type CSSProperties, type Dispatch, type RefObject, type SetStateAction } from "react";

type AnchorRect = Pick<DOMRect, "top" | "bottom" | "left" | "right" | "width">;

/** Keep every portaled menu inside the viewport, including long menus on phones. */
export function floatingMenuPlacement(rect: AnchorRect, viewport: { width: number; height: number }, desiredHeight: number, desiredWidth = rect.width) {
  const gutter = 8;
  const gap = 6;
  const width = Math.min(desiredWidth, Math.max(0, viewport.width - gutter * 2));
  const below = Math.max(0, viewport.height - rect.bottom - gap - gutter);
  const above = Math.max(0, rect.top - gap - gutter);
  const openAbove = below < Math.min(desiredHeight, 170) && above > below;
  const maxHeight = Math.min(desiredHeight, openAbove ? above : below, Math.max(0, viewport.height - gutter * 2));
  const top = Math.min(
    Math.max(gutter, openAbove ? rect.top - maxHeight - gap : rect.bottom + gap),
    Math.max(gutter, viewport.height - maxHeight - gutter),
  );
  const left = Math.min(Math.max(gutter, rect.right - width), Math.max(gutter, viewport.width - width - gutter));
  return { position: "fixed" as const, visibility: "visible" as const, top, left, width, maxHeight };
}

/** A stale index (after async options change) is treated like no current selection. */
export function nextEnabledOption(options: readonly { disabled?: boolean }[], active: number, direction: number) {
  const enabled = options.flatMap((option, index) => option.disabled ? [] : [index]);
  if (!enabled.length) return -1;
  const current = enabled.indexOf(active);
  return enabled[current < 0 ? (direction > 0 ? 0 : enabled.length - 1)
    : (current + direction + enabled.length) % enabled.length];
}

export function useFloatingMenu({ open, setOpen, anchorRef, menuRef, containerRef, desiredHeight, desiredWidth }: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  anchorRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLElement | null>;
  containerRef?: RefObject<HTMLElement | null>;
  desiredHeight: number;
  desiredWidth?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [placement, setPlacement] = useState<CSSProperties>({ visibility: "hidden" });
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open || !mounted) return;
    const position = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      setPlacement(floatingMenuPlacement(anchor.getBoundingClientRect(), {
        width: window.innerWidth, height: window.innerHeight,
      }, desiredHeight, desiredWidth));
    };
    const outside = (event: Event) => {
      if (!(event.target instanceof Node)) return;
      if (!(containerRef?.current ?? anchorRef.current)?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
      anchorRef.current?.focus();
    };
    position();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape, true);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, mounted, setOpen, anchorRef, menuRef, containerRef, desiredHeight, desiredWidth]);
  return { mounted, placement };
}
