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
  workspaceReportProductId?: string | null;
  sourceReportProductId?: string | null;
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
  depositStatus?: number | null;
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
