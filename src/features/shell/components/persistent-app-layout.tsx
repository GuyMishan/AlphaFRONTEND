"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/features/shell/components/app-shell";
import { AppLoader } from "@/components/loading/app-loader";
import { LegalConsentModal } from "@/features/auth/components/legal-consent-modal";
import { authApi, type LegalDocument } from "@/features/auth/api";
import { useAppStore } from "@/lib/session/use-app-store";
import { logout } from "@/lib/session/lifecycle";
import { toast } from "sonner";

const publicPaths = new Set(["/login", "/register", "/invite", "/session-timeout", "/legal"]);
export function isPublicPath(pathname: string) { return publicPaths.has(pathname); }

export function PersistentAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const userId = useAppStore((state) => state.session?.userId);
  const [status, setStatus] = useState<"checking" | "accepted" | "required" | "error">("checking");
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || isPublicPath(pathname)) return;
    let cancelled = false;
    Promise.all([authApi.refreshSession(), authApi.activeLegalDocument()])
      .then(([session, active]) => {
        if (cancelled) return;
        setDocument(active);
        setStatus(session.legalConsentRequired ? "required" : "accepted");
      }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [userId, pathname]);

  if (isPublicPath(pathname)) return <>{children}</>;
  if (!userId) return <AppShell>{children}</AppShell>;
  if (status === "checking") return <AppLoader />;
  if (status === "error") return <main className="auth-page"><div className="auth-card">
    <p>לא ניתן לבדוק כעת את גרסת תנאי השימוש.</p>
    <button className="btn" onClick={() => void logout()}>התנתקות</button>
  </div></main>;
  if (status === "required") return <>
    <AppLoader />
    <LegalConsentModal open required document={document} saving={saving}
      onClose={() => void logout()}
      onAccept={async (version) => {
        setSaving(true);
        try { await authApi.acceptLegal(version); setStatus("accepted"); }
        catch { toast.error("שמירת האישור נכשלה. נסו שוב."); }
        finally { setSaving(false); }
      }} />
  </>;
  return <AppShell>{children}</AppShell>;
}
