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
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactMobile?: string;
};

export type Employee = {
  id: string;
  employeeNumber: string;
  status: number;
  startDate: string;
  endDate: string | null;
  monthlySalary?: number;
  personId: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  gender?: number | null;
  email?: string;
  mobile?: string;
  city?: string;
  street?: string;
  houseNumber?: string;
  apartment?: string;
  postalCode?: string;
  postOfficeBox?: string;
};

export type Session = {
  mode: "development" | "oidc" | "demo";
  userId?: string;
  accessToken?: string;
  platformAdmin: boolean;
  displayName: string;
};

export type RefreshedSession = {
  accessToken: string;
  userId: string;
  platformAdmin: boolean;
  displayName: string;
};

export type ReportMode = "manual" | "excel" | "xml" | "correction";
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
export type SalaryAllocationType = 1 | 2 | 3 | 4;
export type Section14Code = 1 | 2 | 3 | 4 | 5;

export type PensionFundOption = {
  externalKey: string;
  fundCode: string;
  fundName: string;
  companyName: string;
  domain: string;
  productType: string;
  classification?: string;
  bankCode?: number | null;
  bankName?: string;
  branchCode?: number | null;
  accountNumber?: string;
};

export type ManualContributionInput = {
  component: ContributionComponent;
  amount: number;
  percentage: number;
  exemptPayments: number;
};

export type ManualProductInput = {
  productType: PensionProductType;
  policyNumber: string;
  fundExternalKey?: string;
  fundCode?: string;
  fundName?: string;
  fundCompanyName?: string;
  fundClassification?: string;
  salaryMonth: string;
  salary: number;
  salaryAllocationType?: SalaryAllocationType;
  salaryAllocationValue?: number | null;
  allocationOrder?: number;
  reportingType: string;
  salaryLayer: string;
  section14: boolean;
  section14Code?: Section14Code;
  section14StartDate: string | null;
  employerContributions: ManualContributionInput[];
  employeeContributions: ManualContributionInput[];
};

export type EmployeePensionContributionInput = {
  component: ContributionComponent;
  percentage: number;
  amount?: number;
  exemptPayments?: number;
};

export type EmployeePensionProductInput = {
  productType: PensionProductType;
  policyNumber: string;
  fundExternalKey?: string;
  fundCode?: string;
  fundName?: string;
  fundCompanyName?: string;
  fundClassification?: string;
  salary: number;
  reportingType: string;
  salaryLayer: string;
  section14: boolean;
  section14Code?: Section14Code;
  section14StartDate: string | null;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  institutionalBody?: string;
  manufacturer?: string;
  salaryAllocationType?: SalaryAllocationType;
  salaryAllocationValue?: number | null;
  allocationOrder?: number;
  employerContributions: EmployeePensionContributionInput[];
  employeeContributions: EmployeePensionContributionInput[];
};

export type EmployeePensionContribution = EmployeePensionContributionInput & {
  id: string;
  employeePensionProductId: string;
  party: string | number;
};

export type EmployeePensionProduct = Omit<EmployeePensionProductInput, "isActive" | "effectiveFrom" | "effectiveTo" | "institutionalBody" | "manufacturer" | "salaryAllocationType" | "salaryAllocationValue" | "allocationOrder"> & {
  id: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  institutionalBody: string;
  manufacturer: string;
  fundExternalKey: string;
  fundCode: string;
  fundName: string;
  fundCompanyName: string;
  fundClassification: string;
  salaryAllocationType: SalaryAllocationType;
  salaryAllocationValue: number | null;
  allocationOrder: number;
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
  paymentAccountId?: string | null;
  paymentBankId?: number | null;
  paymentBranchId?: number | null;
  paymentAccountNumberMasked?: string;
  paymentMandateReference?: string;
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
  canBeCurrentCorrectionSource?: boolean;
};

export type ManualReportEmployeeSummary = {
  id: string;
  employmentId: string;
  personId: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  monthlySalary: number;
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
  limit?: string;
  current?: number;
  maximum?: number;
  feature?: string;
};

export type OrganizationCapabilities = {
  canManageOrganization: boolean;
  canCreateEmployer: boolean;
};

