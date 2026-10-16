"use client";

import { useState } from "react";
import { billingApi } from "@/features/billing/api";
import type { BillingGateStatus } from "@/features/billing/types";
import { paymentAccountsApi } from "@/features/payment-accounts/api";
import type { EmployerPaymentAccount } from "@/features/payment-accounts/types";
import type { EmployerSelection } from "@/lib/session/app-store";
import type { PatchReportWizard } from "./model";

export function useReportBilling(scope: EmployerSelection, initialAccounts: EmployerPaymentAccount[], patch: PatchReportWizard) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [gate, setGate] = useState<BillingGateStatus | null>(null);
  const [open, setOpen] = useState(initialAccounts.length === 0);

  async function checkTransmission() {
    const fresh = await billingApi.employerBillingGate(scope.organizationId, scope.employerId);
    setGate(fresh);
    setOpen(!fresh.canTransmit);
    return fresh.canTransmit;
  }

  async function ensureAccess(paymentAccountId: string) {
    const fresh = await paymentAccountsApi.employerPaymentAccounts(scope.organizationId, scope.employerId);
    setAccounts(fresh);
    if (!paymentAccountId) patch({ paymentAccountId: fresh.find(item => item.isDefault)?.id ?? fresh[0]?.id ?? "" });
    if (!fresh.length) {
      setOpen(true);
      return false;
    }
    return checkTransmission();
  }

  return { accounts, gate, open, setOpen, ensureAccess, checkTransmission };
}
