"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, CreditCard, Landmark, Save, Settings2, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { AlphaBillingAccountForm } from "@/components/alpha-billing-account-form";
import { OrganizationPensionPaymentAccount } from "@/components/organization-pension-payment-account";
import { PlanUsage } from "@/components/plan-usage";
import { alphaApi } from "@/lib/api";
import { UiInput, UiSelect } from "@/components/ui-controls";
import type {
  Employer,
  EntitlementSnapshot,
  OrganizationEmployerBilling,
  OrganizationMemberSummary,
  OrganizationProfileCenter,
  SubscriptionSummary,
} from "@/lib/types";

type TabKey = "general" | "employers" | "users" | "pension-payment" | "billing" | "subscription" | "employer-billing";

const tabs: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: "general", label: "פרטים כלליים", icon: Building2 },
  { key: "employers", label: "מעסיקים", icon: Landmark },
  { key: "users", label: "משתמשים והרשאות", icon: Users },
  { key: "pension-payment", label: "תשלום פנסיוני", icon: Landmark },
  { key: "billing", label: "חיוב ALPHA", icon: CreditCard },
  { key: "subscription", label: "מנוי", icon: Settings2 },
  { key: "employer-billing", label: "חיוב למעסיקים", icon: ShieldCheck },
];

export default function OrganizationProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("general");
  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab && tabs.some((item) => item.key === requestedTab)) setTab(requestedTab as TabKey);
  }, []);
  const [profile, setProfile] = useState<OrganizationProfileCenter | null>(null);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [members, setMembers] = useState<OrganizationMemberSummary[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementSnapshot | null>(null);
  const [employerBilling, setEmployerBilling] = useState<OrganizationEmployerBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const [profileRow, employerRows, memberRows, subscriptionRow, entitlementRow, billingRows] = await Promise.all([
        alphaApi.organizationProfile(id),
        alphaApi.employers(id),
        alphaApi.organizationMembers(id),
        alphaApi.subscription(id),
        alphaApi.entitlements(id),
        alphaApi.organizationEmployerBilling(id),
      ]);
      setProfile(profileRow);
      setEmployers(employerRows);
      setMembers(memberRows);
      setSubscription(subscriptionRow);
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

    <div className="profile-tabs" role="tablist" aria-label="פרופיל ארגון">
      {tabs.map(({ key, label, icon: Icon }) => <button
        key={key} type="button" role="tab" aria-selected={tab === key}
        className={`profile-tab${tab === key ? " active" : ""}`}
        onClick={() => setTab(key)}
      ><Icon size={17} />{label}</button>)}
    </div>

    {tab === "general" ? <GeneralTab profile={profile} onSaved={async () => { await load(); }} /> : null}
    {tab === "employers" ? <EmployersTab organizationId={id} employers={employers} canCreate={Boolean(profile.canManageOrganization && entitlements && entitlements.employers.current < entitlements.employers.maximum)} entitlements={entitlements} /> : null}
    {tab === "users" ? <UsersTab organizationId={id} members={members} canManage={profile.canManageOrganization} /> : null}
    {tab === "pension-payment" ? <OrganizationPensionPaymentAccount organizationId={id} canManage={profile.canManageOrganization} /> : null}
    {tab === "billing" ? <AlphaBillingAccountForm organizationId={id} canManage={profile.canManageOrganization} /> : null}
    {tab === "subscription" && subscription && entitlements ? <SubscriptionTab subscription={subscription} entitlements={entitlements} /> : null}
    {tab === "employer-billing" ? <EmployerBillingTab organizationId={id} items={employerBilling} canManage={profile.canManageOrganization} onChanged={setEmployerBilling} /> : null}
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
    {!profile.canManageOrganization ? <div className="notice notice-info" style={{ marginBottom: 18 }}>הפרטים מוצגים לקריאה בלבד. רק Organization Admin יכול לעדכן אותם.</div> : null}
    <form className="form" onSubmit={save}>
      <div className="grid two-cols">
        <div className="field"><label>שם הארגון</label><UiInput disabled={!profile.canManageOrganization} required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label>סוג ארגון</label><UiSelect disabled={!profile.canManageOrganization} value={form.type} onChange={(e) => setForm({ ...form, type: Number(e.target.value) })}><option value={1}>מעסיק</option><option value={2}>משרד שכר</option><option value={3}>סוכנות ביטוח</option><option value={4}>ספק תפעול</option><option value={5}>קבוצת חברות</option></UiSelect></div>
        <div className="field"><label>מספר חברה / עוסק</label><UiInput disabled={!profile.canManageOrganization} maxLength={30} value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} /></div>
        <div className="field"><label>איש קשר</label><UiInput disabled={!profile.canManageOrganization} maxLength={150} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
        <div className="field"><label>אימייל איש קשר</label><UiInput disabled={!profile.canManageOrganization} type="email" maxLength={320} value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
        <div className="field"><label>טלפון איש קשר</label><UiInput disabled={!profile.canManageOrganization} maxLength={20} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value.replace(/\D/g, "") })} /></div>
        <div className="field"><label>יישוב</label><UiInput disabled={!profile.canManageOrganization} maxLength={100} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        <div className="field"><label>רחוב</label><UiInput disabled={!profile.canManageOrganization} maxLength={100} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
        <div className="field"><label>מספר בית</label><UiInput disabled={!profile.canManageOrganization} maxLength={20} value={form.houseNumber} onChange={(e) => setForm({ ...form, houseNumber: e.target.value })} /></div>
        <div className="field"><label>דירה</label><UiInput disabled={!profile.canManageOrganization} maxLength={20} value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} /></div>
        <div className="field"><label>מיקוד</label><UiInput disabled={!profile.canManageOrganization} maxLength={10} value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value.replace(/\D/g, "") })} /></div>
        <div className="field"><label>תא דואר</label><UiInput disabled={!profile.canManageOrganization} maxLength={20} value={form.postOfficeBox} onChange={(e) => setForm({ ...form, postOfficeBox: e.target.value })} /></div>
      </div>
      {profile.canManageOrganization ? <div className="form-actions"><span /><button className="btn btn-primary" disabled={saving} type="submit"><Save size={17} />{saving ? "שומר..." : "שמירת פרטים"}</button></div> : null}
    </form>
  </section>;
}

