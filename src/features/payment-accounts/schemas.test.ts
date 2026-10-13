import { describe, expect, it } from "vitest";
import { isCompletePaymentAccount } from "./schemas";

const complete = { bankId: 12, branchId: 600, accountNumber: "123456", accountHolderName: "אלפא", accountHolderId: "514123456", isDefault: true };

describe("isCompletePaymentAccount", () => {
  it("requires bank, branch, account number and holder details", () => {
    expect(isCompletePaymentAccount(complete)).toBe(true);
    expect(isCompletePaymentAccount({ ...complete, bankId: 0 })).toBe(false);
    expect(isCompletePaymentAccount({ ...complete, branchId: 0 })).toBe(false);
    expect(isCompletePaymentAccount({ ...complete, accountNumber: "" })).toBe(false);
    expect(isCompletePaymentAccount({ ...complete, accountHolderName: "   " })).toBe(false);
    expect(isCompletePaymentAccount({ ...complete, accountHolderId: "" })).toBe(false);
  });
});
