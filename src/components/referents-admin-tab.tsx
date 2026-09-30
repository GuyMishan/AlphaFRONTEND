"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { AppModal } from "@/components/app-modal";
import { DataTable } from "@/components/data-table";
import { UiInput, UiSelect } from "@/components/ui-controls";
import { alphaApi } from "@/lib/api";
import type { PlatformUser, Referent, ScopeOrganization } from "@/lib/types";

type Editor = { kind: "existing"; referent: Referent } | { kind: "new" };
const checkboxStyle = { display: "flex", gap: 10, alignItems: "center", textAlign: "right" as const, width: "100%" as const };

export function ReferentsAdminTab({ autoCreate = false }: { autoCreate?: boolean }) {
  const [referents, setReferents] = useState<Referent[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [organizations, setOrganizations] = useState<ScopeOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [newUserMode, setNewUserMode] = useState<"new" | "existing">("new");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [organizationIds, setOrganizationIds] = useState<string[]>([]);
  const [employerIds, setEmployerIds] = useState<string[]>([]);
  const [orgSearch, setOrgSearch] = useState("");
  const [employerSearch, setEmployerSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [rows, people, scope] = await Promise.all([
        alphaApi.referents(), alphaApi.platformUsers(), alphaApi.scope(),
      ]);
      setReferents(rows);
      setUsers(people);
      setOrganizations(scope.organizations);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "טעינת הרפרנטים נכשלה.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!autoCreate) return;
    openNew();
    // Avoid reopening after closing the modal or navigating between admin tabs.
    const url = new URL(window.location.href);
    url.searchParams.delete("create");
    window.history.replaceState(window.history.state, "", url);
  }, [autoCreate]);

  function openNew() {
    setEditor({ kind: "new" });
    setNewUserMode("new");
    setUserId("");
    setName("");
    setEmail("");
    setNationalId("");
    setPhone("");
    setOrganizationIds([]);
    setEmployerIds([]);
    setOrgSearch("");
    setEmployerSearch("");
  }

  function openEdit(referent: Referent) {
    setEditor({ kind: "existing", referent });
    setOrganizationIds(referent.organizationIds);
    setEmployerIds(referent.employerIds);
    setOrgSearch("");
    setEmployerSearch("");
  }

  const allEmployers = useMemo(() => organizations.flatMap((organization) =>
    organization.employers.map((employer) => ({
      ...employer, organizationName: organization.name,
    }))), [organizations]);

  const visibleOrganizations = useMemo(() =>
    organizations.filter((row) => row.name.toLowerCase().includes(orgSearch.toLowerCase())),
    [organizations, orgSearch]);

  const visibleEmployers = useMemo(() =>
    allEmployers.filter((row) =>
      `${row.legalName} ${row.registrationNumber} ${row.organizationName}`
        .toLowerCase().includes(employerSearch.toLowerCase())),
    [allEmployers, employerSearch]);

  const candidates = useMemo(() => users.filter((user) =>
    user.isActive && !user.isPlatformAdmin && !user.isReferent
  ), [users]);

  function toggleOrganization(id: string) {
    setOrganizationIds((previous) => previous.includes(id) ?
      previous.filter((item) => item !== id) : [...previous, id]);
  }
  function toggleEmployer(id: string) {
    setEmployerIds((previous) => previous.includes(id) ?
      previous.filter((item) => item !== id) : [...previous, id]);
  }

  async function save() {
    if (!editor || saving) return;
    if (organizationIds.length === 0 && employerIds.length === 0) {
      toast.error("יש לשייך לרפרנט לפחות ארגון או מעסיק אחד.");
      return;
    }
    if (editor.kind === "new" && newUserMode === "existing" && !userId) {
      toast.error("יש לבחור משתמש קיים.");
      return;
    }
    if (editor.kind === "new" && newUserMode === "new" &&
      (!name.trim() || !email.trim() || !nationalId.trim() || !phone.trim())) {
      toast.error("יש למלא את כל פרטי המשתמש.");
      return;
    }

    setSaving(true);
    try {
      let id = editor.kind === "existing" ? editor.referent.id : userId;
      if (editor.kind === "new" && newUserMode === "new") {
        const created = await alphaApi.createPlatformUser({
          displayName: name.trim(), email: email.trim(),
          nationalId: nationalId.trim(), phone: phone.trim(),
        });
        id = created.id;
      }
      // An organization assignment covers all its employers. Explicit employer
      // assignments are for selected employers from any other organization.
      const selectedEmployerIds = employerIds.filter((eid) => {
        const parent = allEmployers.find((row) => row.id === eid)?.organizationId;
        return !parent || !organizationIds.includes(parent);
      });
      await alphaApi.saveReferent(id, {
        enabled: true, organizationIds, employerIds: selectedEmployerIds,
      });
      setEditor(null);
      toast.success("פרטי הרפרנט והשיוכים נשמרו.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שמירת הרפרנט נכשלה.");
    } finally {
      setSaving(false);
    }
  }

  async function disable(referent: Referent) {
    if (!window.confirm(`לבטל את הרשאות הרפרנט ${referent.displayName} ולהסיר את כל שיוכיו?`)) return;
    setSaving(true);
    try {
      await alphaApi.saveReferent(referent.id, {
        enabled: false, organizationIds: [], employerIds: [],
      });
      toast.success("הרפרנט בוטל וכל שיוכיו הוסרו.");
      setEditor(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ביטול הרפרנט נכשל.");
    } finally {
      setSaving(false);
    }
  }

  const displayed = referents.filter((row) =>
    `${row.displayName} ${row.email}`.toLowerCase().includes(filter.toLowerCase()));

  return <section className="card admin-section-card" aria-label="ניהול רפרנטים">
    <div className="card-head" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
      <div>
        <h2>ניהול רפרנטים</h2>
        <p style={{ color: "var(--muted)" }}>
          רפרנט יכול לנהל ארגונים שלמים ומעסיקים נבחרים מארגונים שונים, בהתאם לשיוכים שהגדרת.
        </p>
      </div>
      <button type="button" className="btn btn-primary" onClick={openNew}>
        <Plus size={17} /> רפרנט חדש
      </button>
    </div>
    <div className="field" style={{ maxWidth: 400, margin: "16px 0" }}>
      <label htmlFor="referent-search">חיפוש רפרנט</label>
      <UiInput id="referent-search" value={filter} onChange={(event) => setFilter(event.target.value)}
        placeholder="שם או כתובת אימייל" />
    </div>
    <DataTable items={displayed} loading={loading} loadingLabel="טוען רפרנטים..."
      emptyState="עדיין לא הוגדרו רפרנטים." rowKey={(item) => item.id}
      columns={[
        { key: "user", label: "רפרנט" },
        { key: "organizations", label: "ארגונים מלאים" },
        { key: "employers", label: "מעסיקים נבחרים" },
        { key: "status", label: "סטטוס משתמש" },
        { key: "actions", label: "פעולות" },
      ]}
      renderCells={(row) => [
        <span key="user"><b>{row.displayName}</b><small style={{ display: "block", color: "var(--muted)" }}>{row.email}</small></span>,
        row.organizationIds.length,
        row.employerIds.length,
        row.isActive ? "פעיל" : "משתמש לא פעיל",
        <div key="actions" className="admin-actions">
          <button type="button" className="btn btn-secondary" onClick={() => openEdit(row)}>עריכה</button>
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void disable(row)}>ביטול</button>
        </div>,
      ]} />

    <AppModal open={editor !== null} width="lg"
      title={editor?.kind === "existing" ? `עריכת רפרנט: ${editor.referent.displayName}` : "יצירת רפרנט"}
      onClose={saving ? undefined : () => setEditor(null)} closeOnBackdrop={!saving}>
      {editor ? <div className="form" style={{ display: "grid", gap: 18 }}>
        {editor.kind === "new" ? <>
          <div className="field">
            <label htmlFor="referent-user-type">הגדרת המשתמש</label>
            <UiSelect id="referent-user-type" value={newUserMode}
              onChange={(event) => setNewUserMode(event.target.value as "new" | "existing")} disabled={saving}>
              {[{ value: "new", label: "משתמש חדש" }, { value: "existing", label: "משתמש קיים ללא הרשאות רפרנט" }].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </UiSelect>
          </div>
          {newUserMode === "new" ? <div className="grid" style={{ gap: 12 }}>
            <label className="field">שם מלא
              <UiInput value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} disabled={saving} />
            </label>
            <label className="field">אימייל
              <UiInput type="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={320} disabled={saving} />
            </label>
            <label className="field">תעודת זהות
              <UiInput dir="ltr" value={nationalId} onChange={(event) => setNationalId(event.target.value)}
                required inputMode="numeric" maxLength={9} disabled={saving} />
            </label>
            <label className="field">טלפון נייד
              <UiInput dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)}
                required inputMode="tel" maxLength={10} disabled={saving} />
            </label>
          </div> :
            <label className="field">בחירת משתמש
              <UiSelect value={userId} onChange={(event) => setUserId(event.target.value)} disabled={saving}>
                <option value="">בחרו משתמש</option>
                {candidates.map((user) => <option key={user.id} value={user.id}>
                  {user.displayName} · {user.email}
                </option>)}
              </UiSelect>
            </label>}
        </> : <div className="notice notice-info">{editor.referent.email}</div>}

        <div className="field">
          <label htmlFor="referent-org-search"><b>ארגונים בניהול מלא</b></label>
          <UiInput id="referent-org-search" value={orgSearch} onChange={(event) => setOrgSearch(event.target.value)}
            placeholder="חיפוש ארגונים" disabled={saving} />
          <div role="group" aria-label="בחירת ארגונים" style={{
            maxHeight: 195, overflowY: "auto", display: "grid", gap: 6,
            padding: 8, border: "1px solid var(--border)", borderRadius: 10,
          }}>
            {visibleOrganizations.map((org) => <button key={org.id} type="button"
              aria-pressed={organizationIds.includes(org.id)} disabled={saving}
              className="btn btn-secondary" style={checkboxStyle} onClick={() => toggleOrganization(org.id)}>
              <span aria-hidden="true">{organizationIds.includes(org.id) ? "☑" : "□"}</span>
              {org.name}
            </button>)}
            {!visibleOrganizations.length ? <span>לא נמצאו ארגונים.</span> : null}
          </div>
        </div>

        <div className="field">
          <label htmlFor="referent-employer-search"><b>מעסיקים בודדים מכל הארגונים</b></label>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            ניתן לבחור מעסיקים ממספר ארגונים. אין צורך לבחור בנפרד מעסיקים שכבר כלולים בארגון שנבחר.
          </p>
          <UiInput id="referent-employer-search" value={employerSearch}
            onChange={(event) => setEmployerSearch(event.target.value)}
            placeholder="חיפוש מעסיק, ח.פ. או ארגון" disabled={saving} />
          <div role="group" aria-label="בחירת מעסיקים" style={{
            maxHeight: 240, overflowY: "auto", display: "grid", gap: 6,
            padding: 8, border: "1px solid var(--border)", borderRadius: 10,
          }}>
            {visibleEmployers.map((employer) => {
              const covered = organizationIds.includes(employer.organizationId);
              return <button type="button" key={employer.id} aria-pressed={covered || employerIds.includes(employer.id)}
                className="btn btn-secondary" style={checkboxStyle} disabled={covered || saving}
                onClick={() => toggleEmployer(employer.id)}>
                <span aria-hidden="true">{covered || employerIds.includes(employer.id) ? "☑" : "□"}</span>
                <span style={{ minWidth: 0 }}>
                  <b>{employer.legalName}</b>
                  <small style={{ display: "block", color: "var(--muted)" }}>
                    {employer.organizationName} · {employer.registrationNumber}{covered ? " · כלול בארגון" : ""}
                  </small>
                </span>
              </button>;
            })}
            {!visibleEmployers.length ? <span>לא נמצאו מעסיקים.</span> : null}
          </div>
        </div>
        <div className="form-actions" style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setEditor(null)} disabled={saving}>
            <X size={15} /> ביטול
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
            <ShieldCheck size={16} /> {saving ? "שומר..." : "שמירת רפרנט ושיוכים"}
          </button>
        </div>
      </div> : null}
    </AppModal>
  </section>;
}
