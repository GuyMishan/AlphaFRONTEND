"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Building2, DatabaseZap, FileClock, FilePlus2, Gauge, Landmark, LogOut, Menu, Settings, ShieldCheck, Users, X } from "lucide-react";
import { Brand } from "./brand";
import { ScopeController } from "./scope-controller";
import { UpgradeModal } from "./upgrade-modal";
import { EmployerForm } from "./employer-form";
import { alphaApi } from "@/lib/api";
import { clearSession, getSession, setEmployerSelection, setOrganizationSelection } from "@/lib/session";
import type { Employer, EmployerInput, Session } from "@/lib/types";
import { UPGRADE_DIALOG_EVENT, type UpgradeDialogDetail } from "@/lib/upgrade";

const nav = [
  { href: "/dashboard", label: "דף הבית", icon: Gauge },
  { href: "/reports/new", label: "דיווח חדש", icon: FilePlus2 },
  { href: "/reports", label: "דיווחים ומשובים", icon: FileClock },
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
  const [singleEmployerUser, setSingleEmployerUser] = useState<boolean | null>(null);
  const [singleEmployerTarget, setSingleEmployerTarget] = useState<{ organizationId: string; employerId: string } | null>(null);
  const [canManageOrganization, setCanManageOrganization] = useState<boolean | null>(null);
  const [hasOrganizationScope, setHasOrganizationScope] = useState<boolean | null>(null);
  const [singleOrganizationTarget, setSingleOrganizationTarget] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pageConfig, setPageConfigState] = useState<ShellPageConfig>(initialConfig);
  const [upgradeDetail, setUpgradeDetail] = useState<UpgradeDialogDetail | null>(null);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");

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
    Promise.all([
      alphaApi.onboardingStatus(),
      alphaApi.scope(),
    ])
      .then(([onboarding, scope]) => {
        if (!active) return;
        if (onboarding.needsOnboarding) {
          setSingleEmployerUser(false);
          setSingleEmployerTarget(null);
          setCanManageOrganization(false);
          setHasOrganizationScope(false);
          setOnboardingRequired(true);
          return;
        }
        setOnboardingRequired(false);
        const accessibleEmployers = scope.organizations.flatMap((organization) =>
          organization.employers.map((employer) => ({ organizationId: organization.id, employerId: employer.id }))
        );
        setSingleEmployerUser(accessibleEmployers.length === 1);
        setSingleEmployerTarget(accessibleEmployers.length === 1 ? accessibleEmployers[0] : null);
        setSingleOrganizationTarget(!current.platformAdmin && scope.organizations.length === 1 ? scope.organizations[0].id : null);
        setCanManageOrganization(current.platformAdmin || scope.organizations.some((item) => item.canManageOrganization));
        setHasOrganizationScope(current.platformAdmin || scope.organizations.some((item) => item.hasOrganizationScope));
      })
      .catch(() => {
        if (!active) return;
        setSingleEmployerUser(false);
        setSingleEmployerTarget(null);
        setSingleOrganizationTarget(null);
        setCanManageOrganization(false);
        setHasOrganizationScope(false);
      });

    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!session || singleEmployerUser === null || canManageOrganization === null || hasOrganizationScope === null) return;
    if (pathname.startsWith("/admin") && !session.platformAdmin) {
      router.replace("/dashboard");
      return;
    }
    if (pathname.startsWith("/access") && !canManageOrganization) {
      router.replace("/dashboard");
      return;
    }
    if (pathname.startsWith("/organizations/") && !hasOrganizationScope) {
      router.replace("/dashboard");
      return;
    }
    if (singleEmployerUser === true && singleEmployerTarget && pathname === "/employers") {
      router.replace(`/employers/${singleEmployerTarget.employerId}?organizationId=${singleEmployerTarget.organizationId}`);
    }
  }, [pathname, router, session, singleEmployerUser, singleEmployerTarget, canManageOrganization, hasOrganizationScope]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (event: Event) => setUpgradeDetail((event as CustomEvent<UpgradeDialogDetail>).detail);
    window.addEventListener(UPGRADE_DIALOG_EVENT, handler);
    return () => window.removeEventListener(UPGRADE_DIALOG_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen && !onboardingRequired) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileMenuOpen, onboardingRequired]);

  async function createBusiness(input: EmployerInput): Promise<Employer> {
    setOnboardingError("");
    try {
      const result = await alphaApi.completeSelfServiceOnboarding(input);
      setOrganizationSelection(result.organizationId);
      setEmployerSelection(result.organizationId, result.employerId);
      return result.employer;
    } catch (err) {
      const message = err instanceof Error ? err.message : "הקמת המעסיק נכשלה.";
      setOnboardingError(message);
      throw err;
    }
  }

  async function completeOnboarding() {
    setOnboardingRequired(false);
    setOnboardingError("");
    try {
      const scope = await alphaApi.scope();
      const accessibleEmployers = scope.organizations.flatMap((organization) =>
        organization.employers.map((employer) => ({ organizationId: organization.id, employerId: employer.id }))
      );
      setSingleEmployerUser(accessibleEmployers.length === 1);
      setSingleEmployerTarget(accessibleEmployers.length === 1 ? accessibleEmployers[0] : null);
      setSingleOrganizationTarget(!session?.platformAdmin && scope.organizations.length === 1 ? scope.organizations[0].id : null);
      setCanManageOrganization(Boolean(session?.platformAdmin) || scope.organizations.some((item) => item.canManageOrganization));
      setHasOrganizationScope(Boolean(session?.platformAdmin) || scope.organizations.some((item) => item.hasOrganizationScope));
    } finally {
      router.replace("/dashboard");
      router.refresh();
    }
  }

  function logout() {
    clearSession();
    router.replace("/login");
  }

  if (!session || singleEmployerUser === null || canManageOrganization === null || hasOrganizationScope === null) return null;

  const visibleNav = nav.map((item) => {
    if (item.href !== "/employers" || !singleEmployerUser || !singleEmployerTarget) return item;
    return {
      ...item,
      href: `/employers/${singleEmployerTarget.employerId}?organizationId=${singleEmployerTarget.organizationId}`,
      label: "המעסיק שלי",
    };
  });
  const navigation = (
    <>
      <nav className="nav" aria-label="ניווט ראשי">
        {visibleNav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={href.startsWith("/employers/") ? (pathname.startsWith("/employers/") ? "active" : "") : (pathname === href ? "active" : "")}><Icon size={18} />{label}</Link>
        ))}
        <div className="nav-divider" />
        {session.platformAdmin ? <Link href="/organizations" className={pathname.startsWith("/organizations") ? "active" : ""}><Landmark size={18} />ארגונים</Link> : null}
        {!session.platformAdmin && singleOrganizationTarget ? <Link href={`/organizations/${singleOrganizationTarget}`} className={pathname.startsWith(`/organizations/${singleOrganizationTarget}`) ? "active" : ""}><Landmark size={18} />הארגון שלי</Link> : null}
        {session.platformAdmin ? <Link href="/admin" className={pathname.startsWith("/admin") ? "active" : ""}><DatabaseZap size={18} />אדמין</Link> : null}
        {canManageOrganization ? <Link href="/access" className={pathname === "/access" ? "active" : ""}><ShieldCheck size={18} />משתמשים והרשאות</Link> : null}
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
            <div className="user-chip"><div><b>{session.displayName}</b><div className="api-state"><span className={`dot${session.mode === "demo" ? "" : " online"}`} />{session.mode === "demo" ? "מצב הדגמה" : "המערכת מחוברת"}</div></div><span className="avatar">{session.displayName.slice(0, 1)}</span></div>
          </header>
          {pageConfig.hideScopeController ? null : <ScopeController />}
          <main className="main">{children}</main>
        </div>
        <UpgradeModal detail={upgradeDetail} onClose={() => setUpgradeDetail(null)} />
        {onboardingRequired ? (
          <div className="onboarding-backdrop" role="presentation">
            <section className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
              <div className="onboarding-heading">
                <div className="profile-avatar"><Building2 /></div>
                <div>
                  <h1 id="onboarding-title">בואו נגדיר את העסק שלכם</h1>
                  <p>הזינו את פרטי המעסיק כדי להתחיל לעבוד במערכת. לא ניתן להמשיך לפני השלמת ההקמה.</p>
                </div>
              </div>
              {onboardingError ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{onboardingError}</div> : null}
              <EmployerForm
                editable
                onCreate={createBusiness}
                onCreated={() => void completeOnboarding()}
                showBackLink={false}
                createLabel="שמירה והמשך"
              />
            </section>
          </div>
        ) : null}
      </div>
    </ShellContext.Provider>
  );
}
