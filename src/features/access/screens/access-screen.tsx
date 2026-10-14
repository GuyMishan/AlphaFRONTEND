"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Save, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/features/shell/components/app-shell";
import { DataTable } from "@/components/ui/data-table";
import { PlanUsage } from "@/features/billing/components/plan-usage";
import { UserEditorModal } from "@/features/access/components/user-editor-modal";
import { UiChoiceCard, UiInput, UiSelect } from "@/components/ui/ui-controls";
import { accessApi } from "@/features/access/api";
import { adminApi } from "@/features/admin/api";
import { accessKeys, useAccessUsers, useInvitations } from "@/features/access/queries";
import { billingKeys, useEntitlements } from "@/features/billing/queries";
import { getScopeContext, useScopeContext } from "@/features/scope/scope-context";
import { errorMessage } from "@/lib/api/error-messages";
import { isApiError } from "@/lib/api/errors";
import type { PagedResult } from "@/lib/api/paging";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { getEmployerSelection, getOrganizationSelection, getSession } from "@/lib/session/storage";
import { openUpgradeDialog } from "@/features/billing/upgrade";
import type { AccessEmployer, AccessUser, EmployerAccessMode, EmployerOption, EmployerRole, OrganizationRole, UserInvitation } from "@/features/access/types";
import { formatDateDDMMYYYY } from "@/lib/format/date";
import { subscribeToScopeChanges, type ScopeChange } from "@/features/scope/scope-events";
import { useWatch, type FieldErrors } from "react-hook-form";
import { INVITATION_FIELD_ORDER, invitationSchema, type InvitationValues } from "@/features/access/schemas";
import { digitsOnly } from "@/lib/forms/input-masks";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { FormSelect } from "@/components/forms/form-select";
import { TableSkeleton } from "@/components/loading/skeleton";
import { PageHeader } from "@/components/layout/page-header";

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

const userTypeOptions = [
  { value: "platform", label: "אדמין מערכת" },
  { value: "organization", label: "משתמש ארגון" },
  { value: "employer", label: "משתמש מעסיק" },
] as const;

const permissionOptions = [
  { value: "1", label: "מורשה" },
  { value: "0", label: "לא מורשה" },
];

type PermissionState = {
  canCreateEmployer: boolean;
  canEditEmployer: boolean;
  canCreateEmployee: boolean;
  canEditEmployee: boolean;
  canCreateReport: boolean;
  canTransmitReport: boolean;
};

function roleDefaults(role: OrganizationRole, accessMode: EmployerAccessMode): PermissionState {
  const canOperate = role !== 4;
  return {
    canCreateEmployer: role === 1 && accessMode === 1,
    canEditEmployer: canOperate,
    canCreateEmployee: canOperate,
    canEditEmployee: canOperate,
    canCreateReport: canOperate,
    canTransmitReport: canOperate,
  };
}

