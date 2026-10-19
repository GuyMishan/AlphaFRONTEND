"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Building2, DatabaseZap, FileClock, FilePlus2, Gauge, Landmark, LogOut, Menu, Settings, ShieldCheck, Users, X, type LucideIcon } from "lucide-react";
import { Brand } from "@/components/brand/brand";
import { AppLoader } from "@/components/loading/app-loader";
import { ScopeController } from "@/features/scope/components/scope-controller";
import { UpgradeModal } from "@/features/billing/components/upgrade-modal";
import { AppModal } from "@/components/ui/app-modal";
import { EmployerForm } from "@/features/employers/components/employer-form";
import { AccessibilityMenu } from "@/components/layout/accessibility-menu";
import { scopeApi } from "@/features/scope/api";
import { logout } from "@/lib/session/lifecycle";
import { resolveSession } from "@/features/auth/restore-session";
import { getScopeContext, refreshScopeContext } from "@/features/scope/scope-context";
import { isPlatformAdminSession, setEmployerSelection, setOrganizationSelection } from "@/lib/session/storage";
import { useAppStore } from "@/lib/session/use-app-store";
import type { Employer, EmployerInput } from "@/features/employers/types";
import type { GlobalScopeContext } from "@/features/scope/types";
import { closeUpgradeDialog, openUpgradeDialog, upgradeDetailFromProblem, upgradeDialogStore } from "@/features/billing/upgrade";
import { subscribeToApiErrors } from "@/lib/api/client";
import { useStore } from "zustand";
import { errorMessage } from "@/lib/api/error-messages";

const nav = [
  { href: "/dashboard", label: "דף הבית", icon: Gauge },
  { href: "/reports/new", label: "דיווח חדש", icon: FilePlus2 },
  { href: "/reports", label: "דיווחים ומשובים", icon: FileClock },
  { href: "/employees", label: "עובדים", icon: Users },
  { href: "/employers", label: "מעסיקים", icon: Building2 },
];

type NavItem = { href: string; label: string; icon: LucideIcon; active: boolean };

/** Lights up while the navigation started by this link is pending (Next.js useLinkStatus). */
function NavPendingIndicator() {
  const { pending } = useLinkStatus();
  return <span className={`nav-pending${pending ? " is-pending" : ""}`} aria-hidden="true" />;
}

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  return <div className="nav-section" role="group" aria-label={label}>
    <span className="nav-section-label" aria-hidden="true">{label}</span>
    {items.map(({ href, label: itemLabel, icon: Icon, active }) => (
      <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
        <Icon size={18} aria-hidden="true" className="nav-icon" />
        <span className="nav-label">{itemLabel}</span>
        <NavPendingIndicator />
      </Link>
    ))}
  </div>;
}

/** Thin progress line under the topbar while TanStack Query fetches or mutates. */
function FetchIndicator() {
  const busy = useIsFetching() + useIsMutating() > 0;
  return <span className={`fetch-indicator${busy ? " is-active" : ""}`} aria-hidden="true" />;
}

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

/** Up to two initials ("יעל שטרן" → "יש") for the decorative avatar. */
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.slice(0, 1)).join("");
}

