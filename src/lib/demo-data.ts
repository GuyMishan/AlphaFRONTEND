import type { Employee, Employer, Organization } from "./types";

export const DEMO_CREDENTIALS = {
  nationalId: "123456789",
  phone: "0501234567",
};

export const demoOrganizations: Organization[] = [{
  id: "10000000-0000-0000-0000-000000000001",
  name: "Alpha תפעול פנסיוני",
  type: 4,
  status: 2,
}];

export const demoEmployers: Employer[] = [{
  id: "20000000-0000-0000-0000-000000000001",
  organizationId: demoOrganizations[0].id,
  legalName: "אלפא טכנולוגיות בע״מ",
  registrationNumber: "515555555",
  withholdingFileNumber: "935555555",
  status: 2,
}];

export const demoEmployees: Employee[] = [
  { id: "30000000-0000-0000-0000-000000000001", personId: "40000000-0000-0000-0000-000000000001", employeeNumber: "1001", nationalId: "204123456", firstName: "נועה", lastName: "כהן", startDate: "2024-01-15", endDate: null, status: 1 },
  { id: "30000000-0000-0000-0000-000000000002", personId: "40000000-0000-0000-0000-000000000002", employeeNumber: "1002", nationalId: "207654321", firstName: "דניאל", lastName: "לוי", startDate: "2024-03-01", endDate: null, status: 1 },
  { id: "30000000-0000-0000-0000-000000000003", personId: "40000000-0000-0000-0000-000000000003", employeeNumber: "1003", nationalId: "206987654", firstName: "מאיה", lastName: "ישראלי", startDate: "2025-06-10", endDate: null, status: 1 },
];
