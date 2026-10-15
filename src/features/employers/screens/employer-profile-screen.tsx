"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Building2, CreditCard, FileSliders, Files, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/features/shell/components/app-shell";
import { EmployerDocumentsTab } from "@/features/employers/components/employer-documents-tab";
import { getSession } from "@/lib/session/storage";
import { AppTabPanel, AppTabs } from "@/components/ui/app-tabs";
import { replaceSearchParams } from "@/lib/url-search-params";
import { SubscriptionBillingPanel } from "@/features/billing/components/subscription-billing-panel";
import { billingKeys, useEntitlements } from "@/features/billing/queries";
import { employerKeys, useEmployer, useEmployerCapabilities, useEmployerProfileSettings } from "@/features/employers/queries";
import { paymentAccountKeys, useEmployerPaymentAccounts } from "@/features/payment-accounts/queries";
import { useScopeContext } from "@/features/scope/scope-context";
import { errorMessage } from "@/lib/api/error-messages";
import { useQueryClient } from "@tanstack/react-query";
import type { Employer, EmployerCapabilities, EmployerProfileCenterSettings } from "@/features/employers/types";
import type { EmployerPaymentAccount } from "@/features/payment-accounts/types";
import { useUrlScope } from "@/lib/hooks/use-url-scope";
import { ReportingTab } from "@/features/employers/components/profile/reporting-tab";
import { GeneralTab } from "@/features/employers/components/profile/general-tab";
import { PensionPaymentTab } from "@/features/employers/components/profile/pension-payment-tab";
import { EmployerBillingInheritanceTab } from "@/features/employers/components/profile/billing-tab";
import { EmployeesTab } from "@/features/employers/components/profile/employees-tab";
import { PageSkeleton } from "@/components/loading/skeleton";
import { PageHeader } from "@/components/layout/page-header";

type TabKey = "general" | "employees" | "pension-payment" | "billing" | "reporting" | "documents";

const baseTabs: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: "general", label: "פרטים כלליים", icon: Building2 },
  { key: "employees", label: "עובדים", icon: Users },
  { key: "documents", label: "מסמכים", icon: Files },
  { key: "pension-payment", label: "תשלום פנסיוני", icon: WalletCards },
  { key: "billing", label: "מנוי וחיוב ALPHA", icon: CreditCard },
  { key: "reporting", label: "הגדרות דיווח", icon: FileSliders },
];

const EMPTY_CAPABILITIES: EmployerCapabilities = {
  canManageEmployer: false,
  canEditEmployer: false,
  canCreateEmployee: false,
  canEditEmployee: false,
  canCreateReport: false,
  canTransmitReport: false,
};

const EMPTY_SETTINGS: EmployerProfileCenterSettings = {
  address: { city: "", street: "", houseNumber: "", apartment: "", postalCode: "", postOfficeBox: "" },
  billing: { mode: 1, modeOverridden: false, status: 1, canChangeMode: false },
  pensionPayment: { mode: 2, modeOverridden: false, canChangeMode: false },
  reporting: {
    defaultSalaryPaymentDay: null,
    defaultDepositorTypeCode: 1,
    defaultEmployerIdentifierTypeCode: 1,
    defaultPaymentMethodCode: null,
    defaultEmployerAccountType: null,
    defaultReceiverAccountType: null,
    reportingNotes: "",
  },
};

