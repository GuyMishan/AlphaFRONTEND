"use client";

import { UiInput } from "@/components/ui/ui-controls";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CircleCheck,
  FilePenLine,
  FilePlus2,
  Search,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
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

function StatCard({ label, value, icon, badge }: { label: string; value: number | string; icon: ReactNode; badge?: string }) {
  return <div className="stat-card">
    <div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div>
    <div className="stat-value">{value}</div>
    {badge ? <span className="badge badge-gray">{badge}</span> : null}
  </div>;
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
      <Link className="quick-action" href="/admin"><div className="quick-action-icon"><ShieldCheck size={19} /></div><span><b>ניהול מערכת</b><span>משתמשים והגדרות מערכת</span></span><ArrowLeft size={17} /></Link>
      <Link className="quick-action" href="/employers"><div className="quick-action-icon"><Building2 size={19} /></div><span><b>מעסיקים</b><span>מעבר לרשימת המעסיקים</span></span><ArrowLeft size={17} /></Link>
      <Link className="quick-action" href="/reports"><div className="quick-action-icon"><CircleCheck size={19} /></div><span><b>דיווחים</b><span>צפייה בדיווחים במערכת</span></span><ArrowLeft size={17} /></Link>
    </div></aside>
  ) : (
    <aside className="card"><div className="card-head"><h2>פעולות מהירות</h2></div><div className="quick-actions">
      <Link className="quick-action" href="/reports/new"><div className="quick-action-icon"><FilePlus2 size={19} /></div><span><b>דיווח חודשי חדש</b><span>יצירת דיווח חדש</span></span><ArrowLeft size={17} /></Link>
      <Link className="quick-action" href="/reports/new?mode=correction"><div className="quick-action-icon"><FilePenLine size={19} /></div><span><b>תיקון דיווח</b><span>תיקון או דיווח הפרשים</span></span><ArrowLeft size={17} /></Link>
      <Link className="quick-action" href="/employees"><div className="quick-action-icon"><Users size={19} /></div><span><b>רשימת עובדים</b><span>צפייה וניהול עובדים</span></span><ArrowLeft size={17} /></Link>
      {mode === "organization" && hasOrganizationScope && organizationId ? <Link className="quick-action" href={`/organizations/${organizationId}`}><div className="quick-action-icon"><Building2 size={19} /></div><span><b>פרופיל ארגון</b><span>פרטים, מנוי, Billing והרשאות</span></span><ArrowLeft size={17} /></Link> : null}
      {mode === "organization" && hasOrganizationScope ? <Link className="quick-action" href="/access"><div className="quick-action-icon"><UserCog size={19} /></div><span><b>הרשאות משתמשים</b><span>ניהול גישה בארגון</span></span><ArrowLeft size={17} /></Link> : null}
    </div></aside>
  );

  if (loading) return <AppShell title="דף הבית">{null}</AppShell>;

  return <AppShell title="דף הבית">
    <div className="page-head">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      {mode !== "admin" ? <Link href="/reports/new" className="btn btn-primary btn-lg"><FilePlus2 size={18} />דיווח חדש</Link> : <Link href="/admin" className="btn btn-primary btn-lg"><ShieldCheck size={18} />ניהול מערכת</Link>}
    </div>

    {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}

    {mode !== "admin" && entitlements?.plan.code === "FREE" ? <section className="card" style={{ marginBottom: 18 }}>
      <div className="card-head"><div><h2>מסלול {entitlements.plan.name}</h2><span style={{ color: "var(--muted)" }}>השימוש הנוכחי מול מכסת המסלול</span></div></div>
      <div className="grid stats">
        <PlanUsage label="מעסיקים" usage={entitlements.employers} />
        <PlanUsage label="עובדים פעילים" usage={entitlements.activeEmployees} />
        <PlanUsage label="משתמשים" usage={entitlements.users} />
      </div>
    </section> : null}

    <section className="grid stats">
      {mode === "admin" ? <StatCard label="ארגונים" value={stats.organizations} icon={<Building2 size={18} />} /> : null}
      {mode !== "employer" ? <StatCard label="מעסיקים" value={stats.employers} icon={<Building2 size={18} />} badge={`${stats.activeEmployers} פעילים`} /> : null}
      <StatCard label="עובדים" value={stats.employees} icon={<Users size={18} />} badge={`${stats.activeEmployees} פעילים`} />
      <StatCard label="עובדים לא פעילים" value={stats.inactiveEmployees} icon={<AlertTriangle size={18} />} />
      <StatCard label="דיווחים החודש" value="—" icon={<CircleCheck size={18} />} badge="יתחבר לנתוני הדיווחים" />
      <StatCard label="שגיאות פתוחות" value="—" icon={<AlertTriangle size={18} />} badge="יתחבר למשובי המסלקה" />
    </section>

    {mode === "organization" ? (
      <section className="grid content-grid">
        <div className="card">
          <div className="card-head"><div><h2>מעסיקים בארגון</h2><span style={{ color: "var(--muted)" }}>בחרו מעסיק כדי לעבוד בהקשר שלו</span></div></div>
          <div className="toolbar"><div className="search"><Search size={17} /><UiInput placeholder="חיפוש לפי שם או ח.פ..." value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
          {loading ? <div className="empty">טוען נתונים...</div> : employers.length ? <div className="employer-list">{employers.map((employer) => <div key={employer.id} className={`employer${employer.id === employerId ? " active" : ""}`}>
            <button className="employer-select" onClick={() => chooseEmployer(employer.id)}><span className="employer-logo">{employer.legalName.slice(0, 2)}</span><span className="employer-info"><b>{employer.legalName}</b><span>ח.פ. {employer.registrationNumber} · תיק ניכויים {employer.withholdingFileNumber}</span></span></button>
            <Link className="btn btn-soft" href={`/employers/${employer.id}?organizationId=${organizationId}`}>לפרופיל</Link>
            <span className={employerStatusBadgeClass(employer.status)}>{employerStatusLabel(employer.status)}</span>
          </div>)}</div> : <div className="empty"><Building2 size={34} /><div>לא נמצאו מעסיקים בארגון הזה.</div></div>}
        </div>
        {quickActions}
      </section>
    ) : (
      <section className="grid content-grid employer-quick-actions-wrap">{quickActions}</section>
    )}
  </AppShell>;
}