function EmployersTab({ organizationId, employers, canCreate, entitlements }: { organizationId: string; employers: Employer[]; canCreate: boolean; entitlements: EntitlementSnapshot | null }) {
  return <section className="card">
    <div className="card-head">
      <div><h2>מעסיקים</h2><span style={{ color: "var(--muted)" }}>כל המעסיקים בארגון.</span></div>
      {canCreate ? <Link className="btn btn-primary" href={`/employers/new?organizationId=${organizationId}`}>מעסיק חדש</Link> : null}
    </div>
    {entitlements ? <div style={{ marginBottom: 18 }}><PlanUsage label="מעסיקים במסלול" usage={entitlements.employers} /></div> : null}
    {employers.length === 0 ? <div className="empty">אין מעסיקים בארגון.</div> : <div className="table-wrap"><table><thead><tr><th>מעסיק</th><th>מספר חברה</th><th>תיק ניכויים</th><th>סטטוס</th><th /></tr></thead><tbody>
      {employers.map((item) => <tr key={item.id}><td><b>{item.legalName}</b></td><td>{item.registrationNumber}</td><td>{item.withholdingFileNumber}</td><td>{item.status === 2 ? "פעיל" : "בתהליך הקמה"}</td><td><Link className="profile-link" href={`/employers/${item.id}?organizationId=${organizationId}`}>לפרופיל</Link></td></tr>)}
    </tbody></table></div>}
  </section>;
}