export default function EmployerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { organizationId } = useUrlScope();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: TabKey = requestedTab && baseTabs.some(item => item.key === requestedTab) ? requestedTab as TabKey : "general";

  const queryClient = useQueryClient();
  const employerQuery = useEmployer(organizationId, id);
  const capabilitiesQuery = useEmployerCapabilities(organizationId, id);
  const settingsQuery = useEmployerProfileSettings(organizationId, id);
  const accountsQuery = useEmployerPaymentAccounts(organizationId, id);
  const scope = useScopeContext();

  // Single-employer users (not referents) also see their plan here.
  const accessibleEmployers = scope.data?.organizations.flatMap((organization) =>
    organization.employers.map((item) => ({ organizationId: organization.id, employerId: item.id }))) ?? [];
  const singleEmployerUser = accessibleEmployers.length === 1
    && accessibleEmployers[0].organizationId === organizationId
    && accessibleEmployers[0].employerId === id
    && !getSession()?.isReferent;
  const hasOrganizationContext = Boolean(scope.data?.organizations.find((organization) => organization.id === organizationId)?.hasOrganizationScope);
  const entitlementsQuery = useEntitlements(organizationId, singleEmployerUser);

  const queries = [employerQuery, capabilitiesQuery, settingsQuery, accountsQuery, scope];
  const loading = queries.some((query) => query.isPending) || (singleEmployerUser && entitlementsQuery.isPending);
  const failure = queries.find((query) => query.error)?.error ?? entitlementsQuery.error;
  const error = failure ? errorMessage(failure, "טעינת פרופיל המעסיק נכשלה") : "";
  const employer = employerQuery.data;
  const capabilities = capabilitiesQuery.data ?? EMPTY_CAPABILITIES;
  const settings = settingsQuery.data ?? EMPTY_SETTINGS;
  const accounts = accountsQuery.data ?? [];
  const entitlements = singleEmployerUser ? entitlementsQuery.data ?? null : null;

  // Tabs edit through these setters; saved values go straight into the query cache.
  const setEmployer = (value: Employer) => queryClient.setQueryData(employerKeys.detail(organizationId, id), value);
  const setSettings = (update: (current: EmployerProfileCenterSettings) => EmployerProfileCenterSettings) =>
    queryClient.setQueryData<EmployerProfileCenterSettings>(employerKeys.settings(organizationId, id), (current) => update(current ?? EMPTY_SETTINGS));
  const setAccounts: React.Dispatch<React.SetStateAction<EmployerPaymentAccount[]>> = (update) =>
    queryClient.setQueryData<EmployerPaymentAccount[]>(paymentAccountKeys.employerAccounts(organizationId, id),
      (current) => typeof update === "function" ? update(current ?? []) : update);

  /** Refetches everything on this profile (after billing changes). */
  async function load() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: employerKeys.detail(organizationId, id) }),
      queryClient.invalidateQueries({ queryKey: billingKeys.entitlements(organizationId) }),
    ]);
  }

  if (loading) return <AppShell title="פרופיל מעסיק" hideScopeController><PageSkeleton variant="form" label="טוען פרופיל מעסיק..." /></AppShell>;
  if (error || !employer) return <AppShell title="פרופיל מעסיק" hideScopeController><div className="notice notice-error">{error || "המעסיק לא נמצא."}</div></AppShell>;

  return <AppShell title="פרופיל מעסיק" hideScopeController>
    <PageHeader title={employer.legalName} description={`מרכז ניהול המעסיק · ח.פ./עוסק ${employer.registrationNumber}`} />

    <AppTabs
      id="employer-profile"
      items={baseTabs}
      activeKey={tab}
      onChange={(next) => replaceSearchParams((params) => params.set("tab", next))}
      ariaLabel="פרופיל מעסיק"
    />

    <AppTabPanel id="employer-profile" activeKey={tab}>
    {tab === "general" ? <GeneralTab key={`${organizationId}:${id}`}
      organizationId={organizationId}
      employer={employer}
      canEdit={capabilities.canEditEmployer}
      canManage={capabilities.canManageEmployer}
      address={settings.address}
      onEmployerSaved={setEmployer}
      onAddressSaved={(address) => setSettings((current) => ({ ...current, address }))}
    /> : null}

    {tab === "documents" ? <EmployerDocumentsTab organizationId={organizationId} employerId={employer.id} canEdit={capabilities.canEditEmployer} /> : null}

    {tab === "employees" ? <EmployeesTab
      organizationId={organizationId}
      employer={employer}
      canCreate={capabilities.canCreateEmployee}
    /> : null}

    {tab === "pension-payment" ? <PensionPaymentTab key={`${organizationId}:${id}`}
      organizationId={organizationId}
      employerId={employer.id}
      canManage={capabilities.canManageEmployer}
      accounts={accounts}
      setAccounts={setAccounts}
      pensionPayment={settings.pensionPayment}
      hasOrganizationContext={hasOrganizationContext}
      onModeSaved={(pensionPayment) => setSettings((current) => ({ ...current, pensionPayment }))}
    /> : null}

    {tab === "billing" ? <div key={`${organizationId}:${id}`} className="employer-profile-stack">
      {singleEmployerUser && entitlements ? <SubscriptionBillingPanel
        organizationId={organizationId}
        employerId={employer.id}
        entitlements={entitlements}
        canManage={capabilities.canManageEmployer}
        onChanged={load}
        showBillingAccount={false}
      /> : null}
      <EmployerBillingInheritanceTab
        organizationId={organizationId}
        employer={employer}
        canManageEmployer={capabilities.canManageEmployer}
        billing={settings.billing}
        hasOrganizationContext={hasOrganizationContext}
        onModeSaved={(billing) => setSettings((current) => ({ ...current, billing }))}
      />
    </div> : null}

    {tab === "reporting" ? <ReportingTab key={`${organizationId}:${id}`}
      organizationId={organizationId}
      employerId={employer.id}
      canEdit={capabilities.canEditEmployer}
      value={settings.reporting}
      onSaved={(reporting) => setSettings((current) => ({ ...current, reporting }))}
    /> : null}
    </AppTabPanel>

  </AppShell>;
}
