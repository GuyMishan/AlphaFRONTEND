"use client";

import { type EmployerInterfacePreviousReference, type EmployerInterfaceProductMetadataInput } from "@/features/reporting/employer-interface-api";
import { type ManualDepositRow } from "@/features/reporting/deposits-api";
import type { PensionFundOption } from "@/features/pension/types";
import type { BankBranchOption, BankOption } from "@/features/reference-data/types";

export const productNames: Record<number, string> = { 1: "קרן פנסיה", 2: "קרן השתלמות", 3: "ביטוח מנהלים", 4: "קופת גמל", 99: "אחר" };
export const emptyPreviousReference = (): EmployerInterfacePreviousReference => ({ previousIdentifier: "", previousClearingIdentifier: "", previousReferenceExceptionCode: null });
export const shortError = (message: string) => message.trim().replace(/\s+/g, " ").slice(0, 220) + (message.trim().replace(/\s+/g, " ").length > 220 ? "…" : "");
export function formatEmployerAccount(row: ManualDepositRow, resolved: { bankId: number; branchId: number; maskedAccountNumber: string } | null) {
  const values = [row.employerBankCode, row.employerBranch, row.employerAccount].filter(Boolean);
  const meaningful = values.some((value) => !/^0+$/.test(String(value)));
  if (meaningful && values.length === 3) return values.join(" - ");
  if (resolved) return formatAccount(resolved.bankId, resolved.branchId, resolved.maskedAccountNumber);
  return meaningful ? values.join(" - ") : "—";
}
export function formatAccount(bank: string | number, branch: string | number, account: string) {
  return `${bank} - ${branch} - ${account}`;
}
export function emptyMetadata(): EmployerInterfaceProductMetadataInput {
  return { operationCode: null, depositStatus: null, employeeStatus: null, statusStartDate: null, employmentPercentage: null, workDaysInMonth: null, lastDeposit: null, refundReason: null, collectiveAgreementRefund: null, paymentMethodCode: null, employerAccountType: null, receiverAccountType: null, oldPensionTypeCode: null };
}
export function providerAccountFromReference(product: PensionFundOption | null) {
  if (!product?.accountNumber) return "";
  return [product.bankCode, product.branchCode, product.accountNumber].filter((value) => value !== null && value !== undefined && value !== "").join(" - ");
}
export function bankLabel(bank: BankOption) { return `${bank.bankCode} - ${bank.bankName}`; }
export function branchLabel(branch: BankBranchOption) { return `${branch.branchCode} - ${branch.branchName}${branch.city ? ` · ${branch.city}` : ""}`; }
