import type { EmployerPensionPaymentMode } from "@/features/employers/types";

export type BankDebitMandateStatus = 1 | 2 | 3 | 4 | 5;

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
