"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Building2, CreditCard, FileSliders, Files, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/features/shell/components/app-shell";
import { EmployerDocumentsTab } from "@/features/employers/components/employer-documents-tab";
import { EmployerTransferModal } from "@/features/employers/components/employer-transfer-modal";
import { getSession, setEmployerSelection } from "@/lib/session/storage";
import { AppTabs } from "@/components/ui/app-tabs";
import { SubscriptionBillingPanel } from "@/features/billing/components/subscription-billing-panel";
import { billingKeys, useEntitlements } from "@/features/billing/queries";
import { employerKeys, useEmployer, useEmployerCapabilities, useEmployerProfileSettings } from "@/features/employers/queries";
import { paymentAccountKeys, useEmployerPaymentAccounts } from "@/features/payment-accounts/queries";
import { refreshScopeContext, useScopeContext } from "@/features/scope/scope-context";
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
  const router = useRouter();
  const [transferOpen, setTransferOpen] = useState(false);
  const { organizationId } = useUrlScope();
  const [tab, setTab] = useState<TabKey>("general");
  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab && baseTabs.some((item) => item.key === requestedTab)) {
      setTab(requestedTab as TabKey);
    }
  }, []);

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

  if (loading) return <AppShell title="פרופיל מעסיק" hideScopeController><div className="empty">טוען פרופיל מעסיק...</div></AppShell>;
  if (error || !employer) return <AppShell title="פרופיל מעסיק" hideScopeController><div className="notice notice-error">{error || "המעסיק לא נמצא."}</div></AppShell>;

  return <AppShell title="פרופיל מעסיק" hideScopeController>
    <div className="page-head">
      <div>
        <h1>{employer.legalName}</h1>
        <p>מרכז ניהול המעסיק · ח.פ./עוסק {employer.registrationNumber}</p>
      </div>
      {getSession()?.platformAdmin ? <button className="btn btn-secondary" type="button" onClick={() => setTransferOpen(true)}>העברה לארגון אחר</button> : null}
    </div>

    <AppTabs
      items={baseTabs}
      activeKey={tab}
      onChange={setTab}
      ariaLabel="פרופיל מעסיק"
    />

    {tab === "general" ? <GeneralTab
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

    {tab === "pension-payment" ? <PensionPaymentTab
      organizationId={organizationId}
      employerId={employer.id}
      canManage={capabilities.canManageEmployer}
      accounts={accounts}
      setAccounts={setAccounts}
      pensionPayment={settings.pensionPayment}
      hasOrganizationContext={hasOrganizationContext}
      onModeSaved={(pensionPayment) => setSettings((current) => ({ ...current, pensionPayment }))}
    /> : null}

    {tab === "billing" ? <div className="employer-profile-stack">
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

    {tab === "reporting" ? <ReportingTab
      organizationId={organizationId}
      employerId={employer.id}
      canEdit={capabilities.canEditEmployer}
      value={settings.reporting}
      onSaved={(reporting) => setSettings((current) => ({ ...current, reporting }))}
    /> : null}

    {getSession()?.platformAdmin ? <EmployerTransferModal open={transferOpen}
      employer={employer} onClose={() => setTransferOpen(false)}
      onTransferred={async (targetOrganizationId) => {
        setEmployerSelection(targetOrganizationId, employer.id);
        await refreshScopeContext();
        router.replace(`/employers/${employer.id}?organizationId=${targetOrganizationId}`);
      }} /> : null}
  </AppShell>;
}
