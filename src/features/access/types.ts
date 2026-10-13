export type OrganizationRole = 1 | 2 | 3 | 4;

export type EmployerRole = 1 | 2 | 3 | 4;

export type EmployerAccessMode = 1 | 2;

export type AccessUser = {
  membershipId: string | null;
  userId: string;
  displayName: string;
  email: string;
  isActive: boolean;
  role: OrganizationRole | null;
  employerAccessMode: EmployerAccessMode;
  canCreateEmployer: boolean;
  canEditEmployer: boolean;
  canCreateEmployee: boolean;
  canEditEmployee: boolean;
  canCreateReport: boolean;
  canTransmitReport: boolean;
  directEmployerOnly: boolean;
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
