import { z } from "zod";
import { email, israeliId, israeliMobile } from "@/lib/forms/zod-rules";
import { isIsraeliId } from "@/lib/forms/validators";

const PHONE_MESSAGE = "מספר הטלפון חייב להיות מספר נייד ישראלי בן 10 ספרות.";

/** Prototype login identity accepted without the check digit (client-side only; the backend still authenticates). */
const PROTOTYPE_NATIONAL_ID = "123456789";

export const loginSchema = z.object({
  nationalId: z.string().refine((value) => value === PROTOTYPE_NATIONAL_ID || isIsraeliId(value), "תעודת הזהות אינה תקינה."),
  phone: israeliMobile(PHONE_MESSAGE),
});

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, "שם מלא הוא שדה חובה ובאורך 2-120 תווים.").max(120, "שם מלא הוא שדה חובה ובאורך 2-120 תווים."),
  nationalId: israeliId(),
  phone: israeliMobile(PHONE_MESSAGE),
  email: email("כתובת האימייל אינה תקינה.", 254).transform((value) => value.toLowerCase()),
  acceptedTerms: z.boolean().refine(Boolean, "יש לאשר את תנאי השימוש והמדיניויות."),
  marketingEmailOptIn: z.boolean(),
  legalVersion: z.number().int().positive("המסמך המשפטי אינו זמין כרגע."),
});

export type LoginValues = z.output<typeof loginSchema>;
export type RegisterValues = z.output<typeof registerSchema>;

export const OTP_CODE_PATTERN = /^\d{6}$/;
