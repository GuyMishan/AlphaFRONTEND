"use client";

import { useEffect, useMemo, useState } from "react";
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
import { AppShell } from "@/components/app-shell";
import { alphaApi } from "@/lib/api";
import { resolveSingleEmployerScope } from "@/lib/access-scope";
import {
  getEmployerSelection,
  getOrganizationSelection,
  getSession,
  setEmployerSelection,
  setOrganizationSelection,
} from "@/lib/session";
import type { Employee, Employer, Organization } from "@/lib/types";

type DashboardMode = "admin" | "organization" | "employer";

type DashboardStats = {
  organizations: number;
  employers: number;
  activeEmployers: number;
  employees: number;
  activeEmployees: number;
  inactiveEmployees: number;
};

const EMPTY_STATS: DashboardStats = {
  organizations: 0,
  employers: 0,
  activeEmployers: 0,
  employees: 0,
  activeEmployees: 0,
  inactiveEmployees: 0,
};

async function safeEmployees(organizationId: string, employerId: string): Promise<Employee[]> {
  try {
    return await alphaApi.employees(organizationId, employerId);
  } catch {
    return [];
  }
}

function StatCard({ label, value, icon, badge }: { label: string; value: number | string; icon: React.ReactNode; badge?: string }) {
  return <div className="stat-card">
    <div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div>
    <div className="stat-value">{value}</div>
    {badge ? <span className="badge badge-gray">{badge}</span> : null}
  </div>;
}

