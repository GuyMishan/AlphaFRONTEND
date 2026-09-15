"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Building2, FileClock, FilePlus2, Gauge, LogOut, Menu, Settings, ShieldCheck, Users, X } from "lucide-react";
import { Brand } from "./brand";
import { ScopeController } from "./scope-controller";
import { resolveSingleEmployerScope } from "@/lib/access-scope";
import { clearSession, getSession } from "@/lib/session";
import type { Session } from "@/lib/types";

const nav = [
  { href: "/dashboard", label: "דף הבית", icon: Gauge },
  { href: "/reports/new", label: "דיווח חדש", icon: FilePlus2 },
  { href: "/reports", label: "דיווחים", icon: FileClock },
  { href: "/employees", label: "עובדים", icon: Users },
  { href: "/employers", label: "מעסיקים", icon: Building2 },
];

type ShellPageConfig = {
  title: string;
  hideScopeController: boolean;
};

type ShellContextValue = {
  setPageConfig: (config: ShellPageConfig) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function AppShell({ children, title = "מרכז התפעול", hideScopeController = false }: { children: React.ReactNode; title?: string; hideScopeController?: boolean }) {
  const parentShell = useContext(ShellContext);

  useEffect(() => {
    if (!parentShell) return;
    parentShell.setPageConfig({ title, hideScopeController });
  }, [parentShell, title, hideScopeController]);

  if (parentShell) return <>{children}</>;

  return <AppShellFrame initialConfig={{ title, hideScopeController }}>{children}</AppShellFrame>;
}

function AppShellFrame({ children, initialConfig }: { children: React.ReactNode; initialConfig: ShellPageConfig }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setLocalSession] = useState<Session | null>(null);
  const [singleEmployerUser, setSingleEmployerUser] = useState(false);
  const [scopeResolved, setScopeResolved] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pageConfig, setPageConfigState] = useState<ShellPageConfig>(initialConfig);

  const setPageConfig = useCallback((config: ShellPageConfig) => {
    setPageConfigState((current) => current.title === config.title && current.hideScopeController === config.hideScopeController ? current : config);
  }, []);
  const shellContext = useMemo(() => ({ setPageConfig }), [setPageConfig]);

  useEffect(() => {
    let active = true;
    const current = getSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setLocalSession(current);
    resolveSingleEmployerScope()
      .then((scope) => {
        if (!active) return;
        const isSingle = Boolean(scope);
        setSingleEmployerUser(isSingle);
        if (isSingle && (pathname.startsWith("/employers") || pathname.startsWith("/access"))) {
          router.replace("/dashboard");
        }
      })
      .catch(() => { if (active) setSingleEmployerUser(false); })
      .finally(() => { if (active) setScopeResolved(true); });
    return () => { active = false; };
  }, [pathname, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileMenuOpen]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  // On the first protected page load we still wait for authentication/scope resolution.
  // Once mounted in the shared layout, this frame remains mounted while route children change.
  if (!session || !scopeResolved) return null;

  const visibleNav = singleEmployerUser ? nav.filter((item) => item.href !== "/employers") : nav;
  const navigation = (
    <>
      <nav className="nav" aria-label="ניווט ראשי">
        {visibleNav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={pathname === href ? "active" : ""}><Icon size={18} />{label}</Link>
        ))}
        <div className="nav-divider" />
        {!singleEmployerUser ? <Link href="/access" className={pathname === "/access" ? "active" : ""}><ShieldCheck size={18} />הרשאות</Link> : null}
        <Link href="/settings" className={pathname === "/settings" ? "active" : ""}><Settings size={18} />הגדרות</Link>
      </nav>
      <div className="sidebar-bottom nav">
        <button className="btn" onClick={logout} style={{ justifyContent: "flex-start", color: "#c9d7e6", background: "transparent" }}><LogOut size={18} />יציאה</button>
      </div>
    </>
  );

  return (
    <ShellContext.Provider value={shellContext}>
      <div className="app-shell">
        <aside className="sidebar">
          <Brand />
          {navigation}
        </aside>

        {mobileMenuOpen ? <button className="mobile-sidebar-backdrop" aria-label="סגירת תפריט" onClick={() => setMobileMenuOpen(false)} /> : null}
        <aside className={`mobile-sidebar${mobileMenuOpen ? " open" : ""}`} aria-hidden={!mobileMenuOpen}>
          <div className="mobile-sidebar-head">
            <Brand />
            <button className="mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="סגירת תפריט"><X size={22} /></button>
          </div>
          {navigation}
        </aside>

        <div className="workspace">
          <header className="topbar">
            <div className="topbar-leading">
              <button className="mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="פתיחת תפריט"><Menu size={23} /></button>
              <div className="topbar-title"><b>{pageConfig.title}</b><span>מערכת תפעול פנסיוני</span></div>
            </div>
            <div className="user-chip"><div><b>{session.displayName}</b><div className="api-state"><span className={`dot${session.mode === "demo" ? "" : " online"}`} />{session.mode === "demo" ? "מצב הדגמה" : "חיבור API פעיל"}</div></div><span className="avatar">{session.displayName.slice(0, 1)}</span></div>
          </header>
          {pageConfig.hideScopeController ? null : <ScopeController singleEmployerUser={singleEmployerUser} />}
          <main className="main">{children}</main>
        </div>
      </div>
    </ShellContext.Provider>
  );
}
