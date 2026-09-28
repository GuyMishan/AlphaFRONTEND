"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";

const IDLE_MS = 30 * 60 * 1000;
const WARNING_MS = 2 * 60 * 1000;
const EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

export function SessionTimeoutGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const lastActivity = useRef(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!getSession() || pathname === "/login" || pathname === "/register" || pathname === "/session-timeout") return;
    lastActivity.current = Date.now();
    const activity = () => { lastActivity.current = Date.now(); setRemaining(null); };
    EVENTS.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    const timer = window.setInterval(() => {
      const left = IDLE_MS - (Date.now() - lastActivity.current);
      if (left <= 0) {
        clearSession();
        void fetch("/api/session/logout", { method: "POST", credentials: "same-origin" }).finally(() => router.replace("/session-timeout"));
        return;
      }
      setRemaining(left <= WARNING_MS ? left : null);
    }, 1000);
    return () => { window.clearInterval(timer); EVENTS.forEach((event) => window.removeEventListener(event, activity)); };
  }, [pathname, router]);

  if (remaining === null) return null;
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  return <div className="session-timeout-warning" role="alertdialog" aria-live="assertive"><strong>החיבור עומד לפוג</strong><span>לא זוהתה פעילות. החיבור ינותק בעוד {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}.</span><button className="btn btn-primary" onClick={() => { lastActivity.current = Date.now(); setRemaining(null); }}>המשך עבודה</button></div>;
}
