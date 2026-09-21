"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Mail, Plus, Save, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppTabs } from "@/components/app-tabs";
import { VirtualizedTable } from "@/components/virtualized-table";
import { PlanUsage } from "@/components/plan-usage";
import { UserEditorModal } from "@/components/user-editor-modal";
import { UiChoiceCard, UiInput, UiSelect } from "@/components/ui-controls";
import { alphaApi } from "@/lib/api";
import { getOrganizationSelection, getSession } from "@/lib/session";
import { openUpgradeDialog } from "@/lib/upgrade";
import type {
  AccessEmployer,
  AccessUser,
  Employer,
  EmployerAccessMode,
  EmployerOption,
  EmployerRole,
  EntitlementSnapshot,
  Organization,
  OrganizationRole,
  PlatformUser,
  UserInvitation,
} from "@/lib/types";

const PAGE_SIZE = 50;

const organizationRoleLabels: Record<OrganizationRole, string> = {
  1: "מנהל ארגון",
  2: "מנהל שכר",
  3: "תפעול",
  4: "צפייה בלבד",
};

const employerRoleLabels: Record<EmployerRole, string> = {
  1: "בעלים",
  2: "מנהל",
  3: "משתמש",
  4: "צפייה בלבד",
};

const employerAccessLabels: Record<EmployerAccessMode, string> = {
  1: "כל המעסיקים",
  2: "מעסיקים נבחרים",
};

type PermissionState = {
  canCreateEmployer: boolean;
  canEditEmployer: boolean;
  canCreateEmployee: boolean;
  canEditEmployee: boolean;
};

function roleDefaults(role: OrganizationRole, accessMode: EmployerAccessMode): PermissionState {
  const canOperate = role !== 4;
  return {
    canCreateEmployer: role === 1 && accessMode === 1,
    canEditEmployer: canOperate,
    canCreateEmployee: canOperate,
    canEditEmployee: canOperate,
  };
}

function boolLabel(value: boolean) {
  return value ? "מורשה" : "לא מורשה";
}