export default function DashboardPage() {
  const [mode, setMode] = useState<DashboardMode>("organization");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [employerId, setEmployerId] = useState("");
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedEmployer = employers.find((item) => item.id === employerId) ?? null;
  const selectedOrganization = organizations.find((item) => item.id === organizationId) ?? null;

  async function loadEmployerDashboard(org: Organization, employer: Employer) {
    const employees = await safeEmployees(org.id, employer.id);
    setStats({
      organizations: 1,
      employers: 1,
      activeEmployers: employer.status === 2 ? 1 : 0,
      employees: employees.length,
      activeEmployees: employees.filter((item) => item.status === 1).length,
      inactiveEmployees: employees.filter((item) => item.status !== 1).length,
    });
  }

  async function loadOrganizationDashboard(orgId: string, search = "") {
    if (!orgId) {
      setEmployers([]);
      setStats(EMPTY_STATS);
      return;
    }

    const result = await alphaApi.employerSearch(orgId, search.trim(), 0, 100);
    setEmployers(result.items);

    const saved = getEmployerSelection();
    const selected = saved?.organizationId === orgId && result.items.some((item) => item.id === saved.employerId)
      ? saved.employerId
      : result.items[0]?.id ?? "";
    setEmployerId(selected);
    if (selected) setEmployerSelection(orgId, selected);

    const employeeGroups = await Promise.all(result.items.map((employer) => safeEmployees(orgId, employer.id)));
    const employees = employeeGroups.flat();
    setStats({
      organizations: 1,
      employers: result.items.length,
      activeEmployers: result.items.filter((item) => item.status === 2).length,
      employees: employees.length,
      activeEmployees: employees.filter((item) => item.status === 1).length,
      inactiveEmployees: employees.filter((item) => item.status !== 1).length,
    });
  }

  async function loadAdminDashboard(accessibleOrganizations: Organization[]) {
    const employerGroups = await Promise.all(accessibleOrganizations.map(async (org) => {
      try { return await alphaApi.employers(org.id); } catch { return []; }
    }));
    const allEmployers = employerGroups.flat();
    const employees = (await Promise.all(
      accessibleOrganizations.flatMap((org, orgIndex) =>
        employerGroups[orgIndex].map((employer) => safeEmployees(org.id, employer.id))
      )
    )).flat();

    setStats({
      organizations: accessibleOrganizations.length,
      employers: allEmployers.length,
      activeEmployers: allEmployers.filter((item) => item.status === 2).length,
      employees: employees.length,
      activeEmployees: employees.filter((item) => item.status === 1).length,
      inactiveEmployees: employees.filter((item) => item.status !== 1).length,
    });
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      setError("");
      try {
        const session = getSession();
        const accessibleOrganizations = await alphaApi.organizations();
        if (!active) return;
        setOrganizations(accessibleOrganizations);

        if (session?.platformAdmin) {
          setMode("admin");
          await loadAdminDashboard(accessibleOrganizations);
          return;
        }

        const scoped = await resolveSingleEmployerScope();
        if (!active) return;
        if (scoped) {
          setMode("employer");
          setOrganizationId(scoped.organization.id);
          setOrganizations([scoped.organization]);
          setEmployers([scoped.employer]);
          setEmployerId(scoped.employer.id);
          await loadEmployerDashboard(scoped.organization, scoped.employer);
          return;
        }

        setMode("organization");
        const savedOrgId = getOrganizationSelection();
        const orgId = accessibleOrganizations.some((item) => item.id === savedOrgId)
          ? savedOrgId!
          : accessibleOrganizations[0]?.id ?? "";
        setOrganizationId(orgId);
        if (orgId) setOrganizationSelection(orgId);
        await loadOrganizationDashboard(orgId);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "טעינת נתוני הדשבורד נכשלה");
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (mode !== "organization" || !organizationId) return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try { await loadOrganizationDashboard(organizationId, query); }
      catch (err) { setError(err instanceof Error ? err.message : "טעינת המעסיקים נכשלה"); }
      finally { setLoading(false); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (mode !== "organization") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId: string }>).detail;
      setOrganizationId(detail.organizationId);
      setOrganizationSelection(detail.organizationId);
      setQuery("");
      setEmployerId("");
      setLoading(true);
      void loadOrganizationDashboard(detail.organizationId)
        .catch((err) => setError(err instanceof Error ? err.message : "טעינת הארגון נכשלה"))
        .finally(() => setLoading(false));
    };
    window.addEventListener("alpha:scope-change", handler);
    return () => window.removeEventListener("alpha:scope-change", handler);
  }, [mode]);

  function chooseEmployer(id: string) {
    setEmployerId(id);
    setEmployerSelection(organizationId, id);
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
      <Link className="quick-action" href="/admin"><span className="quick-action-icon"><ShieldCheck size={19} /></span><span><b>ניהול מערכת</b><span>משתמשים והגדרות מערכת</span></span><ArrowLeft size={17} /></Link>
      <Link className="quick-action" href="/employers"><span className="quick-action-icon"><Building2 size={19} /></span><span><b>מעסיקים</b><span>מעבר לרשימת המעסיקים</span></span><ArrowLeft size={17} /></Link>
      <Link className="quick-action" href="/reports"><span className="quick-action-icon"><CircleCheck size={19} /></span><span><b>דיווחים</b><span>צפייה בדיווחים במערכת</span></span><ArrowLeft size={17} /></Link>
    </div></aside>
  ) : (
    <aside className="card"><div className="card-head"><h2>פעולות מהירות</h2></div><div className="quick-actions">
      <Link className="quick-action" href="/reports/new"><span className="quick-action-icon"><FilePlus2 size={19} /></span><span><b>דיווח חודשי חדש</b><span>יצירת דיווח חדש</span></span><ArrowLeft size={17} /></Link>
      <Link className="quick-action" href="/reports/new?mode=correction"><span className="quick-action-icon"><FilePenLine size={19} /></span><span><b>תיקון דיווח</b><span>תיקון או דיווח הפרשים</span></span><ArrowLeft size={17} /></Link>
      <Link className="quick-action" href="/employees"><span className="quick-action-icon"><Users size={19} /></span><span><b>רשימת עובדים</b><span>צפייה וניהול עובדים</span></span><ArrowLeft size={17} /></Link>
      {mode === "organization" ? <Link className="quick-action" href="/access"><span className="quick-action-icon"><UserCog size={19} /></span><span><b>הרשאות משתמשים</b><span>ניהול גישה בארגון</span></span><ArrowLeft size={17} /></Link> : null}
    </div></aside>
  );

  return <AppShell title="דף הבית">
    <div className="page-head">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      {mode !== "admin" ? <Link href="/reports/new" className="btn btn-primary btn-lg"><FilePlus2 size={18} />דיווח חדש</Link> : <Link href="/admin" className="btn btn-primary btn-lg"><ShieldCheck size={18} />ניהול מערכת</Link>}
    </div>

    {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}

    <section className="grid stats">
      {mode === "admin" ? <StatCard label="ארגונים" value={loading ? "—" : stats.organizations} icon={<Building2 size={18} />} /> : null}
      {mode !== "employer" ? <StatCard label="מעסיקים" value={loading ? "—" : stats.employers} icon={<Building2 size={18} />} badge={`${stats.activeEmployers} פעילים`} /> : null}
      <StatCard label="עובדים" value={loading ? "—" : stats.employees} icon={<Users size={18} />} badge={`${stats.activeEmployees} פעילים`} />
      <StatCard label="עובדים לא פעילים" value={loading ? "—" : stats.inactiveEmployees} icon={<AlertTriangle size={18} />} />
      <StatCard label="דיווחים החודש" value="—" icon={<CircleCheck size={18} />} badge="יתחבר לנתוני הדיווחים" />
      <StatCard label="שגיאות פתוחות" value="—" icon={<AlertTriangle size={18} />} badge="יתחבר למשובי המסלקה" />
    </section>

    {mode === "organization" ? (
      <section className="grid content-grid">
        <div className="card">
          <div className="card-head"><div><h2>מעסיקים בארגון</h2><span style={{ color: "var(--muted)" }}>בחרו מעסיק כדי לעבוד בהקשר שלו</span></div></div>
          <div className="toolbar"><div className="search"><Search size={17} /><input placeholder="חיפוש לפי שם או ח.פ..." value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
          {loading ? <div className="empty">טוען נתונים...</div> : employers.length ? <div className="employer-list">{employers.map((employer) => <div key={employer.id} className={`employer${employer.id === employerId ? " active" : ""}`}>
            <button className="employer-select" onClick={() => chooseEmployer(employer.id)}><span className="employer-logo">{employer.legalName.slice(0, 2)}</span><span className="employer-info"><b>{employer.legalName}</b><span>ח.פ. {employer.registrationNumber} · תיק ניכויים {employer.withholdingFileNumber}</span></span></button>
            <Link className="btn btn-soft" href={`/employers/${employer.id}?organizationId=${organizationId}`}>לפרופיל</Link>
            <span className={employer.status === 2 ? "badge badge-green" : "badge badge-orange"}>{employer.status === 2 ? "פעיל" : "בתהליך הקמה"}</span>
          </div>)}</div> : <div className="empty"><Building2 size={34} /><div>לא נמצאו מעסיקים בארגון הזה.</div></div>}
        </div>
        {quickActions}
      </section>
    ) : (
      <section className="grid content-grid" style={{ gridTemplateColumns: "1fr" }}>{quickActions}</section>
    )}
  </AppShell>;
}