export type EmployerCapabilities = {
  canManageEmployer: boolean;
  canEditEmployer: boolean;
  canCreateEmployee: boolean;
  canEditEmployee: boolean;
  canCreateReport: boolean;
  canTransmitReport: boolean;
};

export type OrganizationRole = 1 | 2 | 3 | 4;
export type EmployerRole = 1 | 2 | 3 | 4;
export type EmployerAccessMode = 1 | 2;

export type AccessUser = {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  isActive: boolean;
  role: OrganizationRole;
  employerAccessMode: EmployerAccessMode;
  canCreateEmployer: boolean;
  canEditEmployer: boolean;
  canCreateEmployee: boolean;
  canEditEmployee: boolean;
};

export type PlatformUser = {
  id: string;
  displayName: string;
  email: string;
  nationalId: string | null;
  phone: string | null;
  isPlatformAdmin: boolean;
  isActive: boolean;
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
  role: EmployerRole;
};

export type EmployerOption = {
  id: string;
  legalName: string;
  registrationNumber: string;
  assigned: boolean;
};

export type PagedResult<T> = {
  items: T[];
  hasMore: boolean;
};

export type OnboardingStatus = {
  needsOnboarding: boolean;
  hasAccess: boolean;
};

export type SelfServiceOnboardingResult = {
  organizationId: string;
  employerId: string;
  employer: Employer;
  employerRole: EmployerRole;
};

export type EmployerInput = Pick<Employer, "legalName" | "registrationNumber" | "withholdingFileNumber"> & {
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactMobile?: string;
};
export type EmployeeInput = Pick<Employee, "nationalId" | "firstName" | "lastName" | "employeeNumber" | "startDate" | "monthlySalary"> & {
  birthDate: string | null;
  gender: number | null;
  email: string;
  mobile: string;
  city: string;
  street: string;
  houseNumber: string;
  apartment: string;
  postalCode: string;
  postOfficeBox: string;
};


export type Plan = {
  id: string;
  code: string;
  name: string;
  maxEmployers: number;
  maxEmployees: number;
  maxUsers: number;
  isActive: boolean;
};

export type SelfServiceSubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  maxEmployers: number;
  maxEmployees: number;
  maxUsers: number;
  isActive: boolean;
  employeeUnitPrice: number | null;
  rowUnitPrice: number | null;
};

export type SubscriptionSummary = {
  id: string;
  organizationId: string;
  planId: string;
  status: number | string;
  startedAt: string;
  expiresAt: string | null;
  code: string;
  name: string;
  maxEmployers: number;
  maxEmployees: number;
  maxUsers: number;
  isActive: boolean;
};

export type PlatformSubscription = {
  organizationId: string;
  organizationName: string;
  organizationStatus: number | string;
  subscriptionId: string;
  status: number | string;
  startedAt: string;
  expiresAt: string | null;
  planId: string;
  code: string;
  name: string;
  maxEmployers: number;
  maxEmployees: number;
  maxUsers: number;
};


export type EntitlementUsage = {
  current: number;
  maximum: number | null;
};

export type EntitlementSnapshot = {
  plan: { id: string; code: string; name: string };
  employers: EntitlementUsage;
  activeEmployees: EntitlementUsage;
  users: EntitlementUsage;
};


export type EmployerAddressSettings = {
  city: string;
  street: string;
  houseNumber: string;
  apartment: string;
  postalCode: string;
  postOfficeBox: string;
};

export type EmployerBillingMode = 1 | 2;
export type EmployerBillingStatus = 1 | 2 | 3;
export type EmployerPensionPaymentMode = 1 | 2;
export type BankDebitMandateStatus = 1 | 2 | 3 | 4 | 5;

export type EmployerProfileCenterSettings = {
  address: EmployerAddressSettings;
  billing: {
    mode: EmployerBillingMode;
    modeOverridden: boolean;
    status: EmployerBillingStatus;
    canChangeMode: boolean;
  };
  pensionPayment: {
    mode: EmployerPensionPaymentMode;
    modeOverridden: boolean;
    canChangeMode: boolean;
  };
  reporting: {
    defaultSalaryPaymentDay: number | null;
    defaultDepositorTypeCode: 1 | 2 | 3;
    defaultEmployerIdentifierTypeCode: 1 | 2 | 3 | 4 | 5 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
    defaultPaymentMethodCode: number | null;
    defaultEmployerAccountType: number | null;
    defaultReceiverAccountType: number | null;
    reportingNotes: string;
  };
};

