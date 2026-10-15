"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Building2, CreditCard, Landmark, Users } from "lucide-react";
import { AppShell } from "@/features/shell/components/app-shell";
import { DataTable, DataTableLink } from "@/components/ui/data-table";
import { AppTabPanel, AppTabs } from "@/components/ui/app-tabs";
import { replaceSearchParams } from "@/lib/url-search-params";
import { SubscriptionBillingPanel } from "@/features/billing/components/subscription-billing-panel";
import { OrganizationPensionPaymentAccount } from "@/features/payment-accounts/components/organization-pension-payment-account";
import { PlanUsage } from "@/features/billing/components/plan-usage";
import { billingKeys, useEntitlements } from "@/features/billing/queries";
import { employerKeys, useOrganizationEmployers } from "@/features/employers/queries";
import { organizationKeys, useOrganizationEmployerBilling, useOrganizationMembers, useOrganizationProfile } from "@/features/organizations/queries";
import { errorMessage } from "@/lib/api/error-messages";
import { useQueryClient } from "@tanstack/react-query";
import { employerStatusLabel } from "@/features/employers/employer-status";
import type { EntitlementSnapshot } from "@/features/billing/types";
import type { Employer } from "@/features/employers/types";
import type { OrganizationEmployerBilling, OrganizationMemberSummary } from "@/features/organizations/types";
import { OrganizationGeneralForm } from "@/features/organizations/components/organization-general-form";
import { PageSkeleton } from "@/components/loading/skeleton";
import { PageHeader } from "@/components/layout/page-header";

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
  // The selected tab lives in the URL (?tab=), so reloads, links and back/forward keep it.
  const requestedTab = useSearchParams().get("tab");
  const tab: TabKey = requestedTab && tabs.some((item) => item.key === requestedTab) ? requestedTab as TabKey : "general";

  function changeTab(next: string) {
    replaceSearchParams((params) => params.set("tab", next));
  }
  const queryClient = useQueryClient();
  const profileQuery = useOrganizationProfile(id);
  const employersQuery = useOrganizationEmployers(id);
  const membersQuery = useOrganizationMembers(id);
  const entitlementsQuery = useEntitlements(id);
  const employerBillingQuery = useOrganizationEmployerBilling(id);
  const queries = [profileQuery, employersQuery, membersQuery, entitlementsQuery, employerBillingQuery];
  const loading = queries.some((query) => query.isPending);
  const failure = queries.find((query) => query.error)?.error;
  const error = failure ? errorMessage(failure, "טעינת פרופיל הארגון נכשלה") : "";
  const profile = profileQuery.data;
  const employers = employersQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const entitlements = entitlementsQuery.data ?? null;
  const employerBilling = employerBillingQuery.data ?? [];

  /** Refetches everything this profile shows (after saves, transfers and billing changes). */
  async function load() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: employerKeys.list(id) }),
      queryClient.invalidateQueries({ queryKey: billingKeys.entitlements(id) }),
    ]);
  }

  if (loading) return <AppShell title="פרופיל ארגון" hideScopeController><PageSkeleton variant="form" label="טוען פרופיל ארגון..." /></AppShell>;
  if (error || !profile) return <AppShell title="פרופיל ארגון" hideScopeController><div className="notice notice-error">{error || "הארגון לא נמצא או שאין לך גישה אליו."}</div></AppShell>;

  return <AppShell title="פרופיל ארגון" hideScopeController>
    <PageHeader title={profile.name} description="מרכז ניהול הארגון"
      actions={<button className="btn btn-secondary" type="button" onClick={() => router.push("/dashboard")}>חזרה לדף הבית</button>} />

    <AppTabs id="organization-profile" items={tabs} activeKey={tab} onChange={changeTab} ariaLabel="פרופיל ארגון" />

    <AppTabPanel id="organization-profile" activeKey={tab}>

    {tab === "general" ? <OrganizationGeneralForm profile={profile} onSaved={async () => { await load(); }} /> : null}
    {tab === "employers" ? <>
      <EmployersTab organizationId={id} employers={employers} employerBilling={employerBilling}
        canCreate={Boolean(profile.canManageOrganization && entitlements && (entitlements.employers.maximum === null || entitlements.employers.current < entitlements.employers.maximum))}
        entitlements={entitlements} />
    </> : null}
    {tab === "users" ? <UsersTab organizationId={id} members={members} canManage={profile.canManageOrganization} /> : null}
    {tab === "pension-payment" ? <OrganizationPensionPaymentAccount organizationId={id} canManage={profile.canManageOrganization} /> : null}
    {tab === "billing" && entitlements ? <SubscriptionBillingPanel organizationId={id} entitlements={entitlements} canManage={profile.canManageOrganization} onChanged={load} /> : null}
    </AppTabPanel>
  </AppShell>;
}

