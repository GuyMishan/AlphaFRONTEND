"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, CreditCard, Landmark, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { DataTable, DataTableLink } from "@/components/data-table";
import { AppTabs } from "@/components/app-tabs";
import { SubscriptionBillingPanel } from "@/components/subscription-billing-panel";
import { EmployerTransferModal } from "@/components/employer-transfer-modal";
import { getSession } from "@/lib/session";
import { OrganizationPensionPaymentAccount } from "@/components/organization-pension-payment-account";
import { PlanUsage } from "@/components/plan-usage";
import { alphaApi } from "@/lib/api";
import { UiInput, UiSelect } from "@/components/ui-controls";
import { organizationTypeLabel, organizationTypeOptions } from "@/lib/organization-types";
import { employerStatusLabel } from "@/lib/employer-status";
import type {
  Employer,
  EntitlementSnapshot,
  OrganizationEmployerBilling,
  OrganizationMemberSummary,
  OrganizationProfileCenter,
} from "@/lib/types";

type TabKey = "general" | "employers" | "users" | "pension-payment" | "billing";

const tabs: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: "general", label: "פרטים כלליים", icon: Building2 },
  { key: "employers", label: "מעסיקים", icon: Landmark },
  { key: "users", label: "משתמשים והרשאות", icon: Users },
  { key: "pension-payment", label: "תשלום פנסיוני", icon: Landmark },
  { key: "billing", label: "מנוי וחיוב ALPHA", icon: CreditCard },
];

export default function OrganizationProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("general");
  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab && tabs.some((item) => item.key === requestedTab)) setTab(requestedTab as TabKey);
  }, []);

  function changeTab(nextTab: string) {
    const next = nextTab as TabKey;
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url.pathname + `?${url.searchParams.toString()}` + url.hash);
  }
  const [profile, setProfile] = useState<OrganizationProfileCenter | null>(null);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [members, setMembers] = useState<OrganizationMemberSummary[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementSnapshot | null>(null);
  const [employerBilling, setEmployerBilling] = useState<OrganizationEmployerBilling[]>([]);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [profileRow, employerRows, memberRows, entitlementRow, billingRows] = await Promise.all([
        alphaApi.organizationProfile(id),
        alphaApi.employers(id),
        alphaApi.organizationMembers(id),
        alphaApi.entitlements(id),
        alphaApi.organizationEmployerBilling(id),
      ]);
      setProfile(profileRow);
      setEmployers(employerRows);
      setMembers(memberRows);
      setEntitlements(entitlementRow);
      setEmployerBilling(billingRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת פרופיל הארגון נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id]);

  if (loading) return <AppShell title="פרופיל ארגון" hideScopeController><div className="empty">טוען פרופיל ארגון...</div></AppShell>;
  if (error || !profile) return <AppShell title="פרופיל ארגון" hideScopeController><div className="notice notice-error">{error || "הארגון לא נמצא או שאין לך גישה אליו."}</div></AppShell>;

  return <AppShell title="פרופיל ארגון" hideScopeController>
    <div className="page-head">
      <div><h1>{profile.name}</h1><p>מרכז ניהול הארגון</p></div>
      <button className="btn btn-secondary" type="button" onClick={() => router.push("/dashboard")}>חזרה לדף הבית</button>
    </div>

    <AppTabs items={tabs} activeKey={tab} onChange={changeTab} ariaLabel="פרופיל ארגון" />

    {tab === "general" ? <GeneralTab profile={profile} onSaved={async () => { await load(); }} /> : null}
    {tab === "employers" ? <>
      {getSession()?.platformAdmin ? <div className="form-actions" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-primary" onClick={() => setReceiveOpen(true)}>שיוך מעסיק קיים</button>
      </div> : null}
      <EmployersTab organizationId={id} employers={employers} employerBilling={employerBilling}
        canCreate={Boolean(profile.canManageOrganization && entitlements && (entitlements.employers.maximum === null || entitlements.employers.current < entitlements.employers.maximum))}
        entitlements={entitlements} onTransferred={load} />
      {getSession()?.platformAdmin ? <EmployerTransferModal open={receiveOpen}
        receiveIntoOrganizationId={id} onClose={() => setReceiveOpen(false)} onTransferred={load} /> : null}
    </> : null}
    {tab === "users" ? <UsersTab organizationId={id} members={members} canManage={profile.canManageOrganization} /> : null}
    {tab === "pension-payment" ? <OrganizationPensionPaymentAccount organizationId={id} canManage={profile.canManageOrganization} /> : null}
    {tab === "billing" && entitlements ? <SubscriptionBillingPanel organizationId={id} entitlements={entitlements} canManage={profile.canManageOrganization} onChanged={load} /> : null}
  </AppShell>;
}