export type BankDebitMandate = {
  id: string;
  employerPaymentAccountId: string;
  status: BankDebitMandateStatus;
  externalMandateId: string;
  approvedAt: string | null;
  cancelledAt: string | null;
  documentId: string;
  isActive: boolean;
};

export type EmployerPaymentAccount = {
  id: string;
  organizationId: string;
  employerId: string | null;
  bankId: number;
  branchId: number;
  maskedAccountNumber: string;
  accountHolderName: string;
  maskedAccountHolderId: string;
  isDefault: boolean;
  isActive: boolean;
  source?: "Organization" | "Employer";
  mandate: BankDebitMandate | null;
  mandateIsActive: boolean;
};

export type EmployerPaymentAccountEdit = Omit<EmployerPaymentAccount, "maskedAccountNumber" | "maskedAccountHolderId" | "mandateIsActive"> & {
  accountNumber: string;
  accountHolderId: string;
};

export type EmployerPaymentAccountInput = {
  bankId: number;
  branchId: number;
  accountNumber: string;
  accountHolderName: string;
  accountHolderId: string;
  isDefault: boolean;
};

export type BankOption = {
  bankCode: number;
  bankName: string;
};

export type BankBranchOption = {
  branchCode: number;
  branchName: string;
  branchAddress: string;
  city: string;
};

export type OrganizationBillingStatus = 1 | 2 | 3 | 4;

export type OrganizationProfileCenter = {
  id: string;
  name: string;
  type: number;
  status: number;
  canManageOrganization: boolean;
  general: {
    registrationNumber: string;
    city: string;
    street: string;
    houseNumber: string;
    apartment: string;
    postalCode: string;
    postOfficeBox: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
  };
  billing: {
    status: OrganizationBillingStatus;
    invoiceName: string;
    invoiceRegistrationNumber: string;
    invoiceEmail: string;
    billingContactName: string;
    billingContactPhone: string;
  };
};

export type OrganizationMemberSummary = {
  userId: string;
  displayName: string;
  email: string;
  role: OrganizationRole;
  employerAccessMode: EmployerAccessMode;
};

export type OrganizationEmployerBilling = {
  employerId: string;
  employerName: string;
  billingMode: EmployerBillingMode;
  billingStatus: EmployerBillingStatus;
  billingModeOverridden: boolean;
  billedThroughName: string;
  billingSource: "Organization" | "Employer";
  effectiveBillingConfigured: boolean;
  effectivePaymentMethodStatus: BillingPaymentMethodStatus | null;
};


export type BillingPaymentMethodType = 1 | 2;
export type BillingPaymentMethodStatus = 1 | 2 | 3 | 4 | 5 | 6;
export type BillingAccountStatus = 1 | 2 | 3 | 4 | 5;
export type BillingMode = 1 | 2;

