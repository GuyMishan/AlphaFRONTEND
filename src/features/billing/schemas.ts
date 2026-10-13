import { z } from "zod";
import { isValidEmail } from "@/lib/forms/validators";
import type { AlphaBillingAccountInput } from "./types";

const required = (message: string) => z.string().trim().min(1, message);

/** Details of the account that pays Alpha (organization or employer). */
export const billingAccountSchema = z.object({
  billingName: required("שם לחיוב הוא שדה חובה."),
  taxId: required("ח.פ. / עוסק הוא שדה חובה."),
  invoiceEmail: required("אימייל לחשבוניות הוא שדה חובה.").refine(isValidEmail, "יש להזין כתובת אימייל תקינה."),
  billingAddress: required("כתובת לחיוב היא שדה חובה."),
  paymentMethodType: z.union([z.literal(1), z.literal(2)]),
}) satisfies z.ZodType<AlphaBillingAccountInput, unknown>;