function EmployersTab({ organizationId, employers, employerBilling, canCreate, entitlements }: { organizationId: string; employers: Employer[]; employerBilling: OrganizationEmployerBilling[]; canCreate: boolean; entitlements: EntitlementSnapshot | null }) {
  const billingByEmployer = new Map(employerBilling.map((item) => [item.employerId, item]));

  return <><section className="card">
    <div className="card-head">
      <div><h2>מעסיקים</h2><span style={{ color: "var(--color-text-muted)" }}>כל המעסיקים בארגון ואופן החיוב שלהם. שינוי הגדרות החיוב מתבצע מתוך כרטיס המעסיק.</span></div>
      {canCreate ? <Link className="btn btn-primary" href={`/employers/new?organizationId=${organizationId}`}>צור מעסיק חדש לארגון</Link> : null}
    </div>
    {entitlements?.plan.code === "FREE" ? <div style={{ marginBottom: 18 }}><PlanUsage label="מעסיקים במסלול" usage={entitlements.employers} /></div> : null}
    {employers.length === 0 ? <div className="empty">אין מעסיקים בארגון.</div> : <DataTable
      items={employers}
      rowKey={(item) => item.id}
      columns={[{ key: "employer", label: "מעסיק" }, { key: "registration", label: "מספר חברה" }, { key: "withholding", label: "תיק ניכויים" }, { key: "billing", label: "אופן חיוב" }, { key: "billedThrough", label: "מחויב דרך" }, { key: "status", label: "סטטוס" }]}
      renderCells={(item) => {
        const billing = billingByEmployer.get(item.id);
        return [
          <DataTableLink key="employer" className="profile-link" href={`/employers/${item.id}?organizationId=${organizationId}`}>{item.legalName}</DataTableLink>,
          item.registrationNumber,
          item.withholdingFileNumber,
          billing ? (billing.billingMode === 2 ? "חיוב דרך הארגון" : "חיוב עצמאי") : "—",
          billing?.billedThroughName || "—",
          employerStatusLabel(item.status),
        ];
      }}
    />}
  </section>
  </>;
}
function UsersTab({ members, canManage }: { organizationId: string; members: OrganizationMemberSummary[]; canManage: boolean }) {
  const roleLabel = (role: number) => role === 1 ? "Admin" : role === 2 ? "Payroll Manager" : role === 3 ? "Operations Agent" : "Viewer";
  return <section className="card">
    <div className="card-head"><div><h2>משתמשים והרשאות</h2><span style={{ color: "var(--color-text-muted)" }}>משתמשי Organization-level והגישה שלהם למעסיקים.</span></div>{canManage ? <Link className="btn btn-primary" href="/access">ניהול הרשאות</Link> : null}</div>
    {members.length === 0 ? <div className="empty">אין משתמשים פעילים בארגון.</div> : <DataTable
      items={members}
      rowKey={(item) => item.userId}
      columns={[{ key: "user", label: "משתמש" }, { key: "email", label: "אימייל" }, { key: "role", label: "Role" }, { key: "access", label: "גישה למעסיקים" }]}
      renderCells={(item) => [<b key="user">{item.displayName}</b>, item.email, roleLabel(item.role), item.employerAccessMode === 1 ? "כל המעסיקים" : "מעסיקים נבחרים"]}
    />}
    <div className="notice notice-info" style={{ marginTop: 18 }}>משתמש חדש מצטרף דרך הזמנה במייל, הרשמה ואימות OTP. ההרשאות נוצרות רק לאחר השלמת האימות.</div>
  </section>;
}
