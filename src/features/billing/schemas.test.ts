import { describe, expect, it } from "vitest";
import { billingAccountSchema } from "./schemas";

const valid = { billingName: " אלפא ", taxId: "514123456", invoiceEmail: "billing@example.com", billingAddress: "הרצל 1", paymentMethodType: 1 as const };

describe("billingAccountSchema", () => {
  it("accepts ordinary invoice emails and trims values", () => {
    expect(billingAccountSchema.parse(valid)).toMatchObject({ billingName: "אלפא", invoiceEmail: "billing@example.com" });
    expect(billingAccountSchema.safeParse({ ...valid, invoiceEmail: "finance.team@alpha.co.il" }).success).toBe(true);
  });

  it("keeps the field messages", () => {
    const result = billingAccountSchema.safeParse({ ...valid, billingName: " ", invoiceEmail: "not-an-email" });
    expect(result.success).toBe(false);
    expect(Object.fromEntries(result.error!.issues.map((issue) => [issue.path[0], issue.message]))).toEqual({
      billingName: "שם לחיוב הוא שדה חובה.",
      invoiceEmail: "יש להזין כתובת אימייל תקינה.",
    });
  });
});
