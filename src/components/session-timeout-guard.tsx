"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { alphaApi } from "@/lib/api";
import { getSession } from "@/lib/session";

const IDLE_MS = 30 * 60 * 1000;
const WARNING_MS = 2 * 60 * 1000;
const EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

export function SessionTimeoutGuard() {
  const pathname = usePathname();
  const lastActivity = useRef(0);
  const validationInFlight = useRef(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const validateServerSession = useCallback(async () => {
    if (validationInFlight.current || !getSession()) return;
    validationInFlight.current = true;
    try {
      await alphaApi.refreshSession();
      lastActivity.current = Date.now();
      setRemaining(null);
    } catch {
      // A 401 is handled globally by backendFetch and redirects to /session-timeout.
    } finally {
      validationInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!getSession() || pathname === "/login" || pathname === "/register" || pathname === "/session-timeout") return;

    lastActivity.current = Date.now();

    const activity = () => {
      lastActivity.current = Date.now();
      setRemaining(null);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void validateServerSession();
    };
    const onFocus = () => void validateServerSession();

    EVENTS.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    const timer = window.setInterval(() => {
      const left = IDLE_MS - (Date.now() - lastActivity.current);
      if (left <= 0) {
        setRemaining(0);
        void validateServerSession();
        return;
      }
      setRemaining(left <= WARNING_MS ? left : null);
    }, 1000);

    return () => {
      window.clearInterval(timer);
      EVENTS.forEach((event) => window.removeEventListener(event, activity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname, validateServerSession]);

  if (remaining === null) return null;
  const seconds = Math.max(0, Math.ceil(remaining / 1000));

  return <div className="session-timeout-warning" role="alertdialog" aria-live="assertive">
    <strong>{remaining <= 0 ? "בודק את תוקף החיבור" : "החיבור עומד לפוג"}</strong>
    <span>{remaining <= 0
      ? "לא זוהתה פעילות. המערכת מאמתת את החיבור מול השרת."
      : <>לא זוהתה פעילות. החיבור ייבדק בעוד {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}.</>}</span>
    <button className="btn btn-primary" onClick={() => {
      lastActivity.current = Date.now();
      setRemaining(null);
      void validateServerSession();
    }}>המשך עבודה</button>
  </div>;
}
