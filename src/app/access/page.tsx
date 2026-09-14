"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, Plus, Save, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { alphaApi } from "@/lib/api";
import { getOrganizationSelection } from "@/lib/session";
import type {
  AccessEmployer,
  AccessUser,
  EmployerAccessMode,
  EmployerOption,
  Organization,
  OrganizationRole,
  UserCandidate,
} from "@/lib/types";

const PAGE_SIZE = 30;
const roleNames: Record<OrganizationRole, string> = {
  1: "מנהל ארגון",
  2: "מנהל שכר",
  3: "נציג תפעול",
  4: "צפייה בלבד",
};

export default function AccessPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [selected, setSelected] = useState<AccessUser | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [role, setRole] = useState<OrganizationRole>(4);
  const [accessMode, setAccessMode] = useState<EmployerAccessMode>(2);
  const [saving, setSaving] = useState(false);

  const [assigned, setAssigned] = useState<AccessEmployer[]>([]);
  const [assignedSearch, setAssignedSearch] = useState("");
  const [assignedSkip, setAssignedSkip] = useState(0);
  const [assignedHasMore, setAssignedHasMore] = useState(false);
  const [employerSearch, setEmployerSearch] = useState("");
  const [employerOptions, setEmployerOptions] = useState<EmployerOption[]>([]);

  const [adding, setAdding] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidates, setCandidates] = useState<UserCandidate[]>([]);
  const [candidate, setCandidate] = useState<UserCandidate | null>(null);
  const [newRole, setNewRole] = useState<OrganizationRole>(4);
  const [newAccessMode, setNewAccessMode] = useState<EmployerAccessMode>(2);

  useEffect(() => {
    alphaApi.organizations().then((items) => {
      setOrganizations(items);
      const saved = getOrganizationSelection();
      const id = saved && items.some((x) => x.id === saved) ? saved : items[0]?.id ?? "";
      setOrganizationId(id);
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת הארגונים נכשלה"));
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    setError("");
    alphaApi.accessUsers(organizationId, appliedSearch, skip, PAGE_SIZE)
      .then((result) => {
        setUsers(result.items);
        setHasMore(result.hasMore);
        setSelected((current) => current ? result.items.find((x) => x.userId === current.userId) ?? null : null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "אין לך הרשאה לנהל משתמשים בארגון הזה"))
      .finally(() => setLoading(false));
  }, [organizationId, appliedSearch, skip]);

  useEffect(() => {
    if (!selected) return;
    setRole(selected.role);
    setAccessMode(selected.employerAccessMode);
    setAssignedSkip(0);
    setAssignedSearch("");
    setEmployerSearch("");
    setEmployerOptions([]);
  }, [selected]);

  useEffect(() => {
    if (!organizationId || !selected || accessMode !== 2) {
      setAssigned([]);
      setAssignedHasMore(false);
      return;
    }
    alphaApi.assignedEmployers(organizationId, selected.userId, assignedSearch, assignedSkip, PAGE_SIZE)
      .then((result) => { setAssigned(result.items); setAssignedHasMore(result.hasMore); })
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת המעסיקים המורשים נכשלה"));
  }, [organizationId, selected, accessMode, assignedSearch, assignedSkip]);

  const capabilities = useMemo(() => ({
    createEmployer: role === 1 && accessMode === 1,
    editEmployer: role !== 4,
    createEmployee: role !== 4,
    editEmployee: role !== 4,
  }), [role, accessMode]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSkip(0);
    setAppliedSearch(search.trim());
  }

  async function saveAccess() {
    if (!selected) return;
    setSaving(true); setError("");
    try {
      await alphaApi.updateAccessUser(organizationId, selected.userId, { role, employerAccessMode: accessMode });
      setUsers((items) => items.map((x) => x.userId === selected.userId ? { ...x, role, employerAccessMode: accessMode } : x));
      setSelected({ ...selected, role, employerAccessMode: accessMode });
    } catch (err) { setError(err instanceof Error ? err.message : "שמירת ההרשאות נכשלה"); }
    finally { setSaving(false); }
  }

  async function removeUser() {
    if (!selected || !window.confirm(`להסיר את ${selected.displayName} מהארגון?`)) return;
    try {
      await alphaApi.removeAccessUser(organizationId, selected.userId);
      setSelected(null);
      setUsers((items) => items.filter((x) => x.userId !== selected.userId));
    } catch (err) { setError(err instanceof Error ? err.message : "הסרת המשתמש נכשלה"); }
  }

  async function findCandidates(event: FormEvent) {
    event.preventDefault();
    if (candidateSearch.trim().length < 2) { setCandidates([]); return; }
    try { setCandidates(await alphaApi.accessUserCandidates(organizationId, candidateSearch.trim())); }
    catch (err) { setError(err instanceof Error ? err.message : "חיפוש המשתמשים נכשל"); }
  }

  async function addUser() {
    if (!candidate) return;
    try {
      await alphaApi.addAccessUser(organizationId, { userId: candidate.id, role: newRole, employerAccessMode: newAccessMode });
      setAdding(false); setCandidate(null); setCandidates([]); setCandidateSearch("");
      setSkip(0); setAppliedSearch(""); setSearch("");
      const result = await alphaApi.accessUsers(organizationId, "", 0, PAGE_SIZE);
      setUsers(result.items); setHasMore(result.hasMore);
    } catch (err) { setError(err instanceof Error ? err.message : "הוספת המשתמש נכשלה"); }
  }

  async function findEmployers(event: FormEvent) {
    event.preventDefault();
    if (!selected || employerSearch.trim().length < 2) { setEmployerOptions([]); return; }
    try { setEmployerOptions(await alphaApi.employerAccessOptions(organizationId, selected.userId, employerSearch.trim())); }
    catch (err) { setError(err instanceof Error ? err.message : "חיפוש המעסיקים נכשל"); }
  }

  async function grantEmployer(item: EmployerOption) {
    if (!selected) return;
    try {
      await alphaApi.grantEmployerAccess(organizationId, selected.userId, item.id);
      setEmployerOptions((items) => items.map((x) => x.id === item.id ? { ...x, assigned: true } : x));
      const result = await alphaApi.assignedEmployers(organizationId, selected.userId, assignedSearch, assignedSkip, PAGE_SIZE);
      setAssigned(result.items); setAssignedHasMore(result.hasMore);
    } catch (err) { setError(err instanceof Error ? err.message : "הקצאת המעסיק נכשלה"); }
  }

  async function revokeEmployer(employerId: string) {
    if (!selected) return;
    try {
      await alphaApi.revokeEmployerAccess(organizationId, selected.userId, employerId);
      setAssigned((items) => items.filter((x) => x.id !== employerId));
      setEmployerOptions((items) => items.map((x) => x.id === employerId ? { ...x, assigned: false } : x));
    } catch (err) { setError(err instanceof Error ? err.message : "הסרת המעסיק נכשלה"); }
  }

  return <AppShell title="משתמשים והרשאות">
    <div className="page-head">
      <div><h1>משתמשים והרשאות</h1><p>ניהול גישה לפי ארגון ומעסיקים, ללא טעינת רשימות ענק לזיכרון.</p></div>
      <button className="btn btn-primary" onClick={() => setAdding((value) => !value)}><UserPlus size={18} />הוספת משתמש</button>
    </div>

    {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}

    {adding ? <section className="card" style={{ marginBottom: 18 }}>
      <h2 style={{ marginTop: 0 }}>הוספת משתמש לארגון</h2>
      <form className="toolbar" onSubmit={findCandidates}>
        <div className="search"><Search size={17} /><input value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} placeholder="לפחות 2 תווים בשם או באימייל" /></div>
        <button className="btn btn-secondary">חיפוש</button>
      </form>
      {candidates.length ? <div className="table-wrap" style={{ marginTop: 12 }}><table><tbody>{candidates.map((item) => <tr key={item.id} onClick={() => setCandidate(item)} style={{ cursor: "pointer" }}><td><b>{item.displayName}</b></td><td>{item.email}</td><td>{candidate?.id === item.id ? <span className="badge badge-blue">נבחר</span> : null}</td></tr>)}</tbody></table></div> : null}
      {candidate ? <div className="grid two-cols" style={{ marginTop: 18 }}>
        <div className="field"><label>תפקיד</label><select value={newRole} onChange={(e) => setNewRole(Number(e.target.value) as OrganizationRole)}>{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="field"><label>גישה למעסיקים</label><select value={newAccessMode} onChange={(e) => setNewAccessMode(Number(e.target.value) as EmployerAccessMode)}><option value={1}>כל המעסיקים בארגון</option><option value={2}>מעסיקים מסוימים בלבד</option></select></div>
        <div className="form-actions"><button className="btn btn-primary" onClick={addUser} type="button"><Plus size={18} />הוספה לארגון</button></div>
      </div> : null}
    </section> : null}

    <section className="card" style={{ marginBottom: 18 }}>
      <div className="toolbar">
        <form className="search" onSubmit={submitSearch}><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש משתמש לפי שם או אימייל" /></form>
        <span className="badge badge-blue">{organizations.find((x) => x.id === organizationId)?.name ?? "ארגון"}</span>
      </div>
      {loading ? <div className="empty">טוען משתמשים...</div> : users.length ? <div className="table-wrap"><table><thead><tr><th>משתמש</th><th>אימייל</th><th>תפקיד</th><th>גישה למעסיקים</th></tr></thead><tbody>{users.map((item) => <tr key={item.userId} onClick={() => setSelected(item)} style={{ cursor: "pointer" }}><td><b>{item.displayName}</b></td><td>{item.email}</td><td>{roleNames[item.role]}</td><td>{item.employerAccessMode === 1 ? "כל המעסיקים" : "מעסיקים מסוימים"}</td></tr>)}</tbody></table></div> : <div className="empty"><ShieldCheck size={34} /><div>לא נמצאו משתמשים.</div></div>}
      <div className="form-actions" style={{ marginTop: 14 }}><button className="btn btn-secondary" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}>הקודם</button><button className="btn btn-secondary" disabled={!hasMore} onClick={() => setSkip(skip + PAGE_SIZE)}>הבא</button></div>
    </section>

    {selected ? <section className="card">
      <div className="page-head" style={{ marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>{selected.displayName}</h2><p>{selected.email}</p></div><button className="btn btn-secondary" onClick={removeUser}><Trash2 size={17} />הסרת גישה</button></div>
      <div className="grid two-cols">
        <div className="field"><label>תפקיד בארגון</label><select value={role} onChange={(e) => setRole(Number(e.target.value) as OrganizationRole)}>{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="field"><label>גישה למעסיקים</label><select value={accessMode} onChange={(e) => setAccessMode(Number(e.target.value) as EmployerAccessMode)}><option value={1}>כל המעסיקים בארגון</option><option value={2}>מעסיקים מסוימים בלבד</option></select></div>
      </div>

      <div className="grid two-cols" style={{ marginTop: 16 }}>
        <div className="notice notice-info"><b>הרשאות בפועל</b><div style={{ marginTop: 8 }}>הקמת מעסיק: {capabilities.createEmployer ? "כן" : "לא"}</div><div>עריכת מעסיק: {capabilities.editEmployer ? "כן" : "לא"}</div><div>הקמת עובד: {capabilities.createEmployee ? "כן" : "לא"}</div><div>עריכת עובד: {capabilities.editEmployee ? "כן" : "לא"}</div>{accessMode === 2 && role !== 4 ? <div style={{ marginTop: 6 }}>הפעולות מותרות רק במעסיקים שהוקצו למשתמש.</div> : null}</div>
        <div className="form-actions" style={{ alignItems: "flex-end" }}><button className="btn btn-primary" disabled={saving} onClick={saveAccess}><Save size={18} />{saving ? "שומר..." : "שמירת הרשאות"}</button></div>
      </div>

      {accessMode === 2 ? <div style={{ marginTop: 24 }}>
        <h3>מעסיקים מורשים</h3>
        <div className="grid two-cols">
          <div>
            <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setAssignedSkip(0); setAssignedSearch((e.currentTarget.elements.namedItem("assignedSearch") as HTMLInputElement).value.trim()); }}><div className="search"><Search size={16} /><input name="assignedSearch" defaultValue={assignedSearch} placeholder="סינון המעסיקים שכבר הוקצו" /></div><button className="btn btn-secondary">סינון</button></form>
            <div className="table-wrap" style={{ marginTop: 10 }}><table><tbody>{assigned.map((item) => <tr key={item.id}><td><Building2 size={16} /> {item.legalName}</td><td>{item.registrationNumber}</td><td><button className="btn btn-secondary" onClick={() => revokeEmployer(item.id)}>הסר</button></td></tr>)}</tbody></table></div>
            {!assigned.length ? <div className="empty">לא הוקצו מעסיקים למשתמש.</div> : null}
            <div className="form-actions"><button className="btn btn-secondary" disabled={assignedSkip === 0} onClick={() => setAssignedSkip(Math.max(0, assignedSkip - PAGE_SIZE))}>הקודם</button><button className="btn btn-secondary" disabled={!assignedHasMore} onClick={() => setAssignedSkip(assignedSkip + PAGE_SIZE)}>הבא</button></div>
          </div>
          <div>
            <form className="toolbar" onSubmit={findEmployers}><div className="search"><Search size={16} /><input value={employerSearch} onChange={(e) => setEmployerSearch(e.target.value)} placeholder="חיפוש מעסיק להקצאה — לפחות 2 תווים" /></div><button className="btn btn-secondary">חיפוש</button></form>
            <div className="table-wrap" style={{ marginTop: 10 }}><table><tbody>{employerOptions.map((item) => <tr key={item.id}><td><b>{item.legalName}</b><div style={{ color: "var(--muted)" }}>{item.registrationNumber}</div></td><td>{item.assigned ? <span className="badge badge-green">מוקצה</span> : <button className="btn btn-primary" onClick={() => grantEmployer(item)}>הקצה</button>}</td></tr>)}</tbody></table></div>
            {employerSearch.length >= 2 && !employerOptions.length ? <div className="empty">לא נמצאו מעסיקים.</div> : null}
          </div>
        </div>
      </div> : null}
    </section> : null}
  </AppShell>;
}