function AppShellFrame({ children, initialConfig }: { children: React.ReactNode; initialConfig: ShellPageConfig }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAppStore((state) => state.session);
  const [singleEmployerUser, setSingleEmployerUser] = useState<boolean | null>(null);
  const [singleEmployerTarget, setSingleEmployerTarget] = useState<{ organizationId: string; employerId: string } | null>(null);
  const [canManageOrganization, setCanManageOrganization] = useState<boolean | null>(null);
  const [hasOrganizationScope, setHasOrganizationScope] = useState<boolean | null>(null);
  const [singleOrganizationTarget, setSingleOrganizationTarget] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const [pageConfig, setPageConfigState] = useState<ShellPageConfig>(initialConfig);
  const upgradeDetail = useStore(upgradeDialogStore, (state) => state.detail);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");

  const setPageConfig = useCallback((config: ShellPageConfig) => {
    setPageConfigState((current) => current.title === config.title && current.hideScopeController === config.hideScopeController ? current : config);
  }, []);
  const shellContext = useMemo(() => ({ setPageConfig }), [setPageConfig]);

  /** Derives navigation and route guards from the access scope (backend still authorizes every call). */
  const applyScope = useCallback((scope: GlobalScopeContext, platformAdmin: boolean) => {
    const accessibleEmployers = scope.organizations.flatMap((organization) =>
      organization.employers.map((employer) => ({ organizationId: organization.id, employerId: employer.id }))
    );
    setSingleEmployerUser(accessibleEmployers.length === 1);
    setSingleEmployerTarget(accessibleEmployers.length === 1 ? accessibleEmployers[0] : null);
    setSingleOrganizationTarget(!platformAdmin && scope.organizations.length === 1 ? scope.organizations[0].id : null);
    setCanManageOrganization(platformAdmin || scope.organizations.some((item) => item.canManageOrganization));
    setHasOrganizationScope(platformAdmin || scope.organizations.some((item) => item.hasOrganizationScope));
  }, []);

  useEffect(() => {
    let active = true;

    async function initializeSession() {
      const resolved = await resolveSession();
      if (!active) return;
      // Unauthenticated, or the backend could not be reached: the login page checks again.
      if (resolved.status !== "authenticated") {
        router.replace("/login");
        return;
      }
      const stored = resolved.session;

      try {
        const [onboarding, scope] = await Promise.all([
          scopeApi.onboardingStatus(),
          getScopeContext(),
        ]);
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
        applyScope(scope, stored.platformAdmin);
      } catch {
        // Without scope the shell cannot decide what to show; start over from sign-in.
        if (active) void logout();
      }
    }

    void initializeSession();
    return () => { active = false; };
  }, [router, applyScope]);

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

  // Plan-gate errors from any backend call open the shared upgrade dialog.
  useEffect(() => subscribeToApiErrors((error) => {
    const detail = upgradeDetailFromProblem(error.problem);
    if (detail) openUpgradeDialog(detail);
  }), []);

  // The mobile drawer is a modal navigation panel: focus moves in on open and stays inside
  // (the page behind it is inert), Escape closes it, and closing in any way (Escape, backdrop,
  // close button, a link) returns focus to the menu button unless focus already moved elsewhere.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const menuButton = mobileMenuButtonRef.current;
    const drawer = mobileDrawerRef.current;
    const frame = requestAnimationFrame(() => drawer?.querySelector<HTMLElement>(".nav-link")?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobileMenuOpen(false); return; }
      if (event.key !== "Tab" || !drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const inside = drawer.contains(document.activeElement);
      if (event.shiftKey && (!inside || document.activeElement === first)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (!inside || document.activeElement === last)) { event.preventDefault(); first.focus(); }
    };
    // The drawer only exists below the mobile breakpoint; close it if the viewport grows past it.
    const desktop = window.matchMedia("(min-width: 761px)");
    const onViewportChange = () => { if (desktop.matches) setMobileMenuOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onViewportChange);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onViewportChange);
      const active = document.activeElement;
      const focusWasInDrawer = !active || active === document.body || drawer?.contains(active) || active.classList.contains("mobile-sidebar-backdrop");
      if (menuButton?.isConnected && focusWasInDrawer) menuButton.focus();
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen && !onboardingRequired) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileMenuOpen, onboardingRequired]);

  async function createBusiness(input: EmployerInput): Promise<Employer> {
    setOnboardingError("");
    try {
      const result = await scopeApi.completeSelfServiceOnboarding(input);
      setOrganizationSelection(result.organizationId);
      setEmployerSelection(result.organizationId, result.employerId);
      return result.employer;
    } catch (err) {
      const message = errorMessage(err, "הקמת המעסיק נכשלה.");
      setOnboardingError(message);
      throw err;
    }
  }

  async function completeOnboarding() {
    setOnboardingRequired(false);
    setOnboardingError("");
    try {
      applyScope(await refreshScopeContext(), Boolean(session?.platformAdmin));
    } finally {
      router.replace("/dashboard");
      router.refresh();
    }
  }

  function handleLogout() {
    void logout();
  }

  if (!session || singleEmployerUser === null || canManageOrganization === null || hasOrganizationScope === null) return <AppLoader />;

  const platformAdmin = isPlatformAdminSession(session);
  const operations: NavItem[] = nav.map((item) => {
    if (item.href === "/employers" && singleEmployerUser && singleEmployerTarget) {
      return {
        ...item,
        href: `/employers/${singleEmployerTarget.employerId}?organizationId=${singleEmployerTarget.organizationId}`,
        label: "המעסיק שלי",
        active: pathname.startsWith("/employers/"),
      };
    }
    return { ...item, active: pathname === item.href };
  });
  const management: NavItem[] = [
    platformAdmin ? { href: "/organizations", label: "ארגונים", icon: Landmark, active: pathname.startsWith("/organizations") } : null,
    !platformAdmin && session.isReferent && hasOrganizationScope ? { href: "/organizations", label: "ארגונים בניהול", icon: Landmark, active: pathname.startsWith("/organizations") } : null,
    !session.platformAdmin && !singleEmployerUser && singleOrganizationTarget ? { href: `/organizations/${singleOrganizationTarget}`, label: "הארגון שלי", icon: Landmark, active: pathname.startsWith(`/organizations/${singleOrganizationTarget}`) } : null,
    platformAdmin ? { href: "/admin", label: "אדמין", icon: DatabaseZap, active: pathname === "/admin" } : null,
    canManageOrganization ? { href: "/access", label: "משתמשים והרשאות", icon: ShieldCheck, active: pathname === "/access" } : null,
  ].filter((item): item is NavItem => item !== null);

  const navigation = (
    <>
      <nav className="nav" aria-label="ניווט ראשי">
        <NavSection label="תפעול" items={operations} />
        {management.length ? <NavSection label="ניהול" items={management} /> : null}
      </nav>
      <div className="sidebar-bottom">
        <NavSection label="חשבון" items={[{ href: "/settings", label: "הגדרות", icon: Settings, active: pathname === "/settings" }]} />
        <button type="button" className="nav-link nav-logout" onClick={handleLogout}><LogOut size={18} aria-hidden="true" className="nav-icon" /><span className="nav-label">יציאה</span></button>
        <Link className={`nav-link${pathname === "/legal" ? " active" : ""}`} href="/legal" aria-current={pathname === "/legal" ? "page" : undefined}><ShieldCheck size={18} aria-hidden="true" className="nav-icon" /><span className="nav-label">מדיניות ומידע משפטי</span><NavPendingIndicator /></Link>
      </div>
    </>
  );

  return (
    <ShellContext.Provider value={shellContext}>
      <div className="app-shell">
        <aside className="sidebar" aria-label="תפריט צד">
          <div className="sidebar-brand"><Brand /></div>
          {navigation}
        </aside>

        {mobileMenuOpen ? <button className="mobile-sidebar-backdrop" aria-label="סגירת תפריט" onClick={() => setMobileMenuOpen(false)} /> : null}
        <aside ref={mobileDrawerRef} className={`mobile-sidebar${mobileMenuOpen ? " open" : ""}`} aria-hidden={!mobileMenuOpen} aria-label="תפריט ניווט"
          role={mobileMenuOpen ? "dialog" : undefined}>
          <div className="mobile-sidebar-head">
            <Brand />
            <button className="mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="סגירת תפריט"><X size={22} /></button>
          </div>
          {navigation}
        </aside>

        {/* While the drawer is open the page behind it is inert, which makes the drawer modal for keyboard and assistive tech. */}
        <div className="workspace" inert={mobileMenuOpen || undefined}>
          <header className="topbar">
            <div className="topbar-leading">
              <button ref={mobileMenuButtonRef} className="mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="פתיחת תפריט" aria-expanded={mobileMenuOpen}><Menu size={22} /></button>
              <div className="topbar-title"><span>מערכת תפעול פנסיוני</span><b>{pageConfig.title}</b></div>
            </div>
            <div className="user-chip">
              <div className="user-chip-copy"><b>{session.displayName}</b><div className="api-state"><span className="dot online" />{session.isReferent ? "רפרנט · המערכת מחוברת" : "המערכת מחוברת"}</div></div>
              <span className="avatar" aria-hidden="true">{initials(session.displayName)}</span>
            </div>
            <FetchIndicator />
          </header>
          {pageConfig.hideScopeController ? null : <ScopeController />}
          <main className="main">{children}</main>
        </div>
        <UpgradeModal detail={upgradeDetail} onClose={closeUpgradeDialog} />
        <AccessibilityMenu />
        {onboardingRequired ? (
          <AppModal title="בואו נגדיר את העסק שלכם"
            subtitle="הזינו את פרטי המעסיק כדי להתחיל לעבוד במערכת. לא ניתן להמשיך לפני השלמת ההקמה."
            width="lg" closeOnBackdrop={false} onClose={handleLogout} closeDisabled={onboardingSaving}
            actions={<button type="submit" form="onboarding-employer-form" className="btn btn-primary"
              disabled={onboardingSaving}>{onboardingSaving ? "שומר..." : "שמירה והמשך"}</button>}>
            {onboardingError ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{onboardingError}</div> : null}
            <EmployerForm editable onCreate={createBusiness}
              onCreated={() => void completeOnboarding()}
              formId="onboarding-employer-form" hideActions onSavingChange={setOnboardingSaving}
              embedded showBackLink={false} createLabel="שמירה והמשך" />
          </AppModal>
        ) : null}
      </div>
    </ShellContext.Provider>
  );
}
