"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { authApi, sessionFromAuthenticatedUser } from "@/features/auth/api";
import { listenForSessionChangesInOtherTabs } from "@/lib/session/lifecycle";
import { setSession } from "@/lib/session/storage";
import { useAppStore } from "@/lib/session/use-app-store";

const IDLE_MS = 30 * 60 * 1000;
const WARNING_MS = 2 * 60 * 1000;
// After a failed check that was not a 401 (rate limit, outage), wait before asking again:
// the timer ticks every second and /api/auth shares a per-IP rate limit on the backend.
const RETRY_AFTER_FAILURE_MS = 30 * 1000;
const EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

export function SessionTimeoutGuard() {
  const pathname = usePathname();
  const session = useAppStore((state) => state.session);
  const lastActivity = useRef(0);
  const validationInFlight = useRef(false);
  const nextValidationAt = useRef(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  const validateServerSession = useCallback(async () => {
    if (validationInFlight.current || !session || Date.now() < nextValidationAt.current) return;
    validationInFlight.current = true;
    try {
      const refreshed = await authApi.refreshSession();
      setSession(sessionFromAuthenticatedUser(refreshed));
      lastActivity.current = Date.now();
      setRemaining(null);
    } catch {
      // A 401 is handled globally by the API transport and redirects to /session-timeout.
      nextValidationAt.current = Date.now() + RETRY_AFTER_FAILURE_MS;
    } finally {
      validationInFlight.current = false;
    }
  }, [session]);

  useEffect(() => listenForSessionChangesInOtherTabs(), []);

  useEffect(() => {
    if (!session || pathname === "/login" || pathname === "/register" || pathname === "/session-timeout") return;

    lastActivity.current = Date.now();

    const activity = () => {
      lastActivity.current = Date.now();
      setRemaining(null);
    };
    const validateIfLocallyIdle = () => {
      if (Date.now() - lastActivity.current >= IDLE_MS) void validateServerSession();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") validateIfLocallyIdle();
    };
    const onFocus = validateIfLocallyIdle;

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
  }, [pathname, session, validateServerSession]);

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