export default function AccessPage() {
  const session = getSession();
  const isPlatformAdmin = Boolean(session?.platformAdmin);
  const [tab, setTab] = useState<"platform" | "organization">(isPlatformAdmin ? "platform" : "organization");

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
  const [permissions, setPermissions] = useState<PermissionState>(roleDefaults(4, 2));
  const [saving, setSaving] = useState(false);

  const [assigned, setAssigned] = useState<AccessEmployer[]>([]);
  const [assignedSearch, setAssignedSearch] = useState("");
  const [assignedSkip, setAssignedSkip] = useState(0);
  const [assignedHasMore, setAssignedHasMore] = useState(false);
  const [employerSearch, setEmployerSearch] = useState("");
  const [employerOptions, setEmployerOptions] = useState<EmployerOption[]>([]);

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

  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [platformSearch, setPlatformSearch] = useState("");
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformEditor, setPlatformEditor] = useState<PlatformUser | "new" | null>(null);
  const [platformName, setPlatformName] = useState("");
  const [platformEmail, setPlatformEmail] = useState("");
  const [platformNationalId, setPlatformNationalId] = useState("");
  const [platformPhone, setPlatformPhone] = useState("");
  const [platformActive, setPlatformActive] = useState(true);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [platformSaving, setPlatformSaving] = useState(false);

  useEffect(() => {
    alphaApi.organizations().then((items) => {
      setOrganizations(items);
      const saved = getOrganizationSelection();
      setOrganizationId(saved && items.some((x) => x.id === saved) ? saved : items[0]?.id ?? "");
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת הארגונים נכשלה"));

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId: string }>).detail;
      setOrganizationId(detail.organizationId);
      setSelected(null);
      setSearch("");
      setSkip(0);
    };
    window.addEventListener("alpha:scope-change", handler);
    return () => window.removeEventListener("alpha:scope-change", handler);
  }, []);

  useEffect(() => {
    if (!isPlatformAdmin || tab !== "platform") return;
    void loadPlatformUsers();
  }, [isPlatformAdmin, tab]);

  useEffect(() => {
    if (!organizationId || tab !== "organization") return;
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
      setLoading(true);
      setError("");
      alphaApi.accessUsers(organizationId, search.trim(), skip, PAGE_SIZE)
        .then((result) => {
          setUsers(result.items);
          setHasMore(result.hasMore);
          setSelected((current) => current ? result.items.find((x) => x.userId === current.userId) ?? null : null);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "אין לך הרשאה לנהל משתמשים בארגון הזה"))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [organizationId, search, skip, tab]);

  useEffect(() => { setSkip(0); }, [search]);

  useEffect(() => {
    if (!selected) return;
    setRole(selected.role);
    setAccessMode(selected.employerAccessMode);
    setPermissions({
      canCreateEmployer: selected.canCreateEmployer,
      canEditEmployer: selected.canEditEmployer,
      canCreateEmployee: selected.canCreateEmployee,
      canEditEmployee: selected.canEditEmployee,
    });
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
    const timer = window.setTimeout(() => {
      alphaApi.assignedEmployers(organizationId, selected.userId, assignedSearch.trim(), assignedSkip, PAGE_SIZE)
        .then((result) => {
          setAssigned(result.items);
          setAssignedHasMore(result.hasMore);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "טעינת המעסיקים המורשים נכשלה"));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [organizationId, selected, accessMode, assignedSearch, assignedSkip]);

  useEffect(() => {
    if (!organizationId || !selected || employerSearch.trim().length < 2) {
      setEmployerOptions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      alphaApi.employerAccessOptions(organizationId, selected.userId, employerSearch.trim())
        .then(setEmployerOptions)
        .catch((err) => setError(err instanceof Error ? err.message : "חיפוש המעסיקים נכשל"));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [organizationId, selected, employerSearch]);

  const filteredPlatformUsers = useMemo(() => {
    const term = platformSearch.trim().toLowerCase();
    if (!term) return platformUsers;
    return platformUsers.filter((item) =>
      item.displayName.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term) ||
      (item.nationalId ?? "").includes(term) ||
      (item.phone ?? "").includes(term)
    );
  }, [platformUsers, platformSearch]);

  async function loadPlatformUsers() {
    setPlatformLoading(true);
    setError("");
    try {
      setPlatformUsers(await alphaApi.platformUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת משתמשי המערכת נכשלה");
    } finally {
      setPlatformLoading(false);
    }
  }

  function openPlatformEditor(user: PlatformUser | "new") {
    setPlatformEditor(user);
    if (user === "new") {
      setPlatformName("");
      setPlatformEmail("");
      setPlatformNationalId("");
      setPlatformPhone("");
      setPlatformActive(true);
      setPlatformAdmin(false);
      return;
    }
    setPlatformName(user.displayName);
    setPlatformEmail(user.email);
    setPlatformNationalId(user.nationalId ?? "");
    setPlatformPhone(user.phone ?? "");
    setPlatformActive(user.isActive);
    setPlatformAdmin(user.isPlatformAdmin);
  }

  async function savePlatformUser() {
    if (!platformEditor) return;
    if (!platformName.trim() || !platformEmail.trim()) {
      setError("יש להזין שם ואימייל.");
      return;
    }
    setPlatformSaving(true);
    setError("");
    try {
      if (platformEditor === "new") {
        if (!platformNationalId.trim() || !platformPhone.trim()) {
          setError("בהקמת משתמש חדש יש להזין תעודת זהות וטלפון.");
          return;
        }
        const created = await alphaApi.createPlatformUser({
          displayName: platformName.trim(),
          email: platformEmail.trim(),
          nationalId: platformNationalId.trim(),
          phone: platformPhone.trim(),
        });
        if (platformAdmin || !platformActive) {
          await alphaApi.updatePlatformUser(created.id, {
            displayName: created.displayName,
            email: created.email,
            isActive: platformActive,
            isPlatformAdmin: platformAdmin,
          });
        }
      } else {
        await alphaApi.updatePlatformUser(platformEditor.id, {
          displayName: platformName.trim(),
          email: platformEmail.trim(),
          isActive: platformActive,
          isPlatformAdmin: platformAdmin,
        });
      }
      await loadPlatformUsers();
      setPlatformEditor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת המשתמש נכשלה");
    } finally {
      setPlatformSaving(false);
    }
  }

  function changeRole(nextRole: OrganizationRole) {
    setRole(nextRole);
    setPermissions(roleDefaults(nextRole, accessMode));
  }

  function changeAccessMode(nextMode: EmployerAccessMode) {
    setAccessMode(nextMode);
    setPermissions(roleDefaults(role, nextMode));
  }

  async function saveAccess() {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await alphaApi.updateAccessUser(organizationId, selected.userId, {
        role,
        employerAccessMode: accessMode,
        ...permissions,
      });
      const next = { ...selected, role, employerAccessMode: accessMode, ...permissions };
      setUsers((items) => items.map((item) => item.userId === selected.userId ? next : item));
      setSelected(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירת ההרשאות נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser() {
    if (!selected || !window.confirm(`להסיר את ${selected.displayName} מהארגון?`)) return;
    try {
      await alphaApi.removeAccessUser(organizationId, selected.userId);
      setUsers((items) => items.filter((item) => item.userId !== selected.userId));
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "הסרת המשתמש נכשלה");
    }
  }

  async function createInvitation() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setError("יש להזין כתובת אימייל תקינה.");
      return;
    }
    if (inviteScope === "employer" && !inviteEmployerId) {
      setError("יש לבחור מעסיק להזמנה.");
      return;
    }
    setInviting(true);
    setError("");
    try {
      await alphaApi.createInvitation(organizationId, inviteScope === "organization"
        ? { email, organizationRole: inviteOrganizationRole, expiresInDays: 7 }
        : { email, employerId: inviteEmployerId, employerRole: inviteEmployerRole, expiresInDays: 7 });
      setInvitations(await alphaApi.invitations(organizationId));
      setInviteEmail("");
      setInviteOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "שליחת ההזמנה נכשלה";
      setError(message === "user_exists_use_existing_access"
        ? "המשתמש כבר קיים במערכת. כרגע לא ניתן לצרף אותו דרך הזמנה; אין יותר מסלול נפרד של 'הוספת משתמש קיים'."
        : message === "invitation_already_pending" ? "כבר קיימת הזמנה פעילה לאימייל הזה." : message);
    } finally {
      setInviting(false);
    }
  }

  async function cancelInvitation(invitationId: string) {
    try {
      await alphaApi.cancelInvitation(organizationId, invitationId);
      setInvitations(await alphaApi.invitations(organizationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ביטול ההזמנה נכשל");
    }
  }

  async function grantEmployer(item: EmployerOption) {
    if (!selected) return;
    try {
      await alphaApi.grantEmployerAccess(organizationId, selected.userId, item.id);
      setEmployerOptions((items) => items.map((x) => x.id === item.id ? { ...x, assigned: true } : x));
      const result = await alphaApi.assignedEmployers(organizationId, selected.userId, assignedSearch, assignedSkip, PAGE_SIZE);
      setAssigned(result.items);
      setAssignedHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "הקצאת המעסיק נכשלה");
    }
  }

  async function updateEmployerRole(employerId: string, nextRole: EmployerRole) {
    if (!selected) return;
    try {
      await alphaApi.updateEmployerAccessRole(organizationId, selected.userId, employerId, nextRole);
      setAssigned((items) => items.map((x) => x.id === employerId ? { ...x, role: nextRole } : x));
    } catch (err) {
      setError(err instanceof Error ? err.message : "עדכון תפקיד המעסיק נכשל");
    }
  }

  async function revokeEmployer(employerId: string) {
    if (!selected) return;
    try {
      await alphaApi.revokeEmployerAccess(organizationId, selected.userId, employerId);
      setAssigned((items) => items.filter((x) => x.id !== employerId));
      setEmployerOptions((items) => items.map((x) => x.id === employerId ? { ...x, assigned: false } : x));
    } catch (err) {
      setError(err instanceof Error ? err.message : "הסרת המעסיק נכשלה");
    }
  }

  const tabs = isPlatformAdmin ? [
    { key: "platform", label: "כל משתמשי המערכת", icon: UserPlus },
    { key: "organization", label: "משתמשים והרשאות בארגון", icon: ShieldCheck },
  ] as const : [];

  return <AppShell title="משתמשים והרשאות">
    <div className="page-head">
      <div>
        <h1>משתמשים והרשאות</h1>
        <p>{tab === "platform" ? "ניהול כלל המשתמשים במערכת, כולל אדמינים." : "ניהול משתמשים והרשאות בתוך הארגון בלבד."}</p>
      </div>
      {tab === "platform" ? <button className="btn btn-primary" type="button" onClick={() => openPlatformEditor("new")}><Plus size={18} />משתמש חדש</button> :
        <button className="btn btn-primary" type="button" onClick={() => {
          if (entitlements && entitlements.users.current >= entitlements.users.maximum) {
            openUpgradeDialog({ reason: "users", planName: entitlements.plan.name, current: entitlements.users.current, maximum: entitlements.users.maximum });
            return;
          }
          setInviteOpen(true);
        }}><Mail size={18} />משתמש חדש</button>}
    </div>

    {isPlatformAdmin ? <AppTabs items={[...tabs]} activeKey={tab} onChange={setTab} ariaLabel="ניהול משתמשים" /> : null}
    {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}

    {tab === "platform" ? <>
      <section className="card">
        <div className="toolbar">
          <div className="search"><Search size={17} /><UiInput value={platformSearch} onChange={(event) => setPlatformSearch(event.target.value)} placeholder="חיפוש לפי שם, אימייל, תעודת זהות או טלפון" /></div>
          <span className="badge badge-blue">{filteredPlatformUsers.length} משתמשים</span>
        </div>
        {platformLoading ? <div className="empty">טוען משתמשים...</div> : filteredPlatformUsers.length ? <VirtualizedTable
          items={filteredPlatformUsers}
          rowKey={(item) => item.id}
          onRowClick={(item) => openPlatformEditor(item)}
          columns={[
            { key: "user", label: "משתמש" },
            { key: "email", label: "אימייל" },
            { key: "admin", label: "אדמין מערכת" },
            { key: "status", label: "סטטוס" },
          ]}
          renderCells={(item) => [
            <button className="table-entity-link" type="button" onClick={(event) => { event.stopPropagation(); openPlatformEditor(item); }}>{item.displayName}</button>,
            item.email,
            item.isPlatformAdmin ? <span className="badge badge-blue">כן</span> : "לא",
            item.isActive ? <span className="badge badge-green">פעיל</span> : <span className="badge badge-gray">לא פעיל</span>,
          ]}
        /> : <div className="empty">לא נמצאו משתמשים.</div>}
      </section>
    </> : <>
      {entitlements ? <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head" style={{ marginBottom: 10 }}><div><h3>שימוש במסלול {entitlements.plan.name}</h3></div></div>
        <PlanUsage label="משתמשים" usage={entitlements.users} />
      </section> : null}

      {entitlements && entitlements.users.current >= entitlements.users.maximum ? <div className="notice notice-info" style={{ marginBottom: 18 }}>
        <b>הגעתם למגבלת המשתמשים במסלול.</b>
        <div style={{ marginTop: 10 }}><button className="btn btn-primary" type="button" onClick={() => openUpgradeDialog({ reason: "users", planName: entitlements.plan.name, current: entitlements.users.current, maximum: entitlements.users.maximum })}>יצירת קשר לשדרוג</button></div>
      </div> : null}

      {invitations.length ? <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><div><h2>הזמנות</h2><span style={{ color: "var(--muted)" }}>הזמנות שנשלחו מהארגון ועדיין מנוהלות כאן.</span></div></div>
        <div className="table-wrap"><table><thead><tr><th>אימייל</th><th>גישה</th><th>סטטוס</th><th>תוקף</th><th /></tr></thead><tbody>
          {invitations.map((item) => <tr key={item.id}>
            <td><b>{item.email}</b></td>
            <td>{item.employerName ?? "כל הארגון"}</td>
            <td>{invitationStatusLabel(item.status)}</td>
            <td>{new Date(item.expiresAt).toLocaleDateString("he-IL")}</td>
            <td>{item.status === 1 ? <button className="btn btn-secondary" type="button" onClick={() => void cancelInvitation(item.id)}>ביטול</button> : null}</td>
          </tr>)}
        </tbody></table></div>
      </section> : null}

      <section className="card">
        <div className="toolbar">
          <div className="search"><Search size={17} /><UiInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="חיפוש משתמש לפי שם או אימייל" /></div>
          <span className="badge badge-blue">{organizations.find((x) => x.id === organizationId)?.name ?? "ארגון"}</span>
        </div>
        {loading ? <div className="empty">טוען משתמשים...</div> : users.length ? <VirtualizedTable
          items={users}
          rowKey={(item) => item.userId}
          onRowClick={setSelected}
          columns={[
            { key: "user", label: "משתמש" },
            { key: "email", label: "אימייל" },
            { key: "role", label: "תפקיד בארגון" },
            { key: "access", label: "גישה למעסיקים" },
          ]}
          renderCells={(item) => [
            <button className="table-entity-link" type="button" onClick={(event) => { event.stopPropagation(); setSelected(item); }}>{item.displayName}</button>,
            item.email,
            organizationRoleLabels[item.role],
            employerAccessLabels[item.employerAccessMode],
          ]}
        /> : <div className="empty"><ShieldCheck size={34} /><div>לא נמצאו משתמשים.</div></div>}
        <div className="form-actions" style={{ marginTop: 14 }}>
          <button className="btn btn-secondary" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}>הקודם</button>
          <button className="btn btn-secondary" disabled={!hasMore} onClick={() => setSkip(skip + PAGE_SIZE)}>הבא</button>
        </div>
      </section>
    </>}

    {platformEditor ? <UserEditorModal
      title={platformEditor === "new" ? "משתמש חדש" : platformEditor.displayName}
      subtitle={platformEditor === "new" ? "יצירת משתמש מערכת חדש" : "פרטי משתמש מערכת והרשאות אדמין"}
      onClose={() => setPlatformEditor(null)}
      actions={<>
        <button className="btn btn-secondary" type="button" onClick={() => setPlatformEditor(null)}>ביטול</button>
        <button className="btn btn-primary" type="button" disabled={platformSaving} onClick={() => void savePlatformUser()}><Save size={17} />{platformSaving ? "שומר..." : "שמירה"}</button>
      </>}
    >
      <div className="user-editor-grid">
        <div className="field"><label>שם משתמש</label><UiInput value={platformName} onChange={(event) => setPlatformName(event.target.value)} /></div>
        <div className="field"><label>אימייל</label><UiInput type="email" dir="ltr" value={platformEmail} onChange={(event) => setPlatformEmail(event.target.value)} /></div>
        <div className="field"><label>תעודת זהות</label><UiInput dir="ltr" value={platformNationalId} disabled={platformEditor !== "new"} onChange={(event) => setPlatformNationalId(event.target.value)} /></div>
        <div className="field"><label>טלפון</label><UiInput dir="ltr" value={platformPhone} disabled={platformEditor !== "new"} onChange={(event) => setPlatformPhone(event.target.value)} /></div>
        <div className="field"><label>סטטוס</label><UiSelect value={platformActive ? "1" : "0"} onChange={(event) => setPlatformActive(event.target.value === "1")}><option value="1">פעיל</option><option value="0">לא פעיל</option></UiSelect></div>
        <div className="field"><label>אדמין מערכת</label><UiSelect value={platformAdmin ? "1" : "0"} onChange={(event) => setPlatformAdmin(event.target.value === "1")}><option value="0">לא</option><option value="1">כן</option></UiSelect></div>
      </div>
    </UserEditorModal> : null}

    {inviteOpen ? <UserEditorModal
      title="משתמש חדש"
      subtitle="הוספת משתמש לארגון באמצעות הזמנה מאובטחת"
      onClose={() => setInviteOpen(false)}
      actions={<>
        <button className="btn btn-secondary" type="button" onClick={() => setInviteOpen(false)}>ביטול</button>
        <button className="btn btn-primary" type="button" disabled={inviting} onClick={() => void createInvitation()}><Mail size={17} />{inviting ? "שולח..." : "שליחת הזמנה"}</button>
      </>}
    >
      <div className="field"><label>אימייל</label><UiInput type="email" dir="ltr" maxLength={320} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@example.com" /></div>
      <div className="grid two-cols" style={{ marginTop: 16 }}>
        <UiChoiceCard selected={inviteScope === "organization"} onClick={() => setInviteScope("organization")}><ShieldCheck size={22} /><b>גישה לארגון</b><p>גישה ברמת הארגון לפי התפקיד שייבחר.</p></UiChoiceCard>
        <UiChoiceCard selected={inviteScope === "employer"} onClick={() => setInviteScope("employer")}><Building2 size={22} /><b>גישה למעסיק</b><p>גישה ישירה למעסיק אחד בלבד.</p></UiChoiceCard>
      </div>
      {inviteScope === "organization" ? <div className="field" style={{ marginTop: 16 }}>
        <label>תפקיד בארגון</label>
        <UiSelect value={inviteOrganizationRole} onChange={(event) => setInviteOrganizationRole(Number(event.target.value) as OrganizationRole)}>
          {(Object.keys(organizationRoleLabels) as unknown as OrganizationRole[]).map((value) => <option key={value} value={value}>{organizationRoleLabels[value]}</option>)}
        </UiSelect>
      </div> : <div className="grid two-cols" style={{ marginTop: 16 }}>
        <div className="field"><label>מעסיק</label><UiSelect value={inviteEmployerId} onChange={(event) => setInviteEmployerId(event.target.value)}>{inviteEmployers.map((item) => <option key={item.id} value={item.id}>{item.legalName}</option>)}</UiSelect></div>
        <div className="field"><label>תפקיד אצל המעסיק</label><UiSelect value={inviteEmployerRole} onChange={(event) => setInviteEmployerRole(Number(event.target.value) as EmployerRole)}>{(Object.keys(employerRoleLabels) as unknown as EmployerRole[]).map((value) => <option key={value} value={value}>{employerRoleLabels[value]}</option>)}</UiSelect></div>
      </div>}
    </UserEditorModal> : null}

    {selected ? <UserEditorModal
      title={selected.displayName}
      subtitle={selected.email}
      onClose={() => setSelected(null)}
      actions={<>
        <button className="btn btn-danger" type="button" onClick={() => void removeUser()}><Trash2 size={17} />הסרת גישה</button>
        <span className="user-modal-actions-spacer" />
        <button className="btn btn-secondary" type="button" onClick={() => setSelected(null)}>סגירה</button>
        <button className="btn btn-primary" type="button" disabled={saving} onClick={() => void saveAccess()}><Save size={17} />{saving ? "שומר..." : "שמירת הרשאות"}</button>
      </>}
    >
      <div className="user-editor-grid">
        <div className="field">
          <label>תפקיד בארגון</label>
          <UiSelect value={role} onChange={(event) => changeRole(Number(event.target.value) as OrganizationRole)}>
            {(Object.keys(organizationRoleLabels) as unknown as OrganizationRole[]).map((value) => <option key={value} value={value}>{organizationRoleLabels[value]}</option>)}
          </UiSelect>
        </div>
        <div className="field">
          <label>גישה למעסיקים</label>
          <UiSelect value={accessMode} onChange={(event) => changeAccessMode(Number(event.target.value) as EmployerAccessMode)}>
            <option value={1}>כל המעסיקים</option>
            <option value={2}>מעסיקים נבחרים</option>
          </UiSelect>
        </div>
      </div>

      <div className="user-permissions-section">
        <div className="user-permissions-head">
          <div><h3>הרשאות בפועל</h3><p>התפקיד קובע ברירת מחדל. לאחר מכן אפשר לשנות כל הרשאה למשתמש הזה בנפרד.</p></div>
        </div>
        <div className="user-permissions-grid">
          <PermissionSelect label="הקמת מעסיק" value={permissions.canCreateEmployer} onChange={(value) => setPermissions((current) => ({ ...current, canCreateEmployer: value }))} />
          <PermissionSelect label="עריכת מעסיק" value={permissions.canEditEmployer} onChange={(value) => setPermissions((current) => ({ ...current, canEditEmployer: value }))} />
          <PermissionSelect label="הקמת עובד" value={permissions.canCreateEmployee} onChange={(value) => setPermissions((current) => ({ ...current, canCreateEmployee: value }))} />
          <PermissionSelect label="עריכת עובד" value={permissions.canEditEmployee} onChange={(value) => setPermissions((current) => ({ ...current, canEditEmployee: value }))} />
        </div>
      </div>

      {accessMode === 2 ? <div className="user-employer-access-section">
        <h3>מעסיקים מורשים</h3>
        <div className="grid two-cols">
          <div>
            <div className="toolbar"><div className="search"><Search size={16} /><UiInput value={assignedSearch} onChange={(event) => { setAssignedSearch(event.target.value); setAssignedSkip(0); }} placeholder="חיפוש במעסיקים שהוקצו" /></div></div>
            {assigned.length ? <VirtualizedTable
              items={assigned}
              maxHeight={340}
              rowHeight={54}
              rowKey={(item) => item.id}
              columns={[{ key: "name", label: "מעסיק" }, { key: "reg", label: "ח.פ." }, { key: "role", label: "תפקיד במעסיק" }, { key: "action", label: "" }]}
              renderCells={(item) => [
                <span><Building2 size={16} /> {item.legalName}</span>,
                item.registrationNumber,
                <UiSelect aria-label={`תפקיד אצל ${item.legalName}`} value={item.role} onClick={(event) => event.stopPropagation()} onChange={(event) => void updateEmployerRole(item.id, Number(event.target.value) as EmployerRole)}>{(Object.keys(employerRoleLabels) as unknown as EmployerRole[]).map((value) => <option key={value} value={value}>{employerRoleLabels[value]}</option>)}</UiSelect>,
                <button className="btn btn-secondary" type="button" onClick={() => void revokeEmployer(item.id)}>הסר</button>,
              ]}
            /> : <div className="empty">לא הוקצו מעסיקים למשתמש.</div>}
            <div className="form-actions">
              <button className="btn btn-secondary" disabled={assignedSkip === 0} onClick={() => setAssignedSkip(Math.max(0, assignedSkip - PAGE_SIZE))}>הקודם</button>
              <button className="btn btn-secondary" disabled={!assignedHasMore} onClick={() => setAssignedSkip(assignedSkip + PAGE_SIZE)}>הבא</button>
            </div>
          </div>
          <div>
            <div className="toolbar"><div className="search"><Search size={16} /><UiInput value={employerSearch} onChange={(event) => setEmployerSearch(event.target.value)} placeholder="חיפוש מעסיק להקצאה — לפחות 2 תווים" /></div></div>
            {employerOptions.length ? <VirtualizedTable
              items={employerOptions}
              maxHeight={340}
              rowHeight={58}
              rowKey={(item) => item.id}
              columns={[{ key: "name", label: "מעסיק" }, { key: "action", label: "" }]}
              renderCells={(item) => [
                <span><b>{item.legalName}</b><div style={{ color: "var(--muted)" }}>{item.registrationNumber}</div></span>,
                item.assigned ? <span className="badge badge-green">מוקצה</span> : <button className="btn btn-primary" type="button" onClick={() => void grantEmployer(item)}>הקצה</button>,
              ]}
            /> : employerSearch.trim().length >= 2 ? <div className="empty">לא נמצאו מעסיקים.</div> : null}
          </div>
        </div>
      </div> : null}
    </UserEditorModal> : null}
  </AppShell>;
}

function PermissionSelect({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="field">
    <label>{label}</label>
    <UiSelect value={value ? "1" : "0"} onChange={(event) => onChange(event.target.value === "1")}>
      <option value="1">{boolLabel(true)}</option>
      <option value="0">{boolLabel(false)}</option>
    </UiSelect>
  </div>;
}

function invitationStatusLabel(status: UserInvitation["status"]) {
  if (status === 2) return "נוצלה";
  if (status === 3) return "פג תוקף";
  if (status === 4) return "בוטלה";
  return "ממתינה";
}
