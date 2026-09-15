export type Organization = {
  id: string;
  name: string;
  type: number;
  status: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Employer = {
  id: string;
  organizationId: string;
  legalName: string;
  registrationNumber: string;
  withholdingFileNumber: string;
  status: number;
};

export type Employee = {
  id: string;
  employeeNumber: string;
  status: number;
  startDate: string;
  endDate: string | null;
  personId: string;
  nationalId: string;
  firstName: string;
  lastName: string;
};

export type Session = {
  mode: "development" | "oidc" | "demo";
  userId?: string;
  accessToken?: string;
  platformAdmin: boolean;
  displayName: string;
};

export type ReportMode = "manual" | "excel" | "correction";
export type ManualReportKind = 1 | 2 | 3;
export type ReportDraft = {
  organizationId: string;
  employerId: string;
  employerName: string;
  month: string;
  mode: ReportMode;
  selectedEmployeeIds: string[];
  fileName?: string;
  correctionReason?: string;
};

export type PensionProductType = 1 | 2 | 3 | 4 | 99;
export type ContributionComponent = 1 | 2 | 3 | 4;

export type ManualContributionInput = {
  component: ContributionComponent;
  amount: number;
  percentage: number;
  exemptPayments: number;
};

export type ManualProductInput = {
  productType: PensionProductType;
  policyNumber: string;
  salaryMonth: string;
  salary: number;
  reportingType: string;
  salaryLayer: string;
  section14: boolean;
  section14StartDate: string | null;
  employerContributions: ManualContributionInput[];
  employeeContributions: ManualContributionInput[];
};

export type EmployeePensionContributionInput = {
  component: ContributionComponent;
  percentage: number;
};

export type EmployeePensionProductInput = {
  productType: PensionProductType;
  policyNumber: string;
  salary: number;
  reportingType: string;
  salaryLayer: string;
  section14: boolean;
  section14StartDate: string | null;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  institutionalBody: string;
  manufacturer: string;
  employerContributions: EmployeePensionContributionInput[];
  employeeContributions: EmployeePensionContributionInput[];
};

export type EmployeePensionContribution = EmployeePensionContributionInput & {
  id: string;
  employeePensionProductId: string;
  party: string | number;
};

export type EmployeePensionProduct = EmployeePensionProductInput & {
  id: string;
  missingDetails: string[];
  isComplete: boolean;
  employerContributions: EmployeePensionContribution[];
  employeeContributions: EmployeePensionContribution[];
};

export type ManualReportDraft = {
  id: string;
  reportingMonth: string;
  salaryPaymentDate: string | null;
  status: string | number;
  reportKind?: string | number;
  sourceReportId?: string | null;
  employeeCount: number;
};

export type SourceManualReport = {
  id: string;
  reportingMonth: string;
  salaryPaymentDate: string | null;
  status: string | number;
  reportKind: string | number;
  sourceReportId: string | null;
  createdAt: string;
  updatedAt: string;
  employeeCount: number;
  productCount: number;
};

export type ManualReportEmployeeSummary = {
  id: string;
  employmentId: string;
  personId: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  productCount: number;
  validationStatus: "ready" | "missing-products";
};

export type ManualContribution = ManualContributionInput & {
  id: string;
  reportProductId: string;
  party: string | number;
};

export type ManualReportProduct = Omit<ManualProductInput, "employerContributions" | "employeeContributions"> & {
  id: string;
  employerContributions: ManualContribution[];
  employeeContributions: ManualContribution[];
};

export type ManualReportEmployeeDetail = Omit<ManualReportEmployeeSummary, "productCount" | "validationStatus"> & {
  products: ManualReportProduct[];
};

export type ApiProblem = {
  title?: string;
  detail?: string;
  error?: string;
  status?: number;
};

export type OrganizationCapabilities = {
  canCreateEmployer: boolean;
};

export type EmployerCapabilities = {
  canEditEmployer: boolean;
  canCreateEmployee: boolean;
  canEditEmployee: boolean;
};

export type OrganizationRole = 1 | 2 | 3 | 4;
export type EmployerAccessMode = 1 | 2;

export type AccessUser = {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  isActive: boolean;
  role: OrganizationRole;
  employerAccessMode: EmployerAccessMode;
};

export type UserCandidate = {
  id: string;
  displayName: string;
  email: string;
};

export type AccessEmployer = {
  id: string;
  legalName: string;
  registrationNumber: string;
};

export type EmployerOption = AccessEmployer & {
  assigned: boolean;
};

export type PagedResult<T> = {
  items: T[];
  hasMore: boolean;
};

export type EmployerInput = Pick<Employer, "legalName" | "registrationNumber" | "withholdingFileNumber">;
export type EmployeeInput = Pick<Employee, "nationalId" | "firstName" | "lastName" | "employeeNumber" | "startDate">;
