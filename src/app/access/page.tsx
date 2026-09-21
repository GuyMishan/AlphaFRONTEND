"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Mail, Plus, Save, Search, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { VirtualizedTable } from "@/components/virtualized-table";
import { ReferenceOptionSelect } from "@/components/reference-option-select";
import { PlanUsage } from "@/components/plan-usage";
import { alphaApi } from "@/lib/api";
import { getOrganizationSelection } from "@/lib/session";
import { openUpgradeDialog } from "@/lib/upgrade";
import { referenceOptionsApi, type ReferenceOption } from "@/lib/reference-options-api";
import type { AccessEmployer, AccessUser, Employer, EmployerAccessMode, EmployerOption, EmployerRole, EntitlementSnapshot, Organization, OrganizationRole, UserCandidate, UserInvitation } from "@/lib/types";
import { UiInput, UiSelect, UiTextarea } from "@/components/ui-controls";

const PAGE_SIZE = 50;
const employerRoleLabels: Record<EmployerRole, string> = {
  1: "בעלים",
  2: "מנהל",
  3: "משתמש",
  4: "צפייה בלבד",
};
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
  const [entitlements, setEntitlements] = useState<EntitlementSnapshot | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteScope, setInviteScope] = useState<"organization" | "employer">("organization");
  const [inviteOrganizationRole, setInviteOrganizationRole] = useState<OrganizationRole>(4);
  const [inviteEmployerRole, setInviteEmployerRole] = useState<EmployerRole>(3);
  const [inviteEmployerId, setInviteEmployerId] = useState("");
  const [inviteEmployers, setInviteEmployers] = useState<Employer[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [inviting, setInviting] = useState(false);

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
    void Promise.all([
      alphaApi.entitlements(organizationId),
      alphaApi.invitations(organizationId),
      alphaApi.employers(organizationId),
    ]).then(([usage, inviteRows, employerRows]) => {
      setEntitlements(usage);
      setInvitations(inviteRows);
      setInviteEmployers(employerRows);
      setInviteEmployerId((current) => current && employerRows.some((x) => x.id === current) ? current : employerRows[0]?.id ?? "");
    }).catch(() => {
      setEntitlements(null);
      setInvitations([]);
      setInviteEmployers([]);
    });
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
  async function addUser() { if (!candidate) return; try { await alphaApi.addAccessUser(organizationId, { userId: candidate.id, role: newRole, employerAccessMode: newAccessMode }); setAdding(false); setCandidate(null); setCandidates([]); setCandidateSearch(""); setSkip(0); setSearch(""); setEntitlements(await alphaApi.entitlements(organizationId)); } catch (err) { setError(err instanceof Error ? err.message : "הוספת המשתמש נכשלה"); } }

  async function createInvitation() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) { setError("יש להזין כתובת אימייל תקינה."); return; }
    if (inviteScope === "employer" && !inviteEmployerId) { setError("יש לבחור מעסיק להזמנה."); return; }
    setInviting(true); setError("");
    try {
      await alphaApi.createInvitation(organizationId, inviteScope === "organization"
        ? { email, organizationRole: inviteOrganizationRole, expiresInDays: 7 }
        : { email, employerId: inviteEmployerId, employerRole: inviteEmployerRole, expiresInDays: 7 });
      setInvitations(await alphaApi.invitations(organizationId));
      setInviteEmail("");
      setInviteOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "שליחת ההזמנה נכשלה";
      setError(message === "user_exists_use_existing_access" ? "המשתמש כבר קיים במערכת. השתמשו ב'הוספת משתמש קיים'." : message === "invitation_already_pending" ? "כבר קיימת הזמנה פעילה לאימייל הזה." : message);
    } finally { setInviting(false); }
  }

  async function cancelInvitation(invitationId: string) {
    try {
      await alphaApi.cancelInvitation(organizationId, invitationId);
      setInvitations(await alphaApi.invitations(organizationId));
    } catch (err) { setError(err instanceof Error ? err.message : "ביטול ההזמנה נכשל"); }
  }
  async function grantEmployer(item: EmployerOption) { if (!selected) return; try { await alphaApi.grantEmployerAccess(organizationId, selected.userId, item.id); setEmployerOptions((items) => items.map((x) => x.id === item.id ? { ...x, assigned: true } : x)); const result = await alphaApi.assignedEmployers(organizationId, selected.userId, assignedSearch, assignedSkip, PAGE_SIZE); setAssigned(result.items); setAssignedHasMore(result.hasMore); } catch (err) { setError(err instanceof Error ? err.message : "הקצאת המעסיק נכשלה"); } }
  async function updateEmployerRole(employerId: string, nextRole: EmployerRole) { if (!selected) return; try { await alphaApi.updateEmployerAccessRole(organizationId, selected.userId, employerId, nextRole); setAssigned((items) => items.map((x) => x.id === employerId ? { ...x, role: nextRole } : x)); } catch (err) { setError(err instanceof Error ? err.message : "עדכון תפקיד המעסיק נכשל"); } }
  async function revokeEmployer(employerId: string) { if (!selected) return; try { await alphaApi.revokeEmployerAccess(organizationId, selected.userId, employerId); setAssigned((items) => items.filter((x) => x.id !== employerId)); setEmployerOptions((items) => items.map((x) => x.id === employerId ? { ...x, assigned: false } : x)); } catch (err) { setError(err instanceof Error ? err.message : "הסרת המעסיק נכשלה"); } }

  return <AppShell title="משתמשים והרשאות">
    <div className="page-head"><div><h1>משתמשים והרשאות</h1><p>ניהול גישה לפי ארגון ומעסיקים, עם הזמנות מאובטחות למשתמשים חדשים.</p></div><div className="form-actions" style={{ margin: 0 }}>
      <button className="btn btn-secondary" onClick={() => setAdding((value) => !value)}><UserPlus size={18} />הוספת משתמש קיים</button>
      <button className="btn btn-primary" onClick={() => {
        if (entitlements && entitlements.users.current >= entitlements.users.maximum) {
          openUpgradeDialog({ reason: "users", planName: entitlements.plan.name, current: entitlements.users.current, maximum: entitlements.users.maximum });
          return;
        }
        setInviteOpen((value) => !value);
      }}><Mail size={18} />הזמנת משתמש</button>
    </div></div>
    {entitlements ? <section className="card" style={{ marginBottom: 18 }}><div className="card-head" style={{ marginBottom: 10 }}><div><h3>שימוש במסלול {entitlements.plan.name}</h3></div></div><PlanUsage label="משתמשים" usage={entitlements.users} /></section> : null}
    {entitlements && entitlements.users.current >= entitlements.users.maximum ? <div className="notice notice-info" style={{ marginBottom: 18 }}><b>הגעתם למגבלת המשתמשים במסלול.</b><div style={{ marginTop: 10 }}><button className="btn btn-primary" type="button" onClick={() => openUpgradeDialog({ reason: "users", planName: entitlements.plan.name, current: entitlements.users.current, maximum: entitlements.users.maximum })}>יצירת קשר לשדרוג</button></div></div> : null}
    {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}

    {inviteOpen ? <section className="card" style={{ marginBottom: 18 }}>
      <div className="card-head"><div><h2>הזמנת משתמש חדש</h2><span style={{ color: "var(--muted)" }}>יישלח מייל עם קישור אישי. הגישה תיווצר רק אחרי הרשמה ואימות OTP.</span></div><button className="btn btn-secondary" type="button" onClick={() => setInviteOpen(false)}><X size={16} />סגירה</button></div>
      <div className="field"><label>אימייל</label><UiInput type="email" dir="ltr" maxLength={320} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@example.com" /></div>
      <div className="grid two-cols" style={{ marginTop: 16 }}>
        <button type="button" className={`choice-card${inviteScope === "organization" ? " selected" : ""}`} onClick={() => setInviteScope("organization")}><ShieldCheck size={22} /><b>גישה לארגון</b><p>המשתמש יקבל Role ארגוני וגישה לכל המעסיקים.</p></button>
        <button type="button" className={`choice-card${inviteScope === "employer" ? " selected" : ""}`} onClick={() => setInviteScope("employer")}><Building2 size={22} /><b>גישה למעסיק</b><p>המשתמש יקבל גישה ישירה למעסיק אחד בלבד.</p></button>
      </div>
      {inviteScope === "organization" ? <div className="field" style={{ marginTop: 16 }}><label>תפקיד בארגון</label><ReferenceOptionSelect category="organization-role" value={inviteOrganizationRole} onChange={(value) => setInviteOrganizationRole(Number(value) as OrganizationRole)} /></div> :
        <div className="grid two-cols" style={{ marginTop: 16 }}>
          <div className="field"><label>מעסיק</label><UiSelect value={inviteEmployerId} onChange={(e) => setInviteEmployerId(e.target.value)}>{inviteEmployers.map((item) => <option key={item.id} value={item.id}>{item.legalName}</option>)}</UiSelect></div>
          <div className="field"><label>תפקיד אצל המעסיק</label><UiSelect value={inviteEmployerRole} onChange={(e) => setInviteEmployerRole(Number(e.target.value) as EmployerRole)}>{(Object.keys(employerRoleLabels) as unknown as EmployerRole[]).map((value) => <option key={value} value={value}>{employerRoleLabels[value]}</option>)}</UiSelect></div>
        </div>}
      <div className="form-actions"><span /><button className="btn btn-primary" type="button" disabled={inviting} onClick={() => void createInvitation()}><Mail size={17} />{inviting ? "שולח..." : "שליחת הזמנה"}</button></div>
    </section> : null}

    {invitations.length ? <section className="card" style={{ marginBottom: 18 }}>
      <div className="card-head"><div><h2>הזמנות</h2><span style={{ color: "var(--muted)" }}>הזמנות חד־פעמיות שנשלחו מהארגון.</span></div></div>
      <div className="table-wrap"><table><thead><tr><th>אימייל</th><th>גישה</th><th>סטטוס</th><th>תוקף</th><th /></tr></thead><tbody>
        {invitations.map((item) => <tr key={item.id}><td><b>{item.email}</b></td><td>{item.employerName ?? "כל הארגון"}</td><td>{invitationStatusLabel(item.status)}</td><td>{new Date(item.expiresAt).toLocaleDateString("he-IL")}</td><td>{item.status === 1 ? <button className="btn btn-secondary" type="button" onClick={() => void cancelInvitation(item.id)}>ביטול</button> : null}</td></tr>)}
      </tbody></table></div>
    </section> : null}

    {adding ? <section className="card" style={{ marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>הוספת משתמש לארגון</h2><div className="toolbar"><div className="search"><Search size={17} /><UiInput value={candidateSearch} onChange={(e) => setCandidateSearch(e.target.value)} placeholder="לפחות 2 תווים בשם או באימייל" /></div></div>{candidates.length ? <VirtualizedTable items={candidates} maxHeight={260} rowHeight={52} rowKey={(item) => item.id} onRowClick={setCandidate} columns={[{ key: "name", label: "משתמש" }, { key: "email", label: "אימייל" }, { key: "selected", label: "" }]} renderCells={(item) => [<b>{item.displayName}</b>, item.email, candidate?.id === item.id ? <span className="badge badge-blue">נבחר</span> : null]} /> : null}{candidate ? <div className="grid two-cols" style={{ marginTop: 18 }}><div className="field"><label>תפקיד</label><ReferenceOptionSelect category="organization-role" value={newRole} onChange={(value) => setNewRole(Number(value) as OrganizationRole)} /></div><div className="field"><label>גישה למעסיקים</label><ReferenceOptionSelect category="employer-access-mode" value={newAccessMode} onChange={(value) => setNewAccessMode(Number(value) as EmployerAccessMode)} /></div><div className="form-actions"><button className="btn btn-primary" onClick={addUser} type="button"><Plus size={18} />הוספה לארגון</button></div></div> : null}</section> : null}

    <section className="card" style={{ marginBottom: 18 }}><div className="toolbar"><div className="search"><Search size={17} /><UiInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש משתמש לפי שם או אימייל" /></div><span className="badge badge-blue">{organizations.find((x) => x.id === organizationId)?.name ?? "ארגון"}</span></div>{loading ? <div className="empty">טוען משתמשים...</div> : users.length ? <VirtualizedTable items={users} rowKey={(item) => item.userId} onRowClick={setSelected} columns={[{ key: "user", label: "משתמש" }, { key: "email", label: "אימייל" }, { key: "role", label: "תפקיד" }, { key: "access", label: "גישה למעסיקים" }]} renderCells={(item) => [<b>{item.displayName}</b>, item.email, roleOptions.find((option) => Number(option.value) === item.role)?.label ?? String(item.role), accessModeOptions.find((option) => Number(option.value) === item.employerAccessMode)?.label ?? String(item.employerAccessMode)]} /> : <div className="empty"><ShieldCheck size={34} /><div>לא נמצאו משתמשים.</div></div>}<div className="form-actions" style={{ marginTop: 14 }}><button className="btn btn-secondary" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}>הקודם</button><button className="btn btn-secondary" disabled={!hasMore} onClick={() => setSkip(skip + PAGE_SIZE)}>הבא</button></div></section>

    {selected ? <section className="card"><div className="page-head" style={{ marginBottom: 12 }}><div><h2 style={{ margin: 0 }}>{selected.displayName}</h2><p>{selected.email}</p></div><button className="btn btn-secondary" onClick={removeUser}><Trash2 size={17} />הסרת גישה</button></div><div className="grid two-cols"><div className="field"><label>תפקיד בארגון</label><ReferenceOptionSelect category="organization-role" value={role} onChange={(value) => setRole(Number(value) as OrganizationRole)} /></div><div className="field"><label>גישה למעסיקים</label><ReferenceOptionSelect category="employer-access-mode" value={accessMode} onChange={(value) => setAccessMode(Number(value) as EmployerAccessMode)} /></div></div><div className="grid two-cols" style={{ marginTop: 16 }}><div className="notice notice-info"><b>הרשאות בפועל</b><div style={{ marginTop: 8 }}>הקמת מעסיק: {capabilities.createEmployer ? "כן" : "לא"}</div><div>עריכת מעסיק: {capabilities.editEmployer ? "כן" : "לא"}</div><div>הקמת עובד: {capabilities.createEmployee ? "כן" : "לא"}</div><div>עריכת עובד: {capabilities.editEmployee ? "כן" : "לא"}</div>{accessMode === 2 && role !== 4 ? <div style={{ marginTop: 6 }}>הפעולות מותרות רק במעסיקים שהוקצו למשתמש.</div> : null}</div><div className="form-actions" style={{ alignItems: "flex-end" }}><button className="btn btn-primary" disabled={saving} onClick={saveAccess}><Save size={18} />{saving ? "שומר..." : "שמירת הרשאות"}</button></div></div>
    {accessMode === 2 ? <div style={{ marginTop: 24 }}><h3>מעסיקים מורשים</h3><div className="grid two-cols"><div><div className="toolbar"><div className="search"><Search size={16} /><UiInput value={assignedSearch} onChange={(e) => { setAssignedSearch(e.target.value); setAssignedSkip(0); }} placeholder="חיפוש במעסיקים שהוקצו" /></div></div>{assigned.length ? <VirtualizedTable items={assigned} maxHeight={340} rowHeight={54} rowKey={(item) => item.id} columns={[{ key: "name", label: "מעסיק" }, { key: "reg", label: "ח.פ." }, { key: "role", label: "תפקיד במעסיק" }, { key: "action", label: "" }]} renderCells={(item) => [<span><Building2 size={16} /> {item.legalName}</span>, item.registrationNumber, <UiSelect aria-label={`תפקיד אצל ${item.legalName}`} value={item.role} onClick={(event) => event.stopPropagation()} onChange={(event) => void updateEmployerRole(item.id, Number(event.target.value) as EmployerRole)}>{(Object.keys(employerRoleLabels) as unknown as EmployerRole[]).map((value) => <option key={value} value={value}>{employerRoleLabels[value]}</option>)}</UiSelect>, <button className="btn btn-secondary" onClick={() => revokeEmployer(item.id)}>הסר</button>]} /> : <div className="empty">לא הוקצו מעסיקים למשתמש.</div>}<div className="form-actions"><button className="btn btn-secondary" disabled={assignedSkip === 0} onClick={() => setAssignedSkip(Math.max(0, assignedSkip - PAGE_SIZE))}>הקודם</button><button className="btn btn-secondary" disabled={!assignedHasMore} onClick={() => setAssignedSkip(assignedSkip + PAGE_SIZE)}>הבא</button></div></div><div><div className="toolbar"><div className="search"><Search size={16} /><UiInput value={employerSearch} onChange={(e) => setEmployerSearch(e.target.value)} placeholder="חיפוש מעסיק להקצאה — לפחות 2 תווים" /></div></div>{employerOptions.length ? <VirtualizedTable items={employerOptions} maxHeight={340} rowHeight={58} rowKey={(item) => item.id} columns={[{ key: "name", label: "מעסיק" }, { key: "action", label: "" }]} renderCells={(item) => [<span><b>{item.legalName}</b><div style={{ color: "var(--muted)" }}>{item.registrationNumber}</div></span>, item.assigned ? <span className="badge badge-green">מוקצה</span> : <button className="btn btn-primary" onClick={() => grantEmployer(item)}>הקצה</button>]} /> : employerSearch.trim().length >= 2 ? <div className="empty">לא נמצאו מעסיקים.</div> : null}</div></div></div> : null}</section> : null}
  </AppShell>;
}


function invitationStatusLabel(status: UserInvitation["status"]) {
  if (status === 2) return "נוצלה";
  if (status === 3) return "פג תוקף";
  if (status === 4) return "בוטלה";
  return "ממתינה";
}
