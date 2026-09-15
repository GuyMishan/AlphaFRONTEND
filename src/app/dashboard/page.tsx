"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, CircleCheck, FilePenLine, FilePlus2, Search, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { alphaApi } from "@/lib/api";
import { resolveSingleEmployerScope } from "@/lib/access-scope";
import { getEmployerSelection, getOrganizationSelection, setEmployerSelection } from "@/lib/session";
import type { Employer } from "@/lib/types";

export default function DashboardPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [employerId, setEmployerId] = useState("");
  const [singleEmployerUser, setSingleEmployerUser] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEmployers(orgId: string, search = query) {
    if (!orgId) { setEmployers([]); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const result = await alphaApi.employerSearch(orgId, search.trim(), 0, 100);
      setEmployers(result.items);
      const saved = getEmployerSelection();
      const selected = saved?.organizationId === orgId && result.items.some((x) => x.id === saved.employerId) ? saved.employerId : result.items[0]?.id ?? "";
      setEmployerId(selected);
      if (selected) setEmployerSelection(orgId, selected);
    } catch (err) { setError(err instanceof Error ? err.message : "טעינת המעסיקים נכשלה"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const scoped = await resolveSingleEmployerScope();
        if (!active) return;
        if (scoped) {
          setSingleEmployerUser(true);
          setOrganizationId(scoped.organization.id);
          setEmployers([scoped.employer]);
          setEmployerId(scoped.employer.id);
          setLoading(false);
          return;
        }

        const orgId = getOrganizationSelection() ?? "";
        setOrganizationId(orgId);
        if (orgId) await loadEmployers(orgId, "");
        else setLoading(false);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "טעינת הנתונים נכשלה");
          setLoading(false);
        }
      }
    }
    void initialize();

    const handler = (event: Event) => {
      if (singleEmployerUser) return;
      const detail = (event as CustomEvent<{ organizationId: string }>).detail;
      setOrganizationId(detail.organizationId); setQuery(""); setEmployerId("");
      void loadEmployers(detail.organizationId, "");
    };
    window.addEventListener("alpha:scope-change", handler);
    return () => { active = false; window.removeEventListener("alpha:scope-change", handler); };
  }, [singleEmployerUser]);

  useEffect(() => {
    if (!organizationId || singleEmployerUser) return;
    const timer = window.setTimeout(() => void loadEmployers(organizationId, query), 300);
    return () => window.clearTimeout(timer);
  }, [query, organizationId, singleEmployerUser]);

  const selected = employers.find((x) => x.id === employerId);
  function chooseEmployer(id: string) { setEmployerId(id); setEmployerSelection(organizationId, id); }

  const quickActions = <aside className="card"><div className="card-head"><h2>פעולות מהירות</h2></div><div className="quick-actions"><Link className="quick-action" href="/reports/new"><span className="quick-action-icon"><FilePlus2 size={19} /></span><span><b>דיווח חודשי חדש</b><span>ידני או מקובץ Excel</span></span><ArrowLeft size={17} /></Link><Link className="quick-action" href="/reports/new?mode=correction"><span className="quick-action-icon"><FilePenLine size={19} /></span><span><b>תיקון דיווח</b><span>תיקון או דיווח הפרשים</span></span><ArrowLeft size={17} /></Link><Link className="quick-action" href="/employees"><span className="quick-action-icon"><Users size={19} /></span><span><b>רשימת עובדים</b><span>הנתונים נמשכים מה־API</span></span><ArrowLeft size={17} /></Link></div></aside>;

  return <AppShell title="מרכז התפעול">
    <div className="page-head"><div><h1>שלום, מתחילים לעבוד</h1><p>{singleEmployerUser ? "התחילו דיווח חודשי חדש." : "בחרו מעסיק והתחילו דיווח חודשי חדש."}</p></div><Link href="/reports/new" className={`btn btn-primary btn-lg${selected ? "" : " disabled"}`} aria-disabled={!selected}><FilePlus2 size={18} />דיווח חדש</Link></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}
    <section className="grid stats">
      {!singleEmployerUser ? <div className="stat-card"><div className="stat-top"><span>מעסיקים זמינים</span><span className="stat-icon"><Building2 size={18} /></span></div><div className="stat-value">{employers.length}</div></div> : null}
      <div className="stat-card"><div className="stat-top"><span>דיווחים החודש</span><span className="stat-icon"><CircleCheck size={18} /></span></div><div className="stat-value">—</div><span className="badge badge-gray">ממתין ל־Reporting API</span></div>
      <div className="stat-card"><div className="stat-top"><span>עובדים בדיווח</span><span className="stat-icon"><Users size={18} /></span></div><div className="stat-value">—</div><span className="badge badge-gray">לפי מעסיק</span></div>
      <div className="stat-card"><div className="stat-top"><span>שגיאות פתוחות</span><span className="stat-icon"><AlertTriangle size={18} /></span></div><div className="stat-value">—</div><span className="badge badge-gray">ממתין ל־Feedback API</span></div>
    </section>

    {singleEmployerUser ? (
      <section className="grid content-grid" style={{ gridTemplateColumns: "1fr" }}>{quickActions}</section>
    ) : (
      <section className="grid content-grid">
        <div className="card"><div className="card-head"><div><h2>בחירת מעסיק</h2><span style={{ color: "var(--muted)" }}>מוצגים רק מעסיקים שהמשתמש רשאי לגשת אליהם</span></div></div><div className="toolbar"><div className="search"><Search size={17} /><input placeholder="חיפוש לפי שם או ח.פ..." value={query} onChange={(e) => setQuery(e.target.value)} /></div></div>{loading ? <div className="empty">טוען נתונים מה־Backend...</div> : employers.length ? <div className="employer-list">{employers.map((employer) => <div key={employer.id} className={`employer${employer.id === employerId ? " active" : ""}`}><button className="employer-select" onClick={() => chooseEmployer(employer.id)}><span className="employer-logo">{employer.legalName.slice(0, 2)}</span><span className="employer-info"><b>{employer.legalName}</b><span>ח.פ. {employer.registrationNumber} · תיק ניכויים {employer.withholdingFileNumber}</span></span></button><Link className="btn btn-soft" href={`/employers/${employer.id}?organizationId=${organizationId}`}>לפרופיל</Link><span className={employer.status === 2 ? "badge badge-green" : "badge badge-orange"}>{employer.status === 2 ? "פעיל" : "בתהליך הקמה"}</span></div>)}</div> : <div className="empty"><Building2 size={34} /><div>לא נמצאו מעסיקים בארגון הזה.</div></div>}</div>
        {quickActions}
      </section>
    )}
  </AppShell>;
}
