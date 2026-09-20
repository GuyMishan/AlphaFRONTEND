import { getSession } from "./session";
import { openUpgradeDialog, upgradeDetailFromProblem } from "./upgrade";
import type {
  AccessEmployer,
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
  EmployerOption,
  EmployerRole,
  ManualProductInput,
  ManualReportDraft,
  ManualReportEmployeeDetail,
  ManualReportEmployeeSummary,
  Organization,
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

  createManualReport: (organizationId: string, employerId: string, payload: { reportingMonth: string; salaryPaymentDate: string | null; employmentIds: string[] }): Promise<ManualReportDraft> =>
    request<ManualReportDraft>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/`, { method: "POST", body: JSON.stringify(payload) }),
  manualReport: (organizationId: string, employerId: string, reportId: string): Promise<ManualReportDraft> =>
    request<ManualReportDraft>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}`),
  updateManualReportDetails: (organizationId: string, employerId: string, reportId: string, payload: { reportingMonth: string; salaryPaymentDate: string | null }) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/details`, { method: "PUT", body: JSON.stringify(payload) }),
  syncManualReportEmployees: (organizationId: string, employerId: string, reportId: string, employmentIds: string[]) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/selection`, { method: "PUT", body: JSON.stringify({ employmentIds }) }),
  manualReportEmployees: (organizationId: string, employerId: string, reportId: string, search = "", skip = 0, take = 100): Promise<PagedResult<ManualReportEmployeeSummary>> =>
    request<PagedResult<ManualReportEmployeeSummary> | ManualReportEmployeeSummary[]>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees${qs({ search, skip, take })}`).then((result) => normalizePaged(result, take)),
  manualReportEmployee: (organizationId: string, employerId: string, reportId: string, reportEmployeeId: string): Promise<ManualReportEmployeeDetail> =>
    request<ManualReportEmployeeDetail>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees/${reportEmployeeId}`),
  saveManualReportEmployee: (organizationId: string, employerId: string, reportId: string, reportEmployeeId: string, monthlySalary: number, products: ManualProductInput[]) =>
    request<void>(`/api/organizations/${organizationId}/employers/${employerId}/manual-reports/${reportId}/employees/${reportEmployeeId}`, { method: "PUT", body: JSON.stringify({ monthlySalary, products }) }),

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