function GeneralTab({ profile, onSaved }: { profile: OrganizationProfileCenter; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    name: profile.name,
    type: profile.type,
    ...profile.general,
  });
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await alphaApi.updateOrganizationGeneral(profile.id, {
        ...form,
        postalCode: form.postalCode.replace(/\D/g, ""),
        contactPhone: form.contactPhone.replace(/\D/g, ""),
      });
      await onSaved();
      toast.success("פרטי הארגון נשמרו");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת פרטי הארגון נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return <section className="card profile-card">
    <div className="card-head"><div><h2>פרטים כלליים</h2><span style={{ color: "var(--muted)" }}>פרטי החברה, כתובת ואיש קשר ארגוני.</span></div></div>
    {!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization) ? <div className="notice notice-info" style={{ marginBottom: 18 }}>הפרטים מוצגים לקריאה בלבד. משתמש מורשה יכול לעדכן את פרטי הארגון.</div> : null}
    <form className="form" onSubmit={save}>
      <div className="grid organization-details-grid">
        <div className="field"><label>שם הארגון</label><UiInput disabled={!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization)} required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label>סוג ארגון</label><UiSelect disabled={!profile.canManageOrganization} value={form.type} onChange={(e) => setForm({ ...form, type: Number(e.target.value) })}>{!organizationTypeOptions.some(option => option.value === form.type) ? <option value={form.type} disabled>{organizationTypeLabel(form.type)} (סוג קיים)</option> : null}{organizationTypeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</UiSelect></div>
        <div className="field"><label>מספר חברה / עוסק</label><UiInput disabled={!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization)} maxLength={30} value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} /></div>
        <div className="field"><label>איש קשר</label><UiInput disabled={!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization)} maxLength={150} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
        <div className="field"><label>אימייל איש קשר</label><UiInput disabled={!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization)} type="email" maxLength={320} value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
        <div className="field"><label>טלפון איש קשר</label><UiInput disabled={!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization)} maxLength={20} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value.replace(/\D/g, "") })} /></div>
        <div className="field"><label>יישוב</label><UiInput disabled={!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization)} maxLength={100} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        <div className="field"><label>רחוב</label><UiInput disabled={!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization)} maxLength={100} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
        <div className="field"><label>מספר בית</label><UiInput disabled={!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization)} maxLength={20} value={form.houseNumber} onChange={(e) => setForm({ ...form, houseNumber: e.target.value })} /></div>
        <div className="field"><label>דירה</label><UiInput disabled={!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization)} maxLength={20} value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} /></div>
        <div className="field"><label>מיקוד</label><UiInput disabled={!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization)} maxLength={10} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value.replace(/\D/g, "") })} /></div>
        <div className="field"><label>תא דואר</label><UiInput disabled={!(profile.canEditOrganizationGeneral ?? profile.canManageOrganization)} maxLength={20} value={form.postOfficeBox} onChange={(e) => setForm({ ...form, postOfficeBox: e.target.value })} /></div>
      </div>
      {(profile.canEditOrganizationGeneral ?? profile.canManageOrganization) ? <div className="form-actions"><span /><button className="btn btn-primary" disabled={saving} type="submit"><Save size={17} />{saving ? "שומר..." : "שמירת פרטים"}</button></div> : null}
    </form>
  </section>;
}

