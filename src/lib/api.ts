import { getSession } from "./session";
import { openUpgradeDialog, upgradeDetailFromProblem } from "./upgrade";
import type {
  AccessEmployer,
  AlphaBillingAccount,
  AlphaBillingAccountInput,
  AlphaBillingProviderMetadataInput,
  AccessUser,
  ApiProblem,
  Employee,
  EntitlementSnapshot,
  EmployeeInput,
  EmployeePensionProduct,
  EmployeePensionProductInput,
  Employer,
  EmployerAccessMode,
  EmployerCapabilities,
  EmployerInput,
  EmployerAddressSettings,
  EmployerBillingMode,
  EmployerBillingResolution,
  EmployerBillingStatus,
  EmployerPaymentAccount,
  EmployerPaymentAccountEdit,
  EmployerPaymentAccountInput,
  BankDebitMandate,
  BankDebitMandateStatus,
  BankOption,
  BankBranchOption,
  BillingGateStatus,
  GlobalScopeContext,
  CreateInvitationInput,
  PublicInvitation,
  PaymentMethodSetupResult,
  PaymentMethodSyncResult,
  UserInvitation,
  EmployerProfileCenterSettings,
  EmployerOption,
  EmployerRole,
  ManualProductInput,
  ManualReportDraft,
  ManualReportEmployeeDetail,
  ManualReportEmployeeSummary,
  Organization,
  OrganizationProfileCenter,
  OrganizationMemberSummary,
  OrganizationEmployerBilling,
  OrganizationCapabilities,
  OrganizationRole,
  OnboardingStatus,
  SelfServiceOnboardingResult,
  PagedResult,
  PensionFundOption,
  PensionProductType,
  Plan,
  PlatformSubscription,
  SubscriptionSummary,
  UserCandidate,
} from "./types";
import { demoEmployees, demoEmployers, demoOrganizations } from "./demo-data";

export class ApiError extends Error {
  constructor(public status: number, message: string, public problem?: ApiProblem) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (session?.mode === "development" && session.userId) {
    headers.set("X-Alpha-User-Id", session.userId);
    if (session.platformAdmin) headers.set("X-Alpha-Platform-Admin", "true");
  }

