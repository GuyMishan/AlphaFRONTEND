"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "@/features/shell/components/app-shell";
import { AppLoader } from "@/components/loading/app-loader";
import { authApi } from "@/features/auth/api";
import { useAppStore } from "@/lib/session/use-app-store";
import { logout } from "@/lib/session/lifecycle";

const publicPaths = new Set(["/login", "/register", "/invite", "/session-timeout"]);
export function isPublicPath(pathname: string) { return publicPaths.has(pathname); }

export function PersistentAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const userId = useAppStore((state) => state.session?.userId);
  const publicRoute = isPublicPath(pathname);
  const [checked, setChecked] = useState<{ userId: string; allowed: boolean } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId || publicRoute) return;
    let cancelled = false;
    setError(false);
    authApi.refreshSession()
      .then((session) => {
        if (cancelled) return;
        if (session.legalConsentRequired) {
          // The consent dialog belongs to /login, before the authenticated shell.
          setChecked({ userId, allowed: false });
          router.replace("/login");
        } else {
          setChecked({ userId, allowed: true });
        }
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [userId, publicRoute, router]);

  if (publicRoute) return <>{children}</>;
  if (!userId) return <AppShell>{children}</AppShell>;
  if (error) return <main className="auth-page"><div className="auth-card">
    <p>לא ניתן לבדוק כעת את גרסת תנאי השימוש.</p>
    <button className="btn" onClick={() => void logout()}>התנתקות</button>
  </div></main>;
  if (checked?.userId !== userId || !checked.allowed) return <AppLoader />;
  return <AppShell>{children}</AppShell>;
}
