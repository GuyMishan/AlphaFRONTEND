import { z } from "zod";

export const PAYMENT_ACCOUNT_REQUIRED_MESSAGE = "יש למלא בנק, סניף, מספר חשבון ופרטי בעל החשבון.";

/**
 * Pension payment bank account (organization or employer). The forms keep their
 * own controlled state for the bank/branch autocompletes; this schema is the
 * single client rule both apply before saving. The backend validates the details.
 */
export const paymentAccountSchema = z.object({
  bankId: z.number().positive(),
  branchId: z.number().positive(),
  accountNumber: z.string().min(1),
  accountHolderName: z.string().trim().min(1),
  accountHolderId: z.string().min(1),
  isDefault: z.boolean(),
});

export function isCompletePaymentAccount(value: unknown) {
  return paymentAccountSchema.safeParse(value).success;
}