function EmployersTab({ organizationId, employers, employerBilling, canCreate, entitlements, onTransferred }: { organizationId: string; employers: Employer[]; employerBilling: OrganizationEmployerBilling[]; canCreate: boolean; entitlements: EntitlementSnapshot | null; onTransferred: () => Promise<void> }) {
  const [moving, setMoving] = useState<Employer | null>(null);
  const billingByEmployer = new Map(employerBilling.map((item) => [item.employerId, item]));

  return <><section className="card">
    <div className="card-head">
      <div><h2>מעסיקים</h2><span style={{ color: "var(--muted)" }}>כל המעסיקים בארגון ואופן החיוב שלהם. שינוי הגדרות החיוב מתבצע מתוך כרטיס המעסיק.</span></div>
      {canCreate ? <Link className="btn btn-primary" href={`/employers/new?organizationId=${organizationId}`}>מעסיק חדש</Link> : null}
    </div>
    {entitlements?.plan.code === "FREE" ? <div style={{ marginBottom: 18 }}><PlanUsage label="מעסיקים במסלול" usage={entitlements.employers} /></div> : null}
    {employers.length === 0 ? <div className="empty">אין מעסיקים בארגון.</div> : <DataTable
      items={employers}
      rowKey={(item) => item.id}
      columns={[{ key: "employer", label: "מעסיק" }, { key: "registration", label: "מספר חברה" }, { key: "withholding", label: "תיק ניכויים" }, { key: "billing", label: "אופן חיוב" }, { key: "billedThrough", label: "מחויב דרך" }, { key: "status", label: "סטטוס" }, ...(getSession()?.platformAdmin ? [{ key: "actions", label: "פעולות" }] : [])]}
      renderCells={(item) => {
        const billing = billingByEmployer.get(item.id);
        return [
          <DataTableLink key="employer" className="profile-link" href={`/employers/${item.id}?organizationId=${organizationId}`}>{item.legalName}</DataTableLink>,
          item.registrationNumber,
          item.withholdingFileNumber,
          billing ? (billing.billingMode === 2 ? "חיוב דרך הארגון" : "חיוב עצמאי") : "—",
          billing?.billedThroughName || "—",
          employerStatusLabel(item.status),
          ...(getSession()?.platformAdmin ? [<button key="transfer" className="btn btn-secondary" type="button" onClick={() => setMoving(item)}>העבר / נתק שיוך</button>] : []),
        ];
      }}
    />}
  </section>
  {getSession()?.platformAdmin && moving ? <EmployerTransferModal open employer={moving} onClose={() => setMoving(null)} onTransferred={onTransferred} /> : null}
  </>;
}
function UsersTab({ organizationId, members, canManage }: { organizationId: string; members: OrganizationMemberSummary[]; canManage: boolean }) {
  const roleLabel = (role: number) => role === 1 ? "Admin" : role === 2 ? "Payroll Manager" : role === 3 ? "Operations Agent" : "Viewer";
  return <section className="card">
    <div className="card-head"><div><h2>משתמשים והרשאות</h2><span style={{ color: "var(--muted)" }}>משתמשי Organization-level והגישה שלהם למעסיקים.</span></div>{canManage ? <Link className="btn btn-primary" href="/access">ניהול הרשאות</Link> : null}</div>
    {members.length === 0 ? <div className="empty">אין משתמשים פעילים בארגון.</div> : <DataTable
      items={members}
      rowKey={(item) => item.userId}
      columns={[{ key: "user", label: "משתמש" }, { key: "email", label: "אימייל" }, { key: "role", label: "Role" }, { key: "access", label: "גישה למעסיקים" }]}
      renderCells={(item) => [<b key="user">{item.displayName}</b>, item.email, roleLabel(item.role), item.employerAccessMode === 1 ? "כל המעסיקים" : "מעסיקים נבחרים"]}
    />}
    <div className="notice notice-info" style={{ marginTop: 18 }}>משתמש חדש מצטרף דרך הזמנה במייל, הרשמה ואימות OTP. ההרשאות נוצרות רק לאחר השלמת האימות.</div>
  </section>;
}
