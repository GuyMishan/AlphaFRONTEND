"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Building2, CircleCheck, FilePenLine, FilePlus2, Search, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { alphaApi } from "@/lib/api";
import { getEmployerSelection, setEmployerSelection } from "@/lib/session";
import type { Employer, Organization } from "@/lib/types";

export default function DashboardPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [employerId, setEmployerId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    alphaApi.organizations().then((items) => {
      setOrganizations(items);
      const saved = getEmployerSelection();
      setOrganizationId(saved?.organizationId && items.some((x) => x.id === saved.organizationId) ? saved.organizationId : items[0]?.id ?? "");
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת הארגונים נכשלה")).finally(() => setLoading(false));
  }, []);

  const loadEmployers = useCallback(async (orgId: string) => {
    if (!orgId) return;
    setLoading(true);
    try {
      const items = await alphaApi.employers(orgId);
      setEmployers(items);
      const saved = getEmployerSelection();
      const selected = saved?.organizationId === orgId && items.some((x) => x.id === saved.employerId) ? saved.employerId : items[0]?.id ?? "";
      setEmployerId(selected);
      if (selected) setEmployerSelection(orgId, selected);
    } catch (err) { setError(err instanceof Error ? err.message : "טעינת המעסיקים נכשלה"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadEmployers(organizationId); }, [organizationId, loadEmployers]);

  const filtered = useMemo(() => employers.filter((x) => `${x.legalName} ${x.registrationNumber}`.toLowerCase().includes(query.toLowerCase())), [employers, query]);
  const selected = employers.find((x) => x.id === employerId);

  function chooseEmployer(id: string) {
    setEmployerId(id);
    setEmployerSelection(organizationId, id);
  }

  return (
    <AppShell title="מרכז התפעול">
      <div className="page-head">
        <div><h1>שלום, מתחילים לעבוד</h1><p>בחרו מעסיק והתחילו דיווח חודשי חדש.</p></div>
        <Link href="/reports/new" className={`btn btn-primary btn-lg${selected ? "" : " disabled"}`} aria-disabled={!selected}><FilePlus2 size={18} />דיווח חדש</Link>
      </div>
      {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}
      <section className="grid stats">
        <div className="stat-card"><div className="stat-top"><span>מעסיקים זמינים</span><span className="stat-icon"><Building2 size={18} /></span></div><div className="stat-value">{employers.length}</div></div>
        <div className="stat-card"><div className="stat-top"><span>דיווחים החודש</span><span className="stat-icon"><CircleCheck size={18} /></span></div><div className="stat-value">—</div><span className="badge badge-gray">ממתין ל־Reporting API</span></div>
        <div className="stat-card"><div className="stat-top"><span>עובדים בדיווח</span><span className="stat-icon"><Users size={18} /></span></div><div className="stat-value">—</div><span className="badge badge-gray">לפי מעסיק</span></div>
        <div className="stat-card"><div className="stat-top"><span>שגיאות פתוחות</span><span className="stat-icon"><AlertTriangle size={18} /></span></div><div className="stat-value">—</div><span className="badge badge-gray">ממתין ל־Feedback API</span></div>
      </section>

      <section className="grid content-grid">
        <div className="card">
          <div className="card-head"><div><h2>בחירת מעסיק</h2><span style={{ color: "var(--muted)" }}>מוצגים רק מעסיקים שהמשתמש רשאי לגשת אליהם</span></div></div>
          <div className="toolbar">
            <div className="field" style={{ minWidth: 220 }}><select aria-label="בחירת ארגון" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></div>
            <div className="search"><Search size={17} /><input placeholder="חיפוש לפי שם או ח.פ..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          </div>
          {loading ? <div className="empty">טוען נתונים מה־Backend...</div> : filtered.length ? (
            <div className="employer-list">{filtered.map((employer) => <button key={employer.id} className={`employer${employer.id === employerId ? " active" : ""}`} onClick={() => chooseEmployer(employer.id)}><span className="employer-logo">{employer.legalName.slice(0, 2)}</span><span className="employer-info"><b>{employer.legalName}</b><span>ח.פ. {employer.registrationNumber} · תיק ניכויים {employer.withholdingFileNumber}</span></span><span className={employer.status === 2 ? "badge badge-green" : "badge badge-orange"}>{employer.status === 2 ? "פעיל" : "בתהליך הקמה"}</span></button>)}</div>
          ) : <div className="empty"><Building2 size={34} /><div>לא נמצאו מעסיקים בארגון הזה.</div></div>}
        </div>
        <aside className="card">
          <div className="card-head"><h2>פעולות מהירות</h2></div>
          <div className="quick-actions">
            <Link className="quick-action" href="/reports/new"><span className="quick-action-icon"><FilePlus2 size={19} /></span><span><b>דיווח חודשי חדש</b><span>ידני או מקובץ Excel</span></span><ArrowLeft size={17} /></Link>
            <Link className="quick-action" href="/reports/new?mode=correction"><span className="quick-action-icon"><FilePenLine size={19} /></span><span><b>תיקון דיווח</b><span>תיקון או דיווח הפרשים</span></span><ArrowLeft size={17} /></Link>
            <Link className="quick-action" href="/employees"><span className="quick-action-icon"><Users size={19} /></span><span><b>רשימת עובדים</b><span>הנתונים נמשכים מה־API</span></span><ArrowLeft size={17} /></Link>
          </div>
          {selected ? <div className="notice notice-info" style={{ marginTop: 18 }}><b>המעסיק הפעיל:</b><br />{selected.legalName}</div> : null}
        </aside>
      </section>
    </AppShell>
  );
}
