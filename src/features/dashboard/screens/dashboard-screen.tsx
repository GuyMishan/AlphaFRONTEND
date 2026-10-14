"use client";

import { UiInput } from "@/components/ui/ui-controls";
import "./dashboard-screen.css";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CircleCheck,
  FilePenLine,
  FilePlus2,
  Landmark,
  Search,
  ShieldCheck,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import { AlphaSymbol } from "@/components/brand/alpha-logo";
import { LoadingState } from "@/components/loading/loading-state";
import { PageSkeleton } from "@/components/loading/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { formatCount } from "@/lib/format/number";
import { AppShell } from "@/features/shell/components/app-shell";
import { PlanUsage } from "@/features/billing/components/plan-usage";
import { useEntitlements } from "@/features/billing/queries";
import { useDashboardStats } from "@/features/dashboard/queries";
import { useEmployerSearch } from "@/features/employers/queries";
import { getScopeContext, useScopeContext } from "@/features/scope/scope-context";
import { errorMessage } from "@/lib/api/error-messages";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  getEmployerSelection,
  getOrganizationSelection,
  getSession,
  setEmployerSelection,
  setOrganizationSelection,
} from "@/lib/session/storage";
import type { DashboardStats } from "@/features/dashboard/types";
import type { ScopeEmployer } from "@/features/scope/types";
import { employerStatusBadgeClass, employerStatusLabel } from "@/features/employers/employer-status";
import { publishScopeChange, subscribeToScopeChanges, type ScopeChange } from "@/features/scope/scope-events";

type DashboardMode = "admin" | "organization" | "employer";

const EMPTY_STATS: DashboardStats = {
  organizations: 0,
  employers: 0,
  activeEmployers: 0,
  employees: 0,
  activeEmployees: 0,
  inactiveEmployees: 0,
};

const MODE_LABEL: Record<DashboardMode, string> = {
  admin: "ניהול מערכת",
  organization: "מרכז ארגוני",
  employer: "מרכז מעסיק",
};

