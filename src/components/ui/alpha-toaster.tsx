"use client";

import type { CSSProperties } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { Toaster } from "sonner";
import { AlphaSymbol } from "@/components/brand/alpha-logo";

/** Thin status glyphs; the color carries the tone, the shape keeps it readable without color. */
const icons = {
  success: <CircleCheck size={18} strokeWidth={2.25} aria-hidden="true" />,
  error: <CircleAlert size={18} strokeWidth={2.25} aria-hidden="true" />,
  warning: <TriangleAlert size={18} strokeWidth={2.25} aria-hidden="true" />,
  info: <Info size={18} strokeWidth={2.25} aria-hidden="true" />,
  // The Alpha mark appears only where it means something: work in progress.
  loading: <AlphaSymbol animated className="alpha-toast-loading" />,
  close: <X size={14} strokeWidth={2.5} aria-hidden="true" />,
};

/** One themed Sonner host. Sonner keeps its live region, keyboard shortcut, swipe and pause-on-hover. */
export function AlphaToaster() {
  return <Toaster
    className="alpha-toaster"
    position="top-center"
    closeButton
    dir="rtl"
    duration={4500}
    gap={10}
    // Upper bound for long messages; on desktop the capsule hugs shorter ones (notifications.css).
    style={{ "--width": "420px" } as CSSProperties}
    offset={{ top: "calc(var(--topbar-height) + var(--space-5))" }}
    mobileOffset={{ top: "calc(var(--topbar-height) + var(--space-3))", left: 12, right: 12 }}
    icons={icons}
    containerAriaLabel="התראות מערכת"
    toastOptions={{ closeButtonAriaLabel: "סגירת ההתראה" }}
  />;
}