  const response = await fetch(`/api/backend${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    let problem: ApiProblem | undefined;
    try { problem = await response.json(); } catch { /* empty response */ }
    const limitNames: Record<string, string> = { employers: "מעסיקים", active_employees: "עובדים פעילים", users: "משתמשים" };
    const featureNames: Record<string, string> = { report_transmission: "שליחת דיווחים" };
    const upgradeDetail = upgradeDetailFromProblem(problem);
    if (upgradeDetail) openUpgradeDialog(upgradeDetail);

    const message = problem?.error === "plan_limit_reached"
      ? `הגעתם למגבלת ${limitNames[problem.limit ?? ""] ?? problem.limit ?? "המסלול"} במסלול הנוכחי (${problem.current ?? 0}/${problem.maximum ?? 0}).`
      : problem?.error === "feature_not_available"
        ? `האפשרות ${featureNames[problem.feature ?? ""] ?? problem.feature ?? ""} אינה זמינה במסלול הנוכחי.`
        : problem?.error === "payment_account_required"
          ? "יש לבחור חשבון תשלום פעיל לדיווח."
          : problem?.error === "bank_mandate_required"
            ? "לא ניתן לשלוח את הדיווח ללא הרשאה פעילה לחיוב חשבון הבנק שנבחר."
            : problem?.detail ?? problem?.error ?? problem?.title ?? `שגיאת שרת (${response.status})`;
    throw new ApiError(response.status, message, problem);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function qs(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : "";
}

function normalizePaged<T>(result: PagedResult<T> | T[], take: number): PagedResult<T> {
  if (Array.isArray(result)) return { items: result, hasMore: result.length >= take };
  return result;
}

export const alphaApi = {
  scope: (): Promise<GlobalScopeContext> => getSession()?.mode === "demo"
    ? Promise.resolve({
        organizations: demoOrganizations.map((organization) => ({
          ...organization,
          hasOrganizationScope: true,
          canManageOrganization: true,
          employers: demoEmployers.filter((employer) => employer.organizationId === organization.id),
        })),
        organizationCount: demoOrganizations.length,
        employerCount: demoEmployers.length,
      })
    : request<GlobalScopeContext>("/api/scope"),
  health: () => request<{ status: string; service: string }>("/health"),
  onboardingStatus: (): Promise<OnboardingStatus> =>
    getSession()?.mode === "demo"
      ? Promise.resolve({ needsOnboarding: false, hasAccess: true })
      : request<OnboardingStatus>("/api/onboarding/status"),
  completeSelfServiceOnboarding: (payload: EmployerInput): Promise<SelfServiceOnboardingResult> =>
    request<SelfServiceOnboardingResult>("/api/onboarding/self-service", { method: "POST", body: JSON.stringify(payload) }),
  subscription: (organizationId: string): Promise<SubscriptionSummary> =>
    request<SubscriptionSummary>(`/api/organizations/${organizationId}/subscription`),
  entitlements: (organizationId: string): Promise<EntitlementSnapshot> =>
    request<EntitlementSnapshot>(`/api/organizations/${organizationId}/entitlements`),
  platformPlans: (): Promise<Plan[]> =>
    request<Plan[]>("/api/platform/subscriptions/plans"),
  platformSubscriptions: (): Promise<PlatformSubscription[]> =>
    request<PlatformSubscription[]>("/api/platform/subscriptions/"),
  changePlatformSubscriptionPlan: (organizationId: string, planId: string): Promise<SubscriptionSummary> =>
    request<SubscriptionSummary>(`/api/platform/subscriptions/${organizationId}/plan`, { method: "PUT", body: JSON.stringify({ planId }) }),
  organizations: (): Promise<Organization[]> => getSession()?.mode === "demo"
    ? Promise.resolve(demoOrganizations)
    : request<Organization[]>("/api/organizations/"),
  organization: (organizationId: string): Promise<Organization> =>
    request<Organization>(`/api/organizations/${organizationId}`),
  organizationProfile: (organizationId: string): Promise<OrganizationProfileCenter> =>
    request<OrganizationProfileCenter>(`/api/organizations/${organizationId}/profile-center/`),
  organizationBillingAccount: (organizationId: string): Promise<AlphaBillingAccount> =>
    request<AlphaBillingAccount>(`/api/organizations/${organizationId}/billing-account/`),
  saveOrganizationBillingAccount: (organizationId: string, payload: AlphaBillingAccountInput): Promise<AlphaBillingAccount> =>
    request<AlphaBillingAccount>(`/api/organizations/${organizationId}/billing-account/`, { method: "PUT", body: JSON.stringify(payload) }),
  updateOrganizationBillingProviderMetadata: (organizationId: string, payload: AlphaBillingProviderMetadataInput): Promise<AlphaBillingAccount> =>
    request<AlphaBillingAccount>(`/api/organizations/${organizationId}/billing-account/provider-metadata`, { method: "PUT", body: JSON.stringify(payload) }),
  startOrganizationPaymentSetup: (organizationId: string, returnPath: string): Promise<PaymentMethodSetupResult> =>
    request<PaymentMethodSetupResult>(`/api/organizations/${organizationId}/billing-account/provider/setup`, { method: "POST", body: JSON.stringify({ returnPath }) }),
  syncOrganizationPaymentMethod: (organizationId: string): Promise<PaymentMethodSyncResult> =>
    request<PaymentMethodSyncResult>(`/api/organizations/${organizationId}/billing-account/provider/sync`, { method: "POST" }),
  cancelOrganizationPaymentMethod: (organizationId: string) =>
    request<void>(`/api/organizations/${organizationId}/billing-account/provider/cancel`, { method: "POST" }),
  updateOrganizationGeneral: (organizationId: string, payload: {
    name: string; type: number; registrationNumber: string; city: string; street: string;
    houseNumber: string; apartment: string; postalCode: string; postOfficeBox: string;
    contactName: string; contactEmail: string; contactPhone: string;
  }) => request<void>(`/api/organizations/${organizationId}/profile-center/general`, { method: "PUT", body: JSON.stringify(payload) }),
  updateOrganizationBilling: (organizationId: string, payload: {
    invoiceName: string; invoiceRegistrationNumber: string; invoiceEmail: string;
    billingContactName: string; billingContactPhone: string; billingStatus?: number;
  }) => request<void>(`/api/organizations/${organizationId}/profile-center/billing`, { method: "PUT", body: JSON.stringify(payload) }),
  organizationMembers: (organizationId: string): Promise<OrganizationMemberSummary[]> =>
    request<OrganizationMemberSummary[]>(`/api/organizations/${organizationId}/profile-center/members`),
  organizationEmployerBilling: (organizationId: string): Promise<OrganizationEmployerBilling[]> =>
    request<OrganizationEmployerBilling[]>(`/api/organizations/${organizationId}/profile-center/employer-billing`),
  employers: (organizationId: string): Promise<Employer[]> => getSession()?.mode === "demo"
    ? Promise.resolve(demoEmployers.filter((item) => item.organizationId === organizationId))
    : request<Employer[]>(`/api/organizations/${organizationId}/employers/`),
  employerSearch: (organizationId: string, search = "", skip = 0, take = 50): Promise<PagedResult<Employer>> => getSession()?.mode === "demo"
    ? Promise.resolve({ items: demoEmployers.filter((item) => item.organizationId === organizationId && `${item.legalName} ${item.registrationNumber} ${item.withholdingFileNumber}`.includes(search)), hasMore: false })
    : request<PagedResult<Employer>>(`/api/organizations/${organizationId}/employers/search${qs({ search, skip, take })}`),
  employer: (organizationId: string, employerId: string): Promise<Employer> => getSession()?.mode === "demo"
    ? Promise.resolve(demoEmployers.find((item) => item.id === employerId && item.organizationId === organizationId)!)
    : request<Employer>(`/api/organizations/${organizationId}/employers/${employerId}`),
  capabilities: (organizationId: string): Promise<OrganizationCapabilities> => getSession()?.mode === "demo"
    ? Promise.resolve({ canManageOrganization: true, canCreateEmployer: true })
    : request<OrganizationCapabilities>(`/api/organizations/${organizationId}/capabilities`),
  employerCapabilities: (organizationId: string, employerId: string): Promise<EmployerCapabilities> => getSession()?.mode === "demo"
    ? Promise.resolve({ canManageEmployer: true, canEditEmployer: true, canCreateEmployee: true, canEditEmployee: true, canCreateReport: true, canTransmitReport: true })
    : request<EmployerCapabilities>(`/api/organizations/${organizationId}/employers/${employerId}/capabilities`),
  createEmployer: (organizationId: string, payload: EmployerInput) => getSession()?.mode === "demo"
    ? Promise.resolve({ id: crypto.randomUUID(), organizationId, ...payload, status: 1 } as Employer)
    : request<Employer>(`/api/organizations/${organizationId}/employers/`, { method: "POST", body: JSON.stringify(payload) }),
  updateEmployer: (organizationId: string, employerId: string, payload: EmployerInput) => getSession()?.mode === "demo"
    ? Promise.resolve({ id: employerId, organizationId, ...payload, status: 2 } as Employer)
    : request<Employer>(`/api/organizations/${organizationId}/employers/${employerId}`, { method: "PUT", body: JSON.stringify(payload) }),
  employerBillingAccount: (organizationId: string, employerId: string): Promise<AlphaBillingAccount> =>
    request<AlphaBillingAccount>(`/api/organizations/${organizationId}/employers/${employerId}/billing-account/`),
  employerBillingResolution: (organizationId: string, employerId: string): Promise<EmployerBillingResolution> =>
    request<EmployerBillingResolution>(`/api/organizations/${organizationId}/employers/${employerId}/billing-account/resolution`),
  employerBillingGate: (organizationId: string, employerId: string): Promise<BillingGateStatus> =>
    request<BillingGateStatus>(`/api/organizations/${organizationId}/employers/${employerId}/billing-account/gate`),
  saveEmployerBillingAccount: (organizationId: string, employerId: string, payload: AlphaBillingAccountInput): Promise<AlphaBillingAccount> =>
    request<AlphaBillingAccount>(`/api/organizations/${organizationId}/employers/${employerId}/billing-account/`, { method: "PUT", body: JSON.stringify(payload) }),
  updateEmployerBillingProviderMetadata: (organizationId: string, employerId: string, payload: AlphaBillingProviderMetadataInput): Promise<AlphaBillingAccount> =>
    request<AlphaBillingAccount>(`/api/organizations/${organizationId}/employers/${employerId}/billing-account/provider-metadata`, { method: "PUT", body: JSON.stringify(payload) }),
  startEmployerPaymentSetup: (organizationId: string, employerId: string, returnPath: string): Promise<PaymentMethodSetupResult> =>
    request<PaymentMethodSetupResult>(`/api/organizations/${organizationId}/employers/${employerId}/billing-account/provider/setup`, { method: "POST", body: JSON.stringify({ returnPath }) }),
  syncEmployerPaymentMethod: (organizationId: string, employerId: string): Promise<PaymentMethodSyncResult> =>
    request<PaymentMethodSyncResult>(`/api/organizations/${organizationId}/employers/${employerId}/billing-account/provider/sync`, { method: "POST" }),
  cancelEmployerPaymentMethod: (organizationId: string, employerId: string) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/billing-account/provider/cancel`, { method: "POST" }),
  employerProfileCenterSettings: (organizationId: string, employerId: string): Promise<EmployerProfileCenterSettings> =>
    request<EmployerProfileCenterSettings>(`/api/organizations/${organizationId}/employers/${employerId}/profile-center/settings`),
  updateEmployerAddress: (organizationId: string, employerId: string, payload: EmployerAddressSettings) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/profile-center/address`, { method: "PUT", body: JSON.stringify(payload) }),
  updateEmployerBilling: (organizationId: string, employerId: string, billingMode: EmployerBillingMode, billingStatus?: EmployerBillingStatus) =>
    request<{ billingMode: EmployerBillingMode; billingStatus: EmployerBillingStatus }>(`/api/organizations/${organizationId}/employers/${employerId}/profile-center/billing`, { method: "PUT", body: JSON.stringify({ billingMode, billingStatus }) }),
  updateEmployerReportingSettings: (organizationId: string, employerId: string, payload: EmployerProfileCenterSettings["reporting"]) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/profile-center/reporting`, { method: "PUT", body: JSON.stringify(payload) }),
  employerPaymentAccounts: (organizationId: string, employerId: string): Promise<EmployerPaymentAccount[]> =>
    request<EmployerPaymentAccount[]>(`/api/organizations/${organizationId}/employers/${employerId}/payment-accounts/`),
  employerPaymentAccount: (organizationId: string, employerId: string, accountId: string): Promise<EmployerPaymentAccountEdit> =>
    request<EmployerPaymentAccountEdit>(`/api/organizations/${organizationId}/employers/${employerId}/payment-accounts/${accountId}`),
  createEmployerPaymentAccount: (organizationId: string, employerId: string, payload: EmployerPaymentAccountInput) =>
    request<EmployerPaymentAccount>(`/api/organizations/${organizationId}/employers/${employerId}/payment-accounts/`, { method: "POST", body: JSON.stringify(payload) }),
  updateEmployerPaymentAccount: (organizationId: string, employerId: string, accountId: string, payload: EmployerPaymentAccountInput) =>
    request<EmployerPaymentAccount>(`/api/organizations/${organizationId}/employers/${employerId}/payment-accounts/${accountId}`, { method: "PUT", body: JSON.stringify(payload) }),
  setDefaultEmployerPaymentAccount: (organizationId: string, employerId: string, accountId: string) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/payment-accounts/${accountId}/set-default`, { method: "POST" }),
  deactivateEmployerPaymentAccount: (organizationId: string, employerId: string, accountId: string) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/payment-accounts/${accountId}`, { method: "DELETE" }),
  updateEmployerPaymentMandate: (organizationId: string, employerId: string, accountId: string, payload: {
    status: BankDebitMandateStatus; externalMandateId?: string; approvedAt?: string | null; cancelledAt?: string | null; documentId?: string;
  }): Promise<BankDebitMandate> =>
    request<BankDebitMandate>(`/api/organizations/${organizationId}/employers/${employerId}/payment-accounts/${accountId}/mandate`, { method: "PUT", body: JSON.stringify(payload) }),
  banks: (search = "", take = 100): Promise<BankOption[]> =>
    request<BankOption[]>(`/api/reference-data/banks${qs({ search, take })}`),
  bankBranches: (bankCode: number, search = "", take = 200): Promise<BankBranchOption[]> =>
    request<BankBranchOption[]>(`/api/reference-data/bank-branches${qs({ bankCode, search, take })}`),
  employees: (organizationId: string, employerId: string): Promise<Employee[]> => getSession()?.mode === "demo"
    ? Promise.resolve(demoEmployers.some((item) => item.id === employerId && item.organizationId === organizationId) ? demoEmployees : [])
    : request<Employee[]>(`/api/organizations/${organizationId}/employers/${employerId}/employees`),
  employeeSearch: (organizationId: string, employerId: string, search = "", skip = 0, take = 50): Promise<PagedResult<Employee>> => getSession()?.mode === "demo"
    ? Promise.resolve({ items: demoEmployees.filter((item) => `${item.firstName} ${item.lastName} ${item.nationalId} ${item.employeeNumber}`.includes(search)), hasMore: false })
    : request<PagedResult<Employee> | Employee[]>(`/api/organizations/${organizationId}/employers/${employerId}/employees/search${qs({ search, skip, take })}`).then((result) => normalizePaged(result, take)),
  employee: (organizationId: string, employerId: string, employeeId: string): Promise<Employee> => getSession()?.mode === "demo"
    ? Promise.resolve(demoEmployees.find((item) => item.id === employeeId)!)
    : request<Employee>(`/api/organizations/${organizationId}/employers/${employerId}/employees/${employeeId}`),
  createEmployee: (organizationId: string, employerId: string, payload: EmployeeInput) => getSession()?.mode === "demo"
    ? Promise.resolve({ id: crypto.randomUUID(), personId: crypto.randomUUID(), ...payload, status: 1, endDate: null } as Employee)
    : request<{ id: string; personId: string }>(`/api/organizations/${organizationId}/employers/${employerId}/employees`, { method: "POST", body: JSON.stringify(payload) }),
  updateEmployee: (organizationId: string, employerId: string, employeeId: string, payload: EmployeeInput) => getSession()?.mode === "demo"
    ? Promise.resolve({ id: employeeId, personId: employeeId, ...payload, status: 1, endDate: null } as Employee)
    : request<Employee>(`/api/organizations/${organizationId}/employers/${employerId}/employees/${employeeId}`, { method: "PUT", body: JSON.stringify(payload) }),
  employeePensionMix: (organizationId: string, employerId: string, employeeId: string): Promise<EmployeePensionProduct[]> => getSession()?.mode === "demo"
    ? Promise.resolve([])
    : request<EmployeePensionProduct[]>(`/api/organizations/${organizationId}/employers/${employerId}/employees/${employeeId}/pension-mix/`),
  saveEmployeePensionMix: (organizationId: string, employerId: string, employeeId: string, products: EmployeePensionProductInput[]) => getSession()?.mode === "demo"
    ? Promise.resolve()
    : request<void>(`/api/organizations/${organizationId}/employers/${employerId}/employees/${employeeId}/pension-mix/`, { method: "PUT", body: JSON.stringify({ products }) }),
  pensionFunds: (productType: PensionProductType, search = "", take = 500): Promise<PensionFundOption[]> => getSession()?.mode === "demo"
    ? Promise.resolve([])
    : request<PensionFundOption[]>(`/api/reference-data/pension-funds${qs({ productType, search, take })}`),
  createUser: (payload: { externalSubject: string; email: string; displayName: string }) =>
    request<{ id: string }>("/api/platform/users", { method: "POST", body: JSON.stringify(payload) }),

  createManualReport: (organizationId: string, employerId: string, payload: { reportingMonth: string; salaryPaymentDate: string | null; employmentIds: string[]; paymentAccountId?: string }): Promise<ManualReportDraft> =>
    request<ManualReportDraft>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/`, { method: "POST", body: JSON.stringify(payload) }),
  manualReport: (organizationId: string, employerId: string, reportId: string): Promise<ManualReportDraft> =>
    request<ManualReportDraft>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}`),
  updateManualReportDetails: (organizationId: string, employerId: string, reportId: string, payload: { reportingMonth: string; salaryPaymentDate: string | null }) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/details`, { method: "PUT", body: JSON.stringify(payload) }),
  updateManualReportPaymentAccount: (organizationId: string, employerId: string, reportId: string, paymentAccountId: string) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/payment-account`, { method: "PUT", body: JSON.stringify({ paymentAccountId }) }),
  syncManualReportEmployees: (organizationId: string, employerId: string, reportId: string, employmentIds: string[]) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/selection`, { method: "PUT", body: JSON.stringify({ employmentIds }) }),
  manualReportEmployees: (organizationId: string, employerId: string, reportId: string, search = "", skip = 0, take = 100): Promise<PagedResult<ManualReportEmployeeSummary>> =>
    request<PagedResult<ManualReportEmployeeSummary> | ManualReportEmployeeSummary[]>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees${qs({ search, skip, take })}`).then((result) => normalizePaged(result, take)),
  manualReportEmployee: (organizationId: string, employerId: string, reportId: string, reportEmployeeId: string): Promise<ManualReportEmployeeDetail> =>
    request<ManualReportEmployeeDetail>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees/${reportEmployeeId}`),
  saveManualReportEmployee: (organizationId: string, employerId: string, reportId: string, reportEmployeeId: string, monthlySalary: number, products: ManualProductInput[]) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees/${reportEmployeeId}`, { method: "PUT", body: JSON.stringify({ monthlySalary, products }) }),

  invitations: (organizationId: string): Promise<UserInvitation[]> =>
    request<UserInvitation[]>(`/api/organizations/${organizationId}/invitations/`),
  createInvitation: (organizationId: string, payload: CreateInvitationInput): Promise<UserInvitation> =>
    request<UserInvitation>(`/api/organizations/${organizationId}/invitations/`, { method: "POST", body: JSON.stringify(payload) }),
  cancelInvitation: (organizationId: string, invitationId: string) =>
    request<void>(`/api/organizations/${organizationId}/invitations/${invitationId}/cancel`, { method: "POST" }),
  publicInvitation: (token: string): Promise<PublicInvitation> =>
    request<PublicInvitation>(`/api/invitations/${encodeURIComponent(token)}`),

  accessUsers: (organizationId: string, search = "", skip = 0, take = 30): Promise<PagedResult<AccessUser>> =>
    getSession()?.mode === "demo" ? Promise.resolve({ items: [], hasMore: false }) : request<PagedResult<AccessUser>>(`/api/organizations/${organizationId}/access/users${qs({ search, skip, take })}`),
  accessUserCandidates: (organizationId: string, search: string, take = 20): Promise<UserCandidate[]> =>
    getSession()?.mode === "demo" ? Promise.resolve([]) : request<UserCandidate[]>(`/api/organizations/${organizationId}/access/user-candidates${qs({ search, take })}`),
  addAccessUser: (organizationId: string, payload: { userId: string; role: OrganizationRole; employerAccessMode: EmployerAccessMode }) =>
    getSession()?.mode === "demo" ? Promise.resolve() : request<void>(`/api/organizations/${organizationId}/access/users`, { method: "POST", body: JSON.stringify(payload) }),
  updateAccessUser: (organizationId: string, userId: string, payload: { role: OrganizationRole; employerAccessMode: EmployerAccessMode }) =>
    getSession()?.mode === "demo" ? Promise.resolve() : request<void>(`/api/organizations/${organizationId}/access/users/${userId}`, { method: "PUT", body: JSON.stringify(payload) }),
  removeAccessUser: (organizationId: string, userId: string) =>
    getSession()?.mode === "demo" ? Promise.resolve() : request<void>(`/api/organizations/${organizationId}/access/users/${userId}`, { method: "DELETE" }),
  assignedEmployers: (organizationId: string, userId: string, search = "", skip = 0, take = 30): Promise<PagedResult<AccessEmployer>> =>
    getSession()?.mode === "demo" ? Promise.resolve({ items: [], hasMore: false }) : request<PagedResult<AccessEmployer>>(`/api/organizations/${organizationId}/access/users/${userId}/employers${qs({ search, skip, take })}`),
  employerAccessOptions: (organizationId: string, userId: string, search: string, take = 20): Promise<EmployerOption[]> =>
    getSession()?.mode === "demo" ? Promise.resolve([]) : request<EmployerOption[]>(`/api/organizations/${organizationId}/access/employer-options${qs({ userId, search, take })}`),
  grantEmployerAccess: (organizationId: string, userId: string, employerId: string) =>
    getSession()?.mode === "demo" ? Promise.resolve() : request<void>(`/api/organizations/${organizationId}/access/users/${userId}/employers/${employerId}`, { method: "POST" }),
  updateEmployerAccessRole: (organizationId: string, userId: string, employerId: string, role: EmployerRole) =>
    getSession()?.mode === "demo" ? Promise.resolve() : request<void>(`/api/organizations/${organizationId}/access/users/${userId}/employers/${employerId}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
  revokeEmployerAccess: (organizationId: string, userId: string, employerId: string) =>
    getSession()?.mode === "demo" ? Promise.resolve() : request<void>(`/api/organizations/${organizationId}/access/users/${userId}/employers/${employerId}`, { method: "DELETE" }),
};
