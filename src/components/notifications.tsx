"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

type NotificationType = "error" | "success" | "info";
type NotificationItem = { id: string; type: NotificationType; message: string };
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
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type: NotificationType; message: string }>).detail;
      if (!detail?.message) return;
      const id = crypto.randomUUID();
      setItems((current) => [...current.slice(-3), { id, type: detail.type || "info", message: detail.message }]);
      window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 5200);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  if (!items.length) return null;
  return <div className="notification-stack" aria-live="polite" aria-atomic="false">{items.map((item) => {
    const Icon = item.type === "error" ? CircleAlert : item.type === "success" ? CheckCircle2 : Info;
    return <div key={item.id} className={`notification-toast notification-${item.type}`} role={item.type === "error" ? "alert" : "status"}>
      <Icon size={19} />
      <span>{item.message}</span>
      <button type="button" aria-label="סגירת התראה" onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))}><X size={16} /></button>
    </div>;
  })}</div>;
}
