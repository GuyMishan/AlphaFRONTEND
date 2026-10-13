export type Employee = {
  id: string;
  employeeNumber: string;
  status: number;
  startDate: string;
  endDate: string | null;
  monthlySalary?: number;
  personId: string;
  nationalId: string;
  identifierType?: 1 | 2;
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

export type EmployeeInput = Pick<Employee, "nationalId" | "firstName" | "lastName" | "employeeNumber" | "startDate" | "monthlySalary"> & {
  identifierType?: 1 | 2;
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
