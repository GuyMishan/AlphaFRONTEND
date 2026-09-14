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

export type EmployerInput = Pick<Employer, "legalName" | "registrationNumber" | "withholdingFileNumber">;
export type EmployeeInput = Pick<Employee, "nationalId" | "firstName" | "lastName" | "employeeNumber" | "startDate">;
