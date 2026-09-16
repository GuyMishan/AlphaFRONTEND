"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type NotificationType = "error" | "success" | "info";
const EVENT_NAME = "alpha:notify";

function emit(type: NotificationType, message: string) {
  if (typeof window === "undefined" || !message.trim()) return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { type, message: message.trim() } }));
}

export const notify = {
  error: (message: string) => emit("error", message),
  success: (message: string) => emit("success", message),
  info: (message: string) => emit("info", message),
};

export function NotificationCenter() {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type: NotificationType; message: string }>).detail;
      if (!detail?.message) return;
      if (detail.type === "error") toast.error(detail.message);
      else if (detail.type === "success") toast.success(detail.message);
      else toast.info(detail.message);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);
  return null;
}
