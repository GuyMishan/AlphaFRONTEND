export type EmployerStatus = 1 | 2 | 3 | 4;

export type Employer = {
  id: string;
  organizationId: string;
  legalName: string;
  registrationNumber: string;
  withholdingFileNumber: string;
  status: EmployerStatus;
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactMobile?: string;
};

export type EmployerCapabilities = {
  canManageEmployer: boolean;
  canEditEmployer: boolean;
  canCreateEmployee: boolean;
  canEditEmployee: boolean;
  canCreateReport: boolean;
  canTransmitReport: boolean;
};

export type EmployerInput = Pick<Employer, "legalName" | "registrationNumber" | "withholdingFileNumber"> & {
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactMobile?: string;
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
