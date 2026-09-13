"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, FileClock, FilePlus2, Gauge, LogOut, Settings, ShieldCheck, Users } from "lucide-react";
import { Brand } from "./brand";
import { ScopeController } from "./scope-controller";
import { clearSession, getSession } from "@/lib/session";
import type { Session } from "@/lib/types";

const nav = [
  { href: "/dashboard", label: "דף הבית", icon: Gauge },
  { href: "/reports/new", label: "דיווח חדש", icon: FilePlus2 },
  { href: "/reports", label: "דיווחים", icon: FileClock },
  { href: "/employees", label: "עובדים", icon: Users },
  { href: "/employers", label: "מעסיקים", icon: Building2 },
];

export function AppShell({ children, title = "מרכז התפעול", hideScopeController = false }: { children: React.ReactNode; title?: string; hideScopeController?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setLocalSession] = useState<Session | null>(null);

  useEffect(() => {
    const active = getSession();
    if (!active) router.replace("/login");
    else setLocalSession(active);
  }, [router]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!session) return null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav className="nav" aria-label="ניווט ראשי">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={pathname === href ? "active" : ""}><Icon size={18} />{label}</Link>
          ))}
          <div className="nav-divider" />
          <Link href="/access"><ShieldCheck size={18} />הרשאות</Link>
          <Link href="/settings"><Settings size={18} />הגדרות</Link>
        </nav>
        <div className="sidebar-bottom nav">
          <button className="btn" onClick={logout} style={{ justifyContent: "flex-start", color: "#c9d7e6", background: "transparent" }}><LogOut size={18} />יציאה</button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title"><b>{title}</b><span>מערכת תפעול פנסיוני</span></div>
          <div className="user-chip"><div><b>{session.displayName}</b><div className="api-state"><span className={`dot${session.mode === "demo" ? "" : " online"}`} />{session.mode === "demo" ? "מצב הדגמה" : "חיבור API פעיל"}</div></div><span className="avatar">{session.displayName.slice(0, 1)}</span></div>
        </header>
        {hideScopeController ? null : <ScopeController />}
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