export default function AccessPage() {
  const router = useRouter();
  const session = getSession();
  const isPlatformAdmin = Boolean(session?.platformAdmin);

  const [organizationId, setOrganizationId] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [selected, setSelected] = useState<AccessUser | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"scope" | "platform">("scope");
  const [error, setError] = useState("");
  const [role, setRole] = useState<OrganizationRole>(4);
  const [userType, setUserType] = useState<"platform" | "organization" | "employer">("organization");
  const [accessMode, setAccessMode] = useState<EmployerAccessMode>(2);
  const [permissions, setPermissions] = useState<PermissionState>(roleDefaults(4, 2));
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const scope = useScopeContext();
  const organizations = useMemo(() => scope.data?.organizations ?? [], [scope.data]);
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const usersQuery = useAccessUsers(viewMode === "scope" ? organizationId : "", viewMode === "scope" ? employerId : "", debouncedSearch, PAGE_SIZE);
  const platformUsersQuery = useQuery({
    queryKey: ["platform", "users", "access-management"],
    queryFn: adminApi.platformUsers,
    enabled: viewMode === "platform" && isPlatformAdmin,
  });
  const users = useMemo<AccessUser[]>(() => {
    if (viewMode === "scope") return usersQuery.data?.pages.flatMap((page) => page.items) ?? [];
    return (platformUsersQuery.data ?? []).filter((user) => user.isPlatformAdmin &&
      (user.email.toLowerCase().includes(debouncedSearch.toLowerCase()) || user.displayName.toLowerCase().includes(debouncedSearch.toLowerCase())))
      .map((user) => ({
        membershipId: null, userId: user.id, displayName: user.displayName, email: user.email,
        isActive: user.isActive, isPlatformAdmin: true, role: null, employerAccessMode: 2,
        canCreateEmployer: false, canEditEmployer: false, canCreateEmployee: false,
        canEditEmployee: false, canCreateReport: false, canTransmitReport: false, directEmployerOnly: true,
      }));
  }, [viewMode, usersQuery.data, platformUsersQuery.data, debouncedSearch]);
  const loading = viewMode === "scope" ? (usersQuery.isLoading || usersQuery.isFetchingNextPage) : platformUsersQuery.isLoading;
  const entitlements = useEntitlements(organizationId).data ?? null;
  const invitations = useInvitations(organizationId).data ?? [];
  const inviteEmployers = useMemo(() => organizations.find((item) => item.id === organizationId)?.employers ?? [], [organizations, organizationId]);
  const loadError = (viewMode === "scope" ? usersQuery.error : platformUsersQuery.error) ? errorMessage((viewMode === "scope" ? usersQuery.error : platformUsersQuery.error), "טעינת המשתמשים נכשלה") : "";

  const [assigned, setAssigned] = useState<AccessEmployer[]>([]);
  const [assignedSearch, setAssignedSearch] = useState("");
  const [assignedSkip, setAssignedSkip] = useState(0);
  const [assignedHasMore, setAssignedHasMore] = useState(false);
  const [employerSearch, setEmployerSearch] = useState("");
  const [employerOptions, setEmployerOptions] = useState<EmployerOption[]>([]);
  const [assignedLoaded, setAssignedLoaded] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [newUserKind, setNewUserKind] = useState<"customer" | "referent">("customer");
  const inviteForm = useZodForm(invitationSchema, {
    defaultValues: { email: "", nationalId: "", phone: "", scope: "organization", organizationRole: 4, employerRole: 3, employerId: "" },
  });
  const inviteScope = useWatch({ control: inviteForm.control, name: "scope" });
  const [inviting, setInviting] = useState(false);


  useEffect(() => {
    getScopeContext().then((scope) => {
      const items = scope.organizations;
      const saved = getOrganizationSelection();
      const nextOrganizationId = saved && items.some((x) => x.id === saved) ? saved : items[0]?.id ?? "";
      setOrganizationId(nextOrganizationId);
      const employer = getEmployerSelection();
      setEmployerId(employer?.organizationId === nextOrganizationId ? employer.employerId : "");
    }).catch((err) => setError(errorMessage(err, "טעינת הארגונים נכשלה")));

    const handler = (detail: ScopeChange) => {
      setOrganizationId(detail.organizationId);
      setEmployerId(detail.employerId ?? "");
      setSelected(null);
      setSearch("");
    };
    const unsubscribeScope = subscribeToScopeChanges(handler);
    return () => unsubscribeScope();
  }, []);



  // Default invitation employer: keep the current choice while it stays valid.
  useEffect(() => {
    const current = inviteForm.getValues("employerId");
    inviteForm.setValue("employerId", current && inviteEmployers.some((x) => x.id === current) ? current : inviteEmployers[0]?.id ?? "");
  }, [inviteEmployers, inviteForm]);

  // A refreshed user list re-binds the open editor to the server copy (or closes it), as before.
  useEffect(() => {
    setSelected((current) => current ? users.find((x) => x.userId === current.userId) ?? null : null);
  }, [users]);

  useEffect(() => {
    if (!selected) return;
    setRole(selected.role ?? 4);
    setUserType(selected.isPlatformAdmin ? "platform" : selected.directEmployerOnly ? "employer" : "organization");
    setAccessMode(selected.employerAccessMode);
    setPermissions({
      canCreateEmployer: selected.canCreateEmployer,
      canEditEmployer: selected.canEditEmployer,
      canCreateEmployee: selected.canCreateEmployee,
      canEditEmployee: selected.canEditEmployee,
      canCreateReport: selected.canCreateReport,
      canTransmitReport: selected.canTransmitReport,
    });
    setAssignedSkip(0);
    setAssignedSearch("");
    setEmployerSearch("");
    setEmployerOptions([]);
    setAssignedLoaded(false);
  }, [selected]);

  useEffect(() => {
    if (!organizationId || !selected || (userType !== "employer" && (userType !== "organization" || accessMode !== 2))) {
      setAssigned([]);
      setAssignedHasMore(false);
      return;
    }
    // Replies for a previous organization, user or search are dropped once this effect is cleaned up.
    let active = true;
    const timer = window.setTimeout(() => {
      accessApi.assignedEmployers(organizationId, selected.userId, assignedSearch.trim(), assignedSkip, PAGE_SIZE)
        .then((result) => {
          if (!active) return;
          if (!assignedSearch.trim() && assignedSkip === 0) {
            setAssigned(result.items);
            setAssignedLoaded(true);
          } else if (!assignedSearch.trim() && assignedSkip > 0) {
            setAssigned((current) => [...current, ...result.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
          }
          setAssignedHasMore(result.hasMore);
        })
        .catch((err) => { if (active) setError(errorMessage(err, "טעינת המעסיקים המורשים נכשלה")); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [organizationId, selected, userType, accessMode, assignedSearch, assignedSkip, assignedLoaded]);

  useEffect(() => {
    if (!organizationId || !selected) {
      setEmployerOptions([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      accessApi.employerAccessOptions(organizationId, selected.userId, employerSearch.trim(), 10)
        .then((items) => { if (active) setEmployerOptions(items.map((item) => ({ ...item, assigned: assigned.some((x) => x.id === item.id) }))); })
        .catch((err) => { if (active) setError(errorMessage(err, "חיפוש המעסיקים נכשל")); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [organizationId, selected, employerSearch, assigned]);

  /** Applies a local edit to every cached page of the current user list. */
  function updateCachedUsers(update: (items: AccessUser[]) => AccessUser[]) {
    queryClient.setQueryData<InfiniteData<PagedResult<AccessUser>>>(accessKeys.users(organizationId, employerId, debouncedSearch, PAGE_SIZE),
      (data) => data && { ...data, pages: data.pages.map((page) => ({ ...page, items: update(page.items) })) });
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
    if (userType !== "platform" &&
        (userType === "employer" || accessMode === 2) && !assignedLoaded) {
      setError("יש להמתין לטעינת שיוכי המעסיקים לפני שמירה.");
      return;
    }
    if (userType !== "platform" &&
        (userType === "employer" || accessMode === 2) && assigned.length === 0) {
      setError("יש לשייך לפחות מעסיק אחד לסוג הגישה שנבחר.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await accessApi.updateUserType(organizationId, selected.userId, {
        type: userType,
        role,
        employerAccessMode: accessMode,
        ...permissions,
        employers: userType === "platform" || (userType === "organization" && accessMode === 1)
          ? [] : assigned.map(({ id, role: employerRole }) => ({ employerId: id, role: employerRole })),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accessKeys.organization(organizationId) }),
        queryClient.invalidateQueries({ queryKey: ["platform", "users", "access-management"] }),
      ]);
      setSelected(null);
    } catch (err) {
      setError(errorMessage(err, "שמירת ההרשאות נכשלה"));
    } finally {
      setSaving(false);
    }
  }

  async function removeUser() {
    if (!selected || !window.confirm(`להסיר את ${selected.displayName} מהארגון?`)) return;
    try {
      await accessApi.removeAccessUser(organizationId, selected.userId);
      updateCachedUsers((items) => items.filter((item) => item.userId !== selected.userId));
      setSelected(null);
    } catch (err) {
      setError(errorMessage(err, "הסרת המשתמש נכשלה"));
    }
  }

  /** Shows the first failing rule in the screen notice, as before. */
  function showFirstInvitationError(errors: FieldErrors<InvitationValues>) {
    const field = INVITATION_FIELD_ORDER.find((name) => errors[name]?.message);
    if (field) setError(errors[field]?.message ?? "");
  }

  async function createInvitation(values: InvitationValues) {
    setInviting(true);
    setError("");
    try {
      const identity = { email: values.email, nationalId: values.nationalId, phone: values.phone };
      await accessApi.createInvitation(organizationId, values.scope === "organization"
        ? { ...identity, organizationRole: values.organizationRole, expiresInDays: 7 }
        : { ...identity, employerId: values.employerId, employerRole: values.employerRole, expiresInDays: 7 });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accessKeys.organization(organizationId) }),
        queryClient.invalidateQueries({ queryKey: billingKeys.entitlements(organizationId) }),
      ]);
      inviteForm.reset({ ...inviteForm.getValues(), email: "", nationalId: "", phone: "" });
      setInviteOpen(false);
    } catch (err) {
      const code = isApiError(err) ? err.code : "";
      setError(code === "EXISTING_IDENTITY_PHONE_PAIR_NOT_SUPPORTED_YET"
        ? "כבר קיים במערכת משתמש עם אותו שילוב של תעודת זהות + מספר פלאפון. כרגע לא ניתן להוסיף משתמש קיים לארגון; נטפל בתרחיש הזה בהמשך."
        : code === "INVITATION_ALREADY_PENDING" ? "כבר קיימת הזמנה פעילה לאימייל הזה." : errorMessage(err, "שליחת ההזמנה נכשלה"));
    } finally {
      setInviting(false);
    }
  }

  async function cancelInvitation(invitationId: string) {
    try {
      await accessApi.cancelInvitation(organizationId, invitationId);
      await queryClient.invalidateQueries({ queryKey: accessKeys.invitations(organizationId) });
    } catch (err) {
      setError(errorMessage(err, "ביטול ההזמנה נכשל"));
    }
  }

  function grantEmployer(item: EmployerOption) {
    if (assigned.some((x) => x.id === item.id)) return;
    setAssigned((items) => [...items, {
      id: item.id,
      legalName: item.legalName,
      registrationNumber: item.registrationNumber,
      role: 3,
    }]);
    setEmployerOptions((items) => items.map((x) => x.id === item.id ? { ...x, assigned: true } : x));
  }

  function updateEmployerRole(employerId: string, nextRole: EmployerRole) {
    setAssigned((items) => items.map((x) => x.id === employerId ? { ...x, role: nextRole } : x));
  }

  function revokeEmployer(employerId: string) {
    setAssigned((items) => items.filter((x) => x.id !== employerId));
    setEmployerOptions((items) => items.map((x) => x.id === employerId ? { ...x, assigned: false } : x));
  }

  return <AppShell title="משתמשים והרשאות" hideScopeController={viewMode === "platform"}>
    <PageHeader title="משתמשים והרשאות" description="ניהול משתמשים והרשאות לפי הארגון והמעסיק שנבחרו."
      actions={<button className="btn btn-primary" type="button" onClick={() => {
          // Internal referents are not customer seats; platform admins may choose
          // their user type even when the currently selected customer's quota is full.
          if (!isPlatformAdmin && entitlements && entitlements.users.maximum !== null &&
              entitlements.users.current >= entitlements.users.maximum) {
            openUpgradeDialog({ reason: "users", planName: entitlements.plan.name, current: entitlements.users.current, maximum: entitlements.users.maximum ?? undefined });
            return;
          }
          setNewUserKind("customer");
          setInviteOpen(true);
        }}><Mail size={18} />משתמש חדש</button>} />

    {error || loadError ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error || loadError}</div> : null}


      {entitlements?.plan.code === "FREE" ? <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head" style={{ marginBottom: 10 }}><div><h3>שימוש במסלול {entitlements.plan.name}</h3></div></div>
        <PlanUsage label="משתמשים" usage={entitlements.users} />
      </section> : null}

      {entitlements?.plan.code === "FREE" && entitlements.users.maximum !== null && entitlements.users.current >= entitlements.users.maximum ? <div className="notice notice-info" style={{ marginBottom: 18 }}>
        <b>הגעתם למגבלת המשתמשים במסלול.</b>
        <div style={{ marginTop: 10 }}><button className="btn btn-primary" type="button" onClick={() => openUpgradeDialog({ reason: "users", planName: entitlements.plan.name, current: entitlements.users.current, maximum: entitlements.users.maximum ?? undefined })}>יצירת קשר לשדרוג</button></div>
      </div> : null}

      {invitations.length ? <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><div><h2>הזמנות</h2><span style={{ color: "var(--color-text-muted)" }}>הזמנות שנשלחו מהארגון ועדיין מנוהלות כאן.</span></div></div>
        <DataTable
          items={invitations}
          rowKey={(item) => item.id}
          maxHeight={360}
          columns={[
            { key: "email", label: "אימייל" },
            { key: "access", label: "גישה" },
            { key: "status", label: "סטטוס" },
            { key: "expiry", label: "תוקף" },
            { key: "action", label: "" },
          ]}
          renderCells={(item) => [
            <b key="email">{item.email}</b>,
            item.employerName ?? "כל הארגון",
            invitationStatusLabel(item.status),
            formatDateDDMMYYYY(item.expiresAt, "—"),
            item.status === 1 ? <button key="cancel" className="btn btn-secondary" type="button" onClick={() => void cancelInvitation(item.id)}>ביטול</button> : null,
          ]}
        />
      </section> : null}

      <section className="card">
        <div className="toolbar">
          {isPlatformAdmin ? <div className="field" style={{ minWidth: 190 }}>
            <label htmlFor="access-view-filter">הצגת משתמשים</label>
            <UiSelect id="access-view-filter" value={viewMode} onChange={(event) => {
              setViewMode(event.target.value as "scope" | "platform");
              setSelected(null);
              setSearch("");
            }}>
              {[{ value: "scope", label: "משתמשי ארגון ומעסיק" },
                { value: "platform", label: "מנהלי מערכת בלבד" }].map((item) =>
                  <option key={item.value} value={item.value}>{item.label}</option>)}
            </UiSelect>
          </div> : null}
          <div className="search"><Search size={17} /><UiInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="חיפוש משתמש לפי שם או אימייל" /></div>
          {viewMode === "scope" ? <span className="badge badge-blue">{organizations.find((x) => x.id === organizationId)?.name ?? "ארגון"}</span> : null}
        </div>
        {loading && users.length === 0 ? <TableSkeleton columns={4} label="טוען משתמשים..." /> : users.length ? <DataTable
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
            <button key="cell-553" className="table-entity-link" type="button" onClick={(event) => { event.stopPropagation(); setSelected(item); }}>{item.displayName}</button>,
            item.email,
            item.isPlatformAdmin ? "אדמין מערכת" : item.role ? organizationRoleLabels[item.role] : "—",
            item.isPlatformAdmin ? "גישה גלובלית" : item.directEmployerOnly ? "גישה ישירה למעסיק" : employerAccessLabels[item.employerAccessMode],
          ]}
          hasMore={viewMode === "scope" && Boolean(usersQuery.hasNextPage)}
          loadingMore={viewMode === "scope" && usersQuery.isFetchingNextPage}
          onLoadMore={() => { if (viewMode === "scope" && !usersQuery.isFetching && usersQuery.hasNextPage) void usersQuery.fetchNextPage(); }}
        /> : <div className="empty"><ShieldCheck size={34} /><div>לא נמצאו משתמשים.</div></div>}
      </section>


    {inviteOpen ? <UserEditorModal
      title="משתמש חדש"
      subtitle={isPlatformAdmin ? "בחרו סוג משתמש: לקוח או רפרנט פנימי" : "הוספת משתמש לארגון באמצעות הזמנה מאובטחת"}
      onClose={() => setInviteOpen(false)}
      actions={<>
        <button className="btn btn-secondary" type="button" onClick={() => setInviteOpen(false)}>ביטול</button>
        {newUserKind === "referent" && isPlatformAdmin ?
          <button className="btn btn-primary" type="button" onClick={() => {
            setInviteOpen(false);
            router.push("/admin?tab=referents&create=1");
          }}><UserPlus size={17} />המשך ליצירת רפרנט ושיוכים</button>
          : <button className="btn btn-primary" type="button" disabled={inviting || (isPlatformAdmin && Boolean(entitlements?.users.maximum !== null && entitlements?.users.maximum !== undefined && entitlements.users.current >= entitlements.users.maximum))}
              onClick={() => void inviteForm.handleSubmit(createInvitation, showFirstInvitationError)()}><Mail size={17} />{inviting ? "שולח..." : "שליחת הזמנה"}</button>}
      </>}
    >
      {isPlatformAdmin ? <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="new-user-kind">סוג משתמש</label>
        <UiSelect id="new-user-kind" value={newUserKind}
          onChange={(event) => setNewUserKind(event.target.value as "customer" | "referent")}>
          {[{ value: "customer", label: "משתמש ארגון / מעסיק" },
            { value: "referent", label: "רפרנט פנימי" }].map((option) =>
            <option key={option.value} value={option.value}>{option.label}</option>)}
        </UiSelect>
      </div> : null}
      {newUserKind === "referent" && isPlatformAdmin
        ? <div className="notice notice-info">
            רפרנט הוא משתמש פנימי שאינו נספר במנוי הארגון. בשלב הבא תוכלו ליצור אותו
            ולשייך לו ארגונים שלמים או מעסיקים נבחרים מארגונים שונים.
          </div>
        : <>
      <div className="user-editor-grid">
        <div className="field"><label>אימייל</label><UiInput type="email" dir="ltr" maxLength={320} {...inviteForm.register("email")} placeholder="name@example.com" /></div>
        <div className="field"><label>תעודת זהות</label><UiInput inputMode="numeric" dir="ltr" maxLength={9} {...digitsOnly(inviteForm.register("nationalId"), 9)} /></div>
        <div className="field"><label>פלאפון</label><UiInput type="tel" inputMode="tel" dir="ltr" maxLength={10} {...digitsOnly(inviteForm.register("phone"), 10)} /></div>
      </div>
      <div className="grid two-cols" style={{ marginTop: 16 }}>
        <UiChoiceCard selected={inviteScope === "organization"} onClick={() => inviteForm.setValue("scope", "organization")}><ShieldCheck size={22} /><b>גישה לארגון</b><p>גישה ברמת הארגון לפי התפקיד שייבחר.</p></UiChoiceCard>
        <UiChoiceCard selected={inviteScope === "employer"} onClick={() => inviteForm.setValue("scope", "employer")}><Building2 size={22} /><b>גישה למעסיק</b><p>גישה ישירה למעסיק אחד בלבד.</p></UiChoiceCard>
      </div>
      {inviteScope === "organization" ? <div className="field" style={{ marginTop: 16 }}>
        <label>תפקיד בארגון</label>
        <FormSelect control={inviteForm.control} name="organizationRole" numeric>
          {(Object.keys(organizationRoleLabels) as unknown as OrganizationRole[]).map((value) => <option key={value} value={value}>{organizationRoleLabels[value]}</option>)}
        </FormSelect>
      </div> : <div className="grid two-cols" style={{ marginTop: 16 }}>
        <div className="field"><label>מעסיק</label><FormSelect control={inviteForm.control} name="employerId">{inviteEmployers.map((item) => <option key={item.id} value={item.id}>{item.legalName}</option>)}</FormSelect></div>
        <div className="field"><label>תפקיד אצל המעסיק</label><FormSelect control={inviteForm.control} name="employerRole" numeric>{(Object.keys(employerRoleLabels) as unknown as EmployerRole[]).map((value) => <option key={value} value={value}>{employerRoleLabels[value]}</option>)}</FormSelect></div>
      </div>}
      </>}
    </UserEditorModal> : null}

    {selected ? <UserEditorModal
      title={selected.displayName}
      subtitle={selected.email}
      onClose={() => setSelected(null)}
      actions={<>
        <button className="btn btn-danger" type="button" onClick={() => void removeUser()}><Trash2 size={17} />הסרת גישה</button>
        <span className="user-modal-actions-spacer" />
        <button className="btn btn-secondary" type="button" onClick={() => setSelected(null)}>סגירה</button>
        <button className="btn btn-primary" type="button" disabled={saving || (selected.isPlatformAdmin && !isPlatformAdmin)} onClick={() => void saveAccess()}><Save size={17} />{saving ? "שומר..." : "שמירת הרשאות"}</button>
      </>}
    >
      <div className="field" style={{ marginBottom: 16 }}>
        <label>סוג משתמש</label>
        <UiSelect value={userType} onChange={(event) => {
          const next = event.target.value as "platform" | "organization" | "employer";
          setUserType(next);
          if (next === "organization" && selected.directEmployerOnly) {
            setAccessMode(2);
            setPermissions(roleDefaults(role, 2));
          }
        }}>
          {userTypeOptions.filter((item) => isPlatformAdmin || item.value !== "platform")
            .map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </UiSelect>
      </div>
      {userType === "platform" ? <div className="notice notice-info" style={{ marginBottom: 16 }}>
        הרשאת אדמין מערכת היא גלובלית ומאפשרת ניהול של כלל הארגונים והמעסיקים.
        השיוכים הקיימים יישמרו לשימוש במקרה של הסרת ההרשאה בעתיד.
      </div> : userType === "employer" ? <div className="notice notice-info" style={{ marginBottom: 16 }}>
        גישה רק למעסיקים המשויכים להלן. חברות המשתמש בארגון הנוכחי תבוטל בעת השמירה.
      </div> : <>
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
            <PermissionSelect label="יצירת דיווח" value={permissions.canCreateReport} onChange={(value) => setPermissions((current) => ({ ...current, canCreateReport: value }))} />
            <PermissionSelect label="שידור דיווח" value={permissions.canTransmitReport} onChange={(value) => setPermissions((current) => ({ ...current, canTransmitReport: value }))} />
          </div>
        </div>
      </>}

      {userType !== "platform" && (userType === "employer" || accessMode === 2) ? <div className="user-employer-access-section">
        <h3>מעסיקים מורשים</h3>
        <div className="grid two-cols">
          <div>
            <div className="toolbar"><div className="search"><Search size={16} /><UiInput value={assignedSearch} onChange={(event) => { setAssignedSearch(event.target.value); setAssignedSkip(0); }} placeholder="חיפוש במעסיקים שהוקצו" /></div></div>
            {assigned.length ? <DataTable
              items={assigned}
              maxHeight={340}
              rowHeight={54}
              rowKey={(item) => item.id}
              columns={[{ key: "name", label: "מעסיק" }, { key: "reg", label: "ח.פ." }, { key: "role", label: "תפקיד במעסיק" }, { key: "action", label: "" }]}
              renderCells={(item) => [
                <span key="cell-691"><Building2 size={16} /> {item.legalName}</span>,
                item.registrationNumber,
                <UiSelect key="cell-693" aria-label={`תפקיד אצל ${item.legalName}`} value={item.role} onClick={(event) => event.stopPropagation()} onChange={(event) => void updateEmployerRole(item.id, Number(event.target.value) as EmployerRole)}>{(Object.keys(employerRoleLabels) as unknown as EmployerRole[]).map((value) => <option key={value} value={value}>{employerRoleLabels[value]}</option>)}</UiSelect>,
                <button key="cell-694" className="btn btn-secondary" type="button" onClick={() => void revokeEmployer(item.id)}>הסר</button>,
              ]}
              hasMore={assignedHasMore}
              onLoadMore={() => { if (assignedHasMore) setAssignedSkip(assigned.length); }}
            /> : <div className="empty">לא הוקצו מעסיקים למשתמש.</div>}
          </div>
          <div>
            <div className="toolbar"><div className="search"><Search size={16} /><UiInput value={employerSearch} onChange={(event) => setEmployerSearch(event.target.value)} placeholder="חיפוש מעסיק להקצאה" /></div></div>
            {employerOptions.length ? <DataTable
              items={employerOptions}
              maxHeight={340}
              rowHeight={58}
              rowKey={(item) => item.id}
              columns={[{ key: "name", label: "מעסיק" }, { key: "action", label: "" }]}
              renderCells={(item) => [
                <span key="cell-709"><b>{item.legalName}</b><div style={{ color: "var(--color-text-muted)" }}>{item.registrationNumber}</div></span>,
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
      {permissionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </UiSelect>
  </div>;
}

function invitationStatusLabel(status: UserInvitation["status"]) {
  if (status === 2) return "נוצלה";
  if (status === 3) return "פג תוקף";
  if (status === 4) return "בוטלה";
  return "ממתינה";
}