function QuickAction({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) {
  return <Link className="quick-action" href={href}>
    <span className="quick-action-icon" aria-hidden="true">{icon}</span>
    <span className="quick-action-copy"><b>{title}</b><span>{description}</span></span>
    <ArrowLeft size={17} aria-hidden="true" className="quick-action-arrow" />
  </Link>;
}

export default function DashboardPage() {
  const [mode, setMode] = useState<DashboardMode>("organization");
  const [organizationId, setOrganizationId] = useState("");
  const [employerId, setEmployerId] = useState("");
  // Employers listed in employer mode (organization mode derives them from scope or search).
  const [modeEmployers, setModeEmployers] = useState<ScopeEmployer[]>([]);
  const [query, setQuery] = useState("");
  const [resolving, setResolving] = useState(true);
  const [resolveError, setResolveError] = useState("");
  const [hasOrganizationScope, setHasOrganizationScope] = useState(false);

  const scope = useScopeContext();
  const organizations = useMemo(() => scope.data?.organizations ?? [], [scope.data]);
  const search = useDebouncedValue(query.trim(), 300);

  // Server data for the resolved mode: admin = system-wide, organization = org-wide, employer = employer-level.
  const statsEnabled = !resolving && (mode === "admin" || (mode === "organization" ? Boolean(organizationId) : Boolean(organizationId && employerId)));
  const statsQuery = useDashboardStats(mode === "admin" ? undefined : organizationId, mode === "employer" ? employerId : undefined, statsEnabled);
  const entitlementsQuery = useEntitlements(organizationId, mode !== "admin" && statsEnabled);
  const searchQuery = useEmployerSearch(organizationId, search, 100, !resolving && mode === "organization" && Boolean(search));

  const stats = statsQuery.data ?? EMPTY_STATS;
  const entitlements = mode === "admin" ? null : entitlementsQuery.data ?? null;
  const organizationEmployers = organizations.find((item) => item.id === organizationId)?.employers ?? [];
  const employers: ScopeEmployer[] = mode !== "organization" ? modeEmployers
    : search ? searchQuery.data?.pages[0]?.items ?? [] : organizationEmployers;
  const loading = resolving || statsQuery.isLoading || entitlementsQuery.isLoading;
  const failure = statsQuery.error ?? entitlementsQuery.error;
  const error = resolveError
    || (failure ? errorMessage(failure, "טעינת נתוני הדשבורד נכשלה") : "")
    || (searchQuery.error ? errorMessage(searchQuery.error, "חיפוש המעסיקים נכשל") : "");

  const selectedEmployer = employers.find((item) => item.id === employerId) ?? null;
  const selectedOrganization = organizations.find((item) => item.id === organizationId) ?? null;

  /** Organization mode: keep the saved employer when it belongs to this organization, else the first one. */
  async function selectOrganization(orgId: string) {
    if (!orgId) return;
    const scopeContext = await getScopeContext();
    const allEmployers = scopeContext.organizations.find((item) => item.id === orgId)?.employers ?? [];
    const saved = getEmployerSelection();
    const selected = saved?.organizationId === orgId && allEmployers.some((item) => item.id === saved.employerId)
      ? saved.employerId : allEmployers[0]?.id ?? "";
    setEmployerId(selected);
    if (selected) setEmployerSelection(orgId, selected);
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      setResolving(true);
      setResolveError("");
      try {
        const session = getSession();
        const scopeContext = await getScopeContext();
        if (!active) return;
        if (session?.platformAdmin) {
          setHasOrganizationScope(true); setMode("admin");
          return;
        }
        const hasOrgScope = scopeContext.organizations.some((item) => item.hasOrganizationScope);
        setHasOrganizationScope(hasOrgScope);
        if (!hasOrgScope) {
          const employerEntries = scopeContext.organizations.flatMap((organization) =>
            organization.employers.map((employer) => ({ organization, employer })));
          const saved = getEmployerSelection();
          const selected = employerEntries.find((item) =>
            saved?.organizationId === item.organization.id && saved?.employerId === item.employer.id) ?? employerEntries[0];
          setMode("employer");
          setModeEmployers(employerEntries.map((item) => item.employer));
          if (!selected) return;
          setOrganizationId(selected.organization.id); setEmployerId(selected.employer.id);
          setOrganizationSelection(selected.organization.id); setEmployerSelection(selected.organization.id, selected.employer.id);
          return;
        }
        setMode("organization");
        const savedOrgId = getOrganizationSelection();
        const organizationScoped = scopeContext.organizations.filter((item) => item.hasOrganizationScope);
        const orgId = organizationScoped.some((item) => item.id === savedOrgId) ? savedOrgId! : organizationScoped[0]?.id ?? "";
        setOrganizationId(orgId); if (orgId) setOrganizationSelection(orgId);
        await selectOrganization(orgId);
      } catch (err) {
        if (active) setResolveError(errorMessage(err, "טעינת נתוני הדשבורד נכשלה"));
      } finally { if (active) setResolving(false); }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  useEffect(() => subscribeToScopeChanges((detail: ScopeChange) => {
    setQuery(""); setResolveError("");
    if (!detail.organizationId) {
      setMode("admin"); setOrganizationId(""); setEmployerId(""); setModeEmployers([]);
      return;
    }
    if (!detail.employerId) {
      setMode("organization"); setOrganizationId(detail.organizationId); setOrganizationSelection(detail.organizationId); setEmployerId("");
      setResolving(true);
      void selectOrganization(detail.organizationId)
        .catch((err) => setResolveError(errorMessage(err, "טעינת הארגון נכשלה")))
        .finally(() => setResolving(false));
      return;
    }
    setResolving(true);
    void (async () => {
      const scopeContext = await getScopeContext();
      const organization = scopeContext.organizations.find((item) => item.id === detail.organizationId) ?? null;
      const employer = organization?.employers.find((item) => item.id === detail.employerId) ?? null;
      if (!organization || !employer) throw new Error("ההקשר שנבחר אינו זמין.");
      setMode("employer"); setOrganizationId(detail.organizationId); setEmployerId(detail.employerId!);
      setOrganizationSelection(detail.organizationId); setEmployerSelection(detail.organizationId, detail.employerId!);
      setModeEmployers([employer]);
    })().catch((err) => setResolveError(errorMessage(err, "טעינת המעסיק נכשלה"))).finally(() => setResolving(false));
  }), []);

  function chooseEmployer(id: string) {
    if (!organizationId) return;
    setEmployerId(id);
    setEmployerSelection(organizationId, id);
    publishScopeChange({ organizationId, employerId: id });
  }

  const title = useMemo(() => {
    if (mode === "admin") return "מרכז ניהול המערכת";
    if (mode === "employer") return selectedEmployer?.legalName ? `שלום, ${selectedEmployer.legalName}` : "מרכז המעסיק";
    return selectedOrganization?.name ? `מרכז הארגון · ${selectedOrganization.name}` : "מרכז הארגון";
  }, [mode, selectedEmployer, selectedOrganization]);

  const subtitle = mode === "admin"
    ? "תמונת מצב מערכתית של הארגונים, המעסיקים והעובדים במערכת."
    : mode === "employer"
      ? "תמונת מצב של העובדים והפעילות אצל המעסיק שלך."
      : "תמונת מצב של הארגון וכל המעסיקים המשויכים אליו.";

  const quickActions = mode === "admin" ? (
    <aside className="card"><div className="card-head"><h2>פעולות ניהול</h2></div><div className="quick-actions">
      <QuickAction href="/admin" icon={<ShieldCheck size={19} />} title="ניהול מערכת" description="משתמשים והגדרות מערכת" />
      <QuickAction href="/employers" icon={<Building2 size={19} />} title="מעסיקים" description="מעבר לרשימת המעסיקים" />
      <QuickAction href="/reports" icon={<CircleCheck size={19} />} title="דיווחים" description="צפייה בדיווחים במערכת" />
    </div></aside>
  ) : (
    <aside className="card"><div className="card-head"><h2>פעולות מהירות</h2></div><div className="quick-actions">
      <QuickAction href="/reports/new" icon={<FilePlus2 size={19} />} title="דיווח חודשי חדש" description="יצירת דיווח חדש" />
      <QuickAction href="/reports/new?mode=correction" icon={<FilePenLine size={19} />} title="תיקון דיווח" description="תיקון או דיווח הפרשים" />
      <QuickAction href="/employees" icon={<Users size={19} />} title="רשימת עובדים" description="צפייה וניהול עובדים" />
      {mode === "organization" && hasOrganizationScope && organizationId ? <QuickAction href={`/organizations/${organizationId}`} icon={<Building2 size={19} />} title="פרופיל ארגון" description="פרטים, מנוי, Billing והרשאות" /> : null}
      {mode === "organization" && hasOrganizationScope ? <QuickAction href="/access" icon={<UserCog size={19} />} title="הרשאות משתמשים" description="ניהול גישה בארגון" /> : null}
    </div></aside>
  );

  if (loading) return <AppShell title="דף הבית"><PageSkeleton variant="dashboard" label="טוען את דף הבית..." /></AppShell>;

  const searching = Boolean(search) && searchQuery.isLoading;

  return <AppShell title="דף הבית">
    <section className="dashboard-hero" aria-labelledby="dashboard-title">
      <AlphaSymbol className="dashboard-hero-mark" />
      <div className="dashboard-hero-copy">
        <span className="dashboard-hero-eyebrow">{MODE_LABEL[mode]}</span>
        <h1 id="dashboard-title">{title}</h1>
        <p>{subtitle}</p>
      </div>
      {mode !== "admin" ? <Link href="/reports/new" className="btn btn-primary btn-lg"><FilePlus2 size={18} />דיווח חדש</Link> : <Link href="/admin" className="btn btn-primary btn-lg"><ShieldCheck size={18} />ניהול מערכת</Link>}
    </section>

    {error ? <div className="notice notice-error dashboard-section">{error}</div> : null}

    {mode !== "admin" && entitlements?.plan.code === "FREE" ? <section className="card dashboard-section">
      <div className="card-head"><div><h2>מסלול {entitlements.plan.name}</h2><span>השימוש הנוכחי מול מכסת המסלול</span></div></div>
      <div className="grid stats">
        <PlanUsage label="מעסיקים" usage={entitlements.employers} />
        <PlanUsage label="עובדים פעילים" usage={entitlements.activeEmployees} />
        <PlanUsage label="משתמשים" usage={entitlements.users} />
      </div>
    </section> : null}

    <section className="grid stats dashboard-section" aria-label="נתונים מרכזיים">
      {mode === "admin" ? <StatCard label="ארגונים" value={formatCount(stats.organizations)} icon={<Landmark size={19} />} tone="navy" /> : null}
      {mode !== "employer" ? <StatCard label="מעסיקים" value={formatCount(stats.employers)} icon={<Building2 size={19} />}
        footer={<span className="badge badge-green">{formatCount(stats.activeEmployers)} פעילים</span>} /> : null}
      <StatCard label="עובדים" value={formatCount(stats.employees)} icon={<Users size={19} />} tone="teal"
        footer={<span className="badge badge-green">{formatCount(stats.activeEmployees)} פעילים</span>} />
      <StatCard label="עובדים לא פעילים" value={formatCount(stats.inactiveEmployees)} icon={<UserX size={19} />} tone="amber" />
      <StatCard label="דיווחים החודש" value="—" pending icon={<CircleCheck size={19} />} tone="neutral" footer="הנתון עדיין לא זמין" />
      <StatCard label="שגיאות פתוחות" value="—" pending icon={<AlertTriangle size={19} />} tone="neutral" footer="הנתון עדיין לא זמין" />
    </section>

    {mode === "organization" ? (
      <section className="grid content-grid">
        <div className="card">
          <div className="card-head"><div><h2>מעסיקים בארגון</h2><span>בחרו מעסיק כדי לעבוד בהקשר שלו</span></div><span className="badge badge-gray">{formatCount(employers.length)}</span></div>
          <div className="toolbar"><div className="search"><Search size={17} aria-hidden="true" /><UiInput aria-label="חיפוש מעסיק" placeholder="חיפוש לפי שם או ח.פ..." value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
          {searching ? <LoadingState compact label="מחפש מעסיקים..." /> : employers.length ? <div className="employer-list">{employers.map((employer) => <div key={employer.id} className={`employer${employer.id === employerId ? " active" : ""}`}>
            <button className="employer-select" onClick={() => chooseEmployer(employer.id)} aria-pressed={employer.id === employerId}>
              <span className="employer-logo" aria-hidden="true">{employer.legalName.slice(0, 2)}</span>
              <span className="employer-info">
                <b>{employer.legalName}</b>
                <span className="employer-identifiers"><span>ח.פ. <bdi dir="ltr">{employer.registrationNumber}</bdi></span><span>תיק ניכויים <bdi dir="ltr">{employer.withholdingFileNumber}</bdi></span></span>
              </span>
            </button>
            <Link className="btn btn-soft btn-sm" href={`/employers/${employer.id}?organizationId=${organizationId}`}>לפרופיל</Link>
            <span className={employerStatusBadgeClass(employer.status)}>{employerStatusLabel(employer.status)}</span>
          </div>)}</div> : <EmptyState icon={<Building2 size={22} />} title="לא נמצאו מעסיקים בארגון הזה." description={search ? "נסו לחפש לפי שם אחר או מספר ח.פ." : undefined} />}
        </div>
        {quickActions}
      </section>
    ) : (
      <section className="grid content-grid employer-quick-actions-wrap">{quickActions}</section>
    )}
  </AppShell>;
}
