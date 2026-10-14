"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Landmark, Plus, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { AppModal } from "@/components/ui/app-modal";
import { DataTable } from "@/components/ui/data-table";
import { UiInput, UiSelect } from "@/components/ui/ui-controls";
import { UiSelectionList } from "@/components/ui/ui-selection-list";
import { adminApi } from "@/features/admin/api";
import { adminKeys, usePlatformUsers, useReferents } from "@/features/admin/queries";
import { useScopeContext } from "@/features/scope/scope-context";
import { errorMessage } from "@/lib/api/error-messages";
import type { PlatformUser, Referent } from "@/features/admin/types";
import type { ScopeOrganization } from "@/features/scope/types";
import { replaceSearchParams } from "@/lib/url-search-params";

type Editor = { kind: "existing"; referent: Referent } | { kind: "new" };

const NO_REFERENTS: Referent[] = [];
const NO_USERS: PlatformUser[] = [];
const NO_ORGANIZATIONS: ScopeOrganization[] = [];

export function ReferentsAdminTab({ autoCreate = false }: { autoCreate?: boolean }) {
  const queryClient = useQueryClient();
  const referentsQuery = useReferents();
  const usersQuery = usePlatformUsers(true);
  const scopeQuery = useScopeContext();
  const referents = referentsQuery.data ?? NO_REFERENTS;
  const users = usersQuery.data ?? NO_USERS;
  const organizations = scopeQuery.data?.organizations ?? NO_ORGANIZATIONS;
  const loading = referentsQuery.isPending || usersQuery.isPending || scopeQuery.isPending;
  const loadError = referentsQuery.error ?? usersQuery.error ?? scopeQuery.error;
  const [editor, setEditor] = useState<Editor | null>(null);
  const [newUserMode, setNewUserMode] = useState<"new" | "existing">("new");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [organizationIds, setOrganizationIds] = useState<string[]>([]);
  const [employerIds, setEmployerIds] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loadError) toast.error(errorMessage(loadError, "טעינת הרפרנטים נכשלה."));
  }, [loadError]);

  // Referent changes also change the platform users list (isReferent).
  const refreshAdminData = () => queryClient.invalidateQueries({ queryKey: adminKeys.all });

  useEffect(() => {
    if (!autoCreate) return;
    openNew();
    // Avoid reopening after closing the modal or navigating between admin tabs.
    replaceSearchParams((params) => params.delete("create"));
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
  }

  function openEdit(referent: Referent) {
    setEditor({ kind: "existing", referent });
    setOrganizationIds(referent.organizationIds);
    setEmployerIds(referent.employerIds);
  }

  const allEmployers = useMemo(() => organizations.flatMap((organization) =>
    organization.employers.map((employer) => ({
      ...employer, organizationName: organization.name,
    }))), [organizations]);

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
        const created = await adminApi.createPlatformUser({
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
      await adminApi.saveReferent(id, {
        enabled: true, organizationIds, employerIds: selectedEmployerIds,
      });
      setEditor(null);
      toast.success("פרטי הרפרנט והשיוכים נשמרו.");
      await refreshAdminData();
    } catch (error) {
      toast.error(errorMessage(error, "שמירת הרפרנט נכשלה."));
    } finally {
      setSaving(false);
    }
  }

  async function disable(referent: Referent) {
    if (!window.confirm(`לבטל את הרשאות הרפרנט ${referent.displayName} ולהסיר את כל שיוכיו?`)) return;
    setSaving(true);
    try {
      await adminApi.saveReferent(referent.id, {
        enabled: false, organizationIds: [], employerIds: [],
      });
      toast.success("הרפרנט בוטל וכל שיוכיו הוסרו.");
      setEditor(null);
      await refreshAdminData();
    } catch (error) {
      toast.error(errorMessage(error, "ביטול הרפרנט נכשל."));
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
        <p style={{ color: "var(--color-text-muted)" }}>
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
        <span key="user"><b>{row.displayName}</b><small style={{ display: "block", color: "var(--color-text-muted)" }}>{row.email}</small></span>,
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
      onClose={() => setEditor(null)} closeDisabled={saving} closeOnBackdrop={!saving}
      actions={<>
        <button type="button" className="btn btn-secondary" onClick={() => setEditor(null)} disabled={saving}>
          <X size={15} /> ביטול
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
          <ShieldCheck size={16} /> {saving ? "שומר..." : "שמירת רפרנט ושיוכים"}
        </button>
      </>}>
      {editor ? <div className="form" style={{ display: "grid", gap: 18 }}>
        {editor.kind === "new" ? <>
          <div className="field referent-user-mode">
            <label htmlFor="referent-user-type">הגדרת המשתמש</label>
            <UiSelect id="referent-user-type" value={newUserMode}
              onChange={(event) => setNewUserMode(event.target.value as "new" | "existing")} disabled={saving}>
              {[{ value: "new", label: "משתמש חדש" }, { value: "existing", label: "משתמש קיים ללא הרשאות רפרנט" }].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </UiSelect>
          </div>
          {newUserMode === "new" ? <div className="referent-identity-grid">
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

        <div className="referent-assignment-grid">
        <UiSelectionList
          title="ארגונים בניהול מלא"
          description="בחירת ארגון מעניקה גישה לכל המעסיקים שלו."
          icon={<Landmark size={19} />}
          options={organizations.map(org => ({ id: org.id, title: org.name }))}
          selectedIds={organizationIds}
          onToggle={toggleOrganization}
          searchPlaceholder="חיפוש ארגון"
          disabled={saving}
        />

        <UiSelectionList
          title="מעסיקים בודדים מכל הארגונים"
          description="אפשר לשייך מעסיקים מארגונים שונים. מעסיקים מתוך ארגון שנבחר כבר כלולים."
          icon={<Building2 size={19} />}
          options={allEmployers.map(employer => ({
            id: employer.id,
            title: employer.legalName,
            subtitle: `${employer.organizationName} · ${employer.registrationNumber}`,
            selectedByParent: organizationIds.includes(employer.organizationId),
          }))}
          selectedIds={employerIds}
          onToggle={toggleEmployer}
          searchPlaceholder="חיפוש מעסיק, ח.פ. או ארגון"
          disabled={saving}
          height={272}
        />
        </div>
      </div> : null}
    </AppModal>
  </section>;
}
