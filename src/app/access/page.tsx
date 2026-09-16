"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, Save, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { VirtualizedTable } from "@/components/virtualized-table";
import { ReferenceOptionSelect } from "@/components/reference-option-select";
import { alphaApi } from "@/lib/api";
import { getOrganizationSelection } from "@/lib/session";
import { referenceOptionsApi, type ReferenceOption } from "@/lib/reference-options-api";
import type { AccessEmployer, AccessUser, EmployerAccessMode, EmployerOption, Organization, OrganizationRole, UserCandidate } from "@/lib/types";

const PAGE_SIZE = 50;
export default function AccessPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [selected, setSelected] = useState<AccessUser | null>(null);
  const [search, setSearch] = useState("");
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
  const [roleOptions, setRoleOptions] = useState<ReferenceOption[]>([]);
  const [accessModeOptions, setAccessModeOptions] = useState<ReferenceOption[]>([]);

  useEffect(() => {
    alphaApi.organizations().then((items) => {
      setOrganizations(items);
      const saved = getOrganizationSelection();
      setOrganizationId(saved && items.some((x) => x.id === saved) ? saved : items[0]?.id ?? "");
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת הארגונים נכשלה"));
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId: string }>).detail;
      setOrganizationId(detail.organizationId); setSelected(null); setSearch(""); setSkip(0);
    };
    window.addEventListener("alpha:scope-change", handler);
    return () => window.removeEventListener("alpha:scope-change", handler);
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      alphaApi.accessUsers(organizationId, search.trim(), skip, PAGE_SIZE)
        .then((result) => { setUsers(result.items); setHasMore(result.hasMore); setSelected((current) => current ? result.items.find((x) => x.userId === current.userId) ?? null : null); })
        .catch((err) => setError(err instanceof Error ? err.message : "אין לך הרשאה לנהל משתמשים בארגון הזה"))
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [organizationId, search, skip]);

  useEffect(() => { setSkip(0); }, [search]);

  useEffect(() => {
    Promise.all([referenceOptionsApi.list("organization-role"), referenceOptionsApi.list("employer-access-mode")])
      .then(([roles, modes]) => { setRoleOptions(roles); setAccessModeOptions(modes); })
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת ערכי ההרשאות נכשלה"));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setRole(selected.role); setAccessMode(selected.employerAccessMode); setAssignedSkip(0); setAssignedSearch(""); setEmployerSearch(""); setEmployerOptions([]);
  }, [selected]);

  useEffect(() => {
    if (!organizationId || !selected || accessMode !== 2) { setAssigned([]); setAssignedHasMore(false); return; }
    const timer = window.setTimeout(() => {
      alphaApi.assignedEmployers(organizationId, selected.userId, assignedSearch.trim(), assignedSkip, PAGE_SIZE)
        .then((result) => { setAssigned(result.items); setAssignedHasMore(result.hasMore); })
        .catch((err) => setError(err instanceof Error ? err.message : "טעינת המעסיקים המורשים נכשלה"));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [organizationId, selected, accessMode, assignedSearch, assignedSkip]);

  useEffect(() => {
    if (!organizationId || candidateSearch.trim().length < 2) { setCandidates([]); return; }
    const timer = window.setTimeout(() => alphaApi.accessUserCandidates(organizationId, candidateSearch.trim()).then(setCandidates).catch((err) => setError(err instanceof Error ? err.message : "חיפוש המשתמשים נכשל")), 300);
    return () => window.clearTimeout(timer);
  }, [organizationId, candidateSearch]);

  useEffect(() => {
    if (!organizationId || !selected || employerSearch.trim().length < 2) { setEmployerOptions([]); return; }
    const timer = window.setTimeout(() => alphaApi.employerAccessOptions(organizationId, selected.userId, employerSearch.trim()).then(setEmployerOptions).catch((err) => setError(err instanceof Error ? err.message : "חיפוש המעסיקים נכשל")), 300);
    return () => window.clearTimeout(timer);
  }, [organizationId, selected, employerSearch]);

  const capabilities = useMemo(() => ({ createEmployer: role === 1 && accessMode === 1, editEmployer: role !== 4, createEmployee: role !== 4, editEmployee: role !== 4 }), [role, accessMode]);

  async function saveAccess() { if (!selected) return; setSaving(true); setError(""); try { await alphaApi.updateAccessUser(organizationId, selected.userId, { role, employerAccessMode: accessMode }); setUsers((items) => items.map((x) => x.userId === selected.userId ? { ...x, role, employerAccessMode: accessMode } : x)); setSelected({ ...selected, role, employerAccessMode: accessMode }); } catch (err) { setError(err instanceof Error ? err.message : "שמירת ההרשאות נכשלה"); } finally { setSaving(false); } }
  async function removeUser() { if (!selected || !window.confirm(`להסיר את ${selected.displayName} מהארגון?`)) return; try { await alphaApi.removeAccessUser(organizationId, selected.userId); setSelected(null); setUsers((items) => items.filter((x) => x.userId !== selected.userId)); } catch (err) { setError(err instanceof Error ? err.message : "הסרת המשתמש נכשלה"); } }
  async function addUser() { if (!candidate) return; try { await alphaApi.addAccessUser(organizationId, { userId: candidate.id, role: newRole, employerAccessMode: newAccessMode }); setAdding(false); setCandidate(null); setCandidates([]); setCandidateSearch(""); setSkip(0); setSearch(""); } catch (err) { setError(err instanceof Error ? err.message : "הוספת המשתמש נכשלה"); } }
  async function grantEmployer(item: EmployerOption) { if (!selected) return; try { await alphaApi.grantEmployerAccess(organizationId, selected.userId, item.id); setEmployerOptions((items) => items.map((x) => x.id === item.id ? { ...x, assigned: true } : x)); const result = await alphaApi.assignedEmployers(organizationId, selected.userId, assignedSearch, assignedSkip, PAGE_SIZE); setAssigned(result.items); setAssignedHasMore(result.hasMore); } catch (err) { setError(err instanceof Error ? err.message : "הקצאת המעסיק נכשלה"); } }
  async function revokeEmployer(employerId: string) { if (!selected) return; try { await alphaApi.revokeEmployerAccess(organizationId, selected.userId, employerId); setAssigned((items) => items.filter((x) => x.id !== employerId)); setEmployerOptions((items) => items.map((x) => x.id === employerId ? { ...x, assigned: false } : x)); } catch (err) { setError(err instanceof Error ? err.message : "הסרת המעסיק נכשלה"); } }

  return <AppShell title="משתמשים והרשאות">
    <div className="page-head"><div><h1>משתמשים והרשאות</h1><p>ניהול גישה לפי ארגון ומעסיקים, עם חיפוש שרת ורשימות וירטואליות.</p></div><button className="btn btn-primary" onClick={() => setAdding((value) => !value)}><UserPlus size={18} />הוספת משתמש</button></div>
    {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}

    {adding ? <section className="card" style={{ marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>הוספת משתמש לארגון</h2><div className="toolbar"><div className="search"><Search size={17} /><input value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} placeholder="לפחות 2 תווים בשם או באימייל" /></div></div>{candidates.length ? <VirtualizedTable items={candidates} maxHeight={260} rowHeight={52} rowKey={(item) => item.id} onRowClick={setCandidate} columns={[{ key: "name", label: "משתמש" }, { key: "email", label: "אימייל" }, { key: "selected", label: "" }]} renderCells={(item) => [<b>{item.displayName}</b>, item.email, candidate?.id === item.id ? <span className="badge badge-blue">נבחר</span> : null]} /> : null}{candidate ? <div className="grid two-cols" style={{ marginTop: 18 }}><div className="field"><label>תפקיד</label><ReferenceOptionSelect category="organization-role" value={newRole} onChange={(value) => setNewRole(Number(value) as OrganizationRole)} /></div><div className="field"><label>גישה למעסיקים</label><ReferenceOptionSelect category="employer-access-mode" value={newAccessMode} onChange={(value) => setNewAccessMode(Number(value) as EmployerAccessMode)} /></div><div className="form-actions"><button className="btn btn-primary" onClick={addUser} type="button"><Plus size={18} />הוספה לארגון</button></div></div> : null}</section> : null}

    <section className="card" style={{ marginBottom: 18 }}><div className="toolbar"><div className="search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש משתמש לפי שם או אימייל" /></div><span className="badge badge-blue">{organizations.find((x) => x.id === organizationId)?.name ?? "ארגון"}</span></div>{loading ? <div className="empty">טוען משתמשים...</div> : users.length ? <VirtualizedTable items={users} rowKey={(item) => item.userId} onRowClick={setSelected} columns={[{ key: "user", label: "משתמש" }, { key: "email", label: "אימייל" }, { key: "role", label: "תפקיד" }, { key: "access", label: "גישה למעסיקים" }]} renderCells={(item) => [<b>{item.displayName}</b>, item.email, roleOptions.find((option) => Number(option.value) === item.role)?.label ?? String(item.role), accessModeOptions.find((option) => Number(option.value) === item.employerAccessMode)?.label ?? String(item.employerAccessMode)]} /> : <div className="empty"><ShieldCheck size={34} /><div>לא נמצאו משתמשים.</div></div>}<div className="form-actions" style={{ marginTop: 14 }}><button className="btn btn-secondary" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}>הקודם</button><button className="btn btn-secondary" disabled={!hasMore} onClick={() => setSkip(skip + PAGE_SIZE)}>הבא</button></div></section>

    {selected ? <section className="card"><div className="page-head" style={{ marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>{selected.displayName}</h2><p>{selected.email}</p></div><button className="btn btn-secondary" onClick={removeUser}><Trash2 size={17} />הסרת גישה</button></div><div className="grid two-cols"><div className="field"><label>תפקיד בארגון</label><ReferenceOptionSelect category="organization-role" value={role} onChange={(value) => setRole(Number(value) as OrganizationRole)} /></div><div className="field"><label>גישה למעסיקים</label><ReferenceOptionSelect category="employer-access-mode" value={accessMode} onChange={(value) => setAccessMode(Number(value) as EmployerAccessMode)} /></div></div><div className="grid two-cols" style={{ marginTop: 16 }}><div className="notice notice-info"><b>הרשאות בפועל</b><div style={{ marginTop: 8 }}>הקמת מעסיק: {capabilities.createEmployer ? "כן" : "לא"}</div><div>עריכת מעסיק: {capabilities.editEmployer ? "כן" : "לא"}</div><div>הקמת עובד: {capabilities.createEmployee ? "כן" : "לא"}</div><div>עריכת עובד: {capabilities.editEmployee ? "כן" : "לא"}</div>{accessMode === 2 && role !== 4 ? <div style={{ marginTop: 6 }}>הפעולות מותרות רק במעסיקים שהוקצו למשתמש.</div> : null}</div><div className="form-actions" style={{ alignItems: "flex-end" }}><button className="btn btn-primary" disabled={saving} onClick={saveAccess}><Save size={18} />{saving ? "שומר..." : "שמירת הרשאות"}</button></div></div>
    {accessMode === 2 ? <div style={{ marginTop: 24 }}><h3>מעסיקים מורשים</h3><div className="grid two-cols"><div><div className="toolbar"><div className="search"><Search size={16} /><input value={assignedSearch} onChange={(e) => { setAssignedSearch(e.target.value); setAssignedSkip(0); }} placeholder="חיפוש במעסיקים שהוקצו" /></div></div>{assigned.length ? <VirtualizedTable items={assigned} maxHeight={340} rowHeight={54} rowKey={(item) => item.id} columns={[{ key: "name", label: "מעסיק" }, { key: "reg", label: "ח.פ." }, { key: "action", label: "" }]} renderCells={(item) => [<span><Building2 size={16} /> {item.legalName}</span>, item.registrationNumber, <button className="btn btn-secondary" onClick={() => revokeEmployer(item.id)}>הסר</button>]} /> : <div className="empty">לא הוקצו מעסיקים למשתמש.</div>}<div className="form-actions"><button className="btn btn-secondary" disabled={assignedSkip === 0} onClick={() => setAssignedSkip(Math.max(0, assignedSkip - PAGE_SIZE))}>הקודם</button><button className="btn btn-secondary" disabled={!assignedHasMore} onClick={() => setAssignedSkip(assignedSkip + PAGE_SIZE)}>הבא</button></div></div><div><div className="toolbar"><div className="search"><Search size={16} /><input value={employerSearch} onChange={(e) => setEmployerSearch(e.target.value)} placeholder="חיפוש מעסיק להקצאה — לפחות 2 תווים" /></div></div>{employerOptions.length ? <VirtualizedTable items={employerOptions} maxHeight={340} rowHeight={58} rowKey={(item) => item.id} columns={[{ key: "name", label: "מעסיק" }, { key: "action", label: "" }]} renderCells={(item) => [<span><b>{item.legalName}</b><div style={{ color: "var(--muted)" }}>{item.registrationNumber}</div></span>, item.assigned ? <span className="badge badge-green">מוקצה</span> : <button className="btn btn-primary" onClick={() => grantEmployer(item)}>הקצה</button>]} /> : employerSearch.trim().length >= 2 ? <div className="empty">לא נמצאו מעסיקים.</div> : null}</div></div></div> : null}</section> : null}
  </AppShell>;
}