function UsersTab({ organizationId, members, canManage }: { organizationId: string; members: OrganizationMemberSummary[]; canManage: boolean }) {
  const roleLabel = (role: number) => role === 1 ? "Admin" : role === 2 ? "Payroll Manager" : role === 3 ? "Operations Agent" : "Viewer";
  return <section className="card">
    <div className="card-head"><div><h2>משתמשים והרשאות</h2><span style={{ color: "var(--muted)" }}>משתמשי Organization-level והגישה שלהם למעסיקים.</span></div>{canManage ? <Link className="btn btn-primary" href="/access">ניהול הרשאות</Link> : null}</div>
    {members.length === 0 ? <div className="empty">אין משתמשים פעילים בארגון.</div> : <div className="table-wrap"><table><thead><tr><th>משתמש</th><th>אימייל</th><th>Role</th><th>גישה למעסיקים</th></tr></thead><tbody>
      {members.map((item) => <tr key={item.userId}><td><b>{item.displayName}</b></td><td>{item.email}</td><td>{roleLabel(item.role)}</td><td>{item.employerAccessMode === 1 ? "כל המעסיקים" : "מעסיקים נבחרים"}</td></tr>)}
    </tbody></table></div>}
    <div className="notice notice-info" style={{ marginTop: 18 }}>משתמש חדש מצטרף דרך הזמנה במייל, הרשמה ואימות OTP. ההרשאות נוצרות רק לאחר השלמת האימות.</div>
  </section>;
}

function SubscriptionTab({ subscription, entitlements }: { subscription: SubscriptionSummary; entitlements: EntitlementSnapshot }) {
  return <div className="employer-profile-stack">
    <section className="card">
      <div className="card-head"><div><h2>מסלול {subscription.name}</h2><span style={{ color: "var(--muted)" }}>קוד מסלול: {subscription.code}</span></div><span className="badge badge-green">פעיל</span></div>
      <div className="grid stats">
        <PlanUsage label="מעסיקים" usage={entitlements.employers} />
        <PlanUsage label="עובדים פעילים" usage={entitlements.activeEmployees} />
        <PlanUsage label="משתמשים" usage={entitlements.users} />
      </div>
    </section>
    <div className="notice notice-info">שינוי Plan מתבצע כרגע על ידי Platform Admin. מסך זה מציג לארגון את המסלול, המגבלות והשימוש בפועל.</div>
  </div>;
}

function EmployerBillingTab({ organizationId, items, canManage, onChanged }: { organizationId: string; items: OrganizationEmployerBilling[]; canManage: boolean; onChanged: (items: OrganizationEmployerBilling[]) => void }) {
  async function update(item: OrganizationEmployerBilling, mode: 1 | 2) {
    try {
      await alphaApi.updateEmployerBilling(organizationId, item.employerId, mode);
      onChanged(await alphaApi.organizationEmployerBilling(organizationId));
      toast.success("הגדרת החיוב של המעסיק עודכנה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "עדכון החיוב נכשל");
    }
  }

  return <section className="card">
    <div className="card-head"><div><h2>הגדרות חיוב למעסיקים</h2><span style={{ color: "var(--muted)" }}>קובעים אם כל מעסיק מחויב ישירות או יורש את Billing הארגוני.</span></div></div>
    {items.length === 0 ? <div className="empty">אין מעסיקים בארגון.</div> : <div className="table-wrap"><table><thead><tr><th>מעסיק</th><th>אופן חיוב</th><th>מחויב דרך</th></tr></thead><tbody>
      {items.map((item) => <tr key={item.employerId}><td><b>{item.employerName}</b></td><td><UiSelect disabled={!canManage} value={item.billingMode} onChange={(e) => void update(item, Number(e.target.value) as 1 | 2)}><option value={1}>חיוב עצמאי</option><option value={2}>חיוב דרך הארגון</option></UiSelect></td><td><b>{item.billedThroughName}</b><div style={{ color: "var(--muted)", fontSize: 12 }}>{item.effectiveBillingConfigured ? "Billing Account מוגדר" : "Billing Account לא הוגדר"}{item.billingModeOverridden ? " · Override" : " · ברירת מחדל"}</div></td></tr>)}
    </tbody></table></div>}
  </section>;
}