export type AlphaBillingAccount = {
  id: string | null;
  organizationId: string | null;
  employerId: string | null;
  billingName: string;
  taxId: string;
  invoiceEmail: string;
  billingAddress: string;
  paymentMethodType: BillingPaymentMethodType;
  paymentMethodStatus: BillingPaymentMethodStatus;
  providerCustomerId: string;
  providerPaymentMethodId: string;
  cardBrand: string;
  cardLast4: string;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  bankDebitMandateReference: string;
  billingMode: BillingMode;
  status: BillingAccountStatus;
  defaultPaymentMethodId: string | null;
  configured: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AlphaBillingAccountInput = {
  billingName: string;
  taxId: string;
  invoiceEmail: string;
  billingAddress: string;
  paymentMethodType: BillingPaymentMethodType;
};

export type AlphaBillingProviderMetadataInput = {
  paymentMethodStatus: BillingPaymentMethodStatus;
  providerCustomerId: string;
  providerPaymentMethodId: string;
  cardBrand: string;
  cardLast4: string;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  bankDebitMandateReference: string;
};


export type EmployerBillingResolution = {
  employerId: string;
  organizationId: string;
  billingMode: EmployerBillingMode;
  source: "Organization" | "Employer";
  billedThroughName: string;
  effectiveAccount: AlphaBillingAccount;
  organizationAccount: AlphaBillingAccount;
  employerAccount: AlphaBillingAccount;
};


export type BillingGateStatus = {
  canTransmit: boolean;
  error: string | null;
  billingMode: string | null;
  source: "Organization" | "Employer" | null;
  billedThroughName: string | null;
  paymentMethodType: BillingPaymentMethodType | null;
  paymentMethodStatus: BillingPaymentMethodStatus | null;
  configured: boolean;
};


export type UserInvitationStatus = 1 | 2 | 3 | 4;

export type UserInvitation = {
  id: string;
  email: string;
  organizationId: string;
  employerId: string | null;
  employerName: string | null;
  organizationRole: OrganizationRole | null;
  employerRole: EmployerRole | null;
  status: UserInvitationStatus;
  expiresAt: string;
  createdBy: string;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  createdAt: string;
};

export type PublicInvitation = {
  email: string;
  organizationId: string;
  organizationName: string;
  employerId: string | null;
  employerName: string | null;
  organizationRole: OrganizationRole | null;
  employerRole: EmployerRole | null;
  status: UserInvitationStatus;
  expiresAt: string;
  usable: boolean;
};

export type CreateInvitationInput = {
  email: string;
  nationalId: string;
  phone: string;
  employerId?: string | null;
  organizationRole?: OrganizationRole | null;
  employerRole?: EmployerRole | null;
  expiresInDays?: number;
};


export type ScopeEmployer = {
  id: string;
  organizationId: string;
  legalName: string;
  registrationNumber: string;
  withholdingFileNumber: string;
  status: number;
};

export type ScopeOrganization = {
  id: string;
  name: string;
  type: number;
  status: number;
  hasOrganizationScope: boolean;
  canManageOrganization: boolean;
  employers: ScopeEmployer[];
};

export type GlobalScopeContext = {
  organizations: ScopeOrganization[];
  organizationCount: number;
  employerCount: number;
};


export type PaymentMethodSetupResult = {
  provider: string;
  setupRequestId: string;
  redirectUrl: string;
};

export type PaymentMethodSyncResult = {
  provider: string;
  status: BillingPaymentMethodStatus;
  cardBrand: string;
  cardLast4: string;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
};


export type PensionPaymentResolution = {
  employerId: string;
  organizationId: string;
  mode: EmployerPensionPaymentMode;
  source: "Organization" | "Employer";
  inherited: boolean;
  account: EmployerPaymentAccount | null;
  organizationAccount: EmployerPaymentAccount | null;
  employerAccount: EmployerPaymentAccount | null;
};

export type OrganizationPaymentAccountResponse = {
  account: EmployerPaymentAccount | null;
};


export type BillingMetricType = 1 | 2 | 3 | 4 | 5;
export type BillingPricingType = 1 | 2 | 3;
export type CorrectionBillingMode = 1 | 2 | 3 | 4;

export type BillingPricingTier = {
  id?: string;
  fromQuantity: number;
  toQuantity: number | null;
  unitPrice: number;
};

export type BillingPricingComponent = {
  id?: string;
  version?: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  metricType: BillingMetricType;
  pricingType: BillingPricingType;
  unitPrice: number;
  includedQuantity: number;
  minimumCharge: number | null;
  maximumCharge: number | null;
  isEnabled: boolean;
  correctionMode?: CorrectionBillingMode | null;
  tiers?: BillingPricingTier[];
};

export type BillingPlan = {
  id: string;
  code: string;
  name: string;
  description: string;
  currency: string;
  billingInterval: string;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  correctionBillingMode: CorrectionBillingMode;
  correctionUnitPrice: number | null;
  includedCorrections: number;
  includedCorrectionRows: number;
  maxEmployers: number;
  maxEmployees: number;
  maxUsers: number;
  isActive: boolean;
  components: BillingPricingComponent[];
};

export type BillingAccountPricingType = "Free" | "PerEmployee" | "PerReportRow";

export type BillingAccountPricingProfile = {
  billingAccountId: string;
  billingType: BillingAccountPricingType;
  unitPrice: number;
};

export type BillingAccountPricingInput = {
  billingType: BillingAccountPricingType;
  unitPrice: number | null;
};

export type BillingPlanInput = {
  code: string;
  name: string;
  description: string;
  currency: string;
  billingInterval: string;
  maxEmployers: number;
  maxEmployees: number;
  maxUsers: number;
  isActive: boolean;
  correctionBillingMode: CorrectionBillingMode;
  correctionUnitPrice: number | null;
  includedCorrections: number;
  includedCorrectionRows: number;
  effectiveFrom: string | null;
  components: BillingPricingComponent[];
};

export type BillingCalculationLine = {
  metric: BillingMetricType | string;
  quantity: number;
  includedQuantity: number;
  billableQuantity: number;
  unitPrice: number;
  amount: number;
};

export type BillingCalculation = {
  subtotal: number;
  total: number;
  components: BillingCalculationLine[];
};

export type BillingCustomerRow = {
  payerType: "Organization" | "Employer";
  entityType: "Organization" | "Employer";
  payerId: string;
  payerName: string;
  organizationId: string;
  organizationName: string;
  employerId: string | null;
  employerName: string | null;
  billingAccountId: string | null;
  billingSource: "Organization" | "Employer";
  billedThroughName: string;
  inherited: boolean;
  paymentMethodStatus: number | string;
  paymentMethodType: number | string;
  cardBrand: string;
  cardLast4: string;
  configured: boolean;
  billingType: BillingAccountPricingType;
  unitPrice: number;
};

export type BillingMonthlySummaryRow = {
  id: string;
  billingAccountId: string;
  payerType: "Organization" | "Employer";
  payerName: string;
  organizationId: string | null;
  organizationName: string;
  employerId: string | null;
  employerName: string | null;
  month: string;
  periodStart: string;
  periodEnd: string;
  status: number | string;
  accountStatus: number | string;
  paymentMethodStatus: number | string;
  paymentMethodType: number | string;
  cardBrand: string;
  cardLast4: string;
  currency: string;
  amount: number;
  paid: boolean;
  paymentId: string | null;
  paymentStatus: number | string | null;
  provider: string;
  providerTransactionId: string;
  failureCode: string;
  failureMessage: string;
  paidAt: string | null;
  calculatedAt: string | null;
  chargedAt: string | null;
  billingType: BillingAccountPricingType;
  unitPrice: number;
};

export type BillingPeriod = {
  id: string;
  billingAccountId: string;
  planId: string;
  periodStart: string;
  periodEnd: string;
  status: number | string;
  currency: string;
  subtotal: number;
  total: number;
  calculationSnapshotJson?: string;
  calculatedAt: string | null;
  chargedAt: string | null;
};

export type BillingPayment = {
  id: string;
  billingAccountId: string;
  billingPeriodId: string;
  amount: number;
  currency: string;
  status: number | string;
  provider: string;
  providerTransactionId: string;
  invoiceReference: string;
  failureCode: string;
  failureMessage: string;
  paidAt: string | null;
  createdAt: string;
};

export type BillingRefund = {
  id: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: number | string;
  providerRefundId: string;
  errorMessage: string;
  idempotencyKey: string;
  createdAt: string;
};

export type BillingUsageRow = {
  id: string;
  employerId: string | null;
  metricType: BillingMetricType | string;
  quantity: number;
  includedQuantity: number;
  billableQuantity: number;
  unitPrice: number;
  amount: number;
  sourceType: string;
  sourceId: string;
};

export type BillingCustomerContext = {
  organizationId: string;
  employerId: string | null;
  source: "Organization" | "Employer";
  billedThroughName: string;
  canManageBilling: boolean;
  account: {
    id: string | null;
    billingMode: BillingMode | null;
    status: BillingAccountStatus;
    paymentMethodType: BillingPaymentMethodType;
    paymentMethodStatus: BillingPaymentMethodStatus;
    cardBrand: string;
    cardLast4: string;
    cardExpiryMonth: number | null;
    cardExpiryYear: number | null;
    hasBankDebitMandate: boolean;
    configured: boolean;
  };
};
