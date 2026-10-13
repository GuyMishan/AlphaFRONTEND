import { z } from "zod";
import { digits, email, text } from "@/lib/forms/zod-rules";
import type { EmployerInput } from "./types";

const CONTACT_PHONE_REQUIRED = "יש להזין לפחות טלפון או נייד אחד.";

/** Employer profile (create/edit, onboarding, feedback code-18 contact fields). */
export const employerSchema = z.object({
  legalName: text(2, 200, "שם משפטי מלא הוא שדה חובה ולפחות 2 תווים."),
  registrationNumber: digits(5, 15, "מספר חברה / עוסק חייב להכיל 5-15 ספרות."),
  withholdingFileNumber: digits(5, 9, "מספר תיק ניכויים חייב להכיל 5-9 ספרות. במידה ואין, יש להזין 900000000."),
  contactFirstName: text(2, 20, "שם פרטי של איש הקשר חייב להכיל 2–20 תווים."),
  contactLastName: text(2, 20, "שם משפחה של איש הקשר חייב להכיל 2–20 תווים."),
  contactPhone: z.string().transform((value) => value.replace(/\D/g, "")),
  contactMobile: z.string().transform((value) => value.replace(/\D/g, "")),
  contactEmail: email("כתובת האימייל של איש הקשר אינה תקינה."),
}).superRefine((value, ctx) => {
  if (!value.contactPhone && !value.contactMobile) {
    ctx.addIssue({ code: "custom", path: ["contactPhone"], message: CONTACT_PHONE_REQUIRED });
    ctx.addIssue({ code: "custom", path: ["contactMobile"], message: CONTACT_PHONE_REQUIRED });
    return;
  }
  if (value.contactPhone && !/^\d{9,11}$/.test(value.contactPhone))
    ctx.addIssue({ code: "custom", path: ["contactPhone"], message: "טלפון איש הקשר חייב להכיל 9–11 ספרות." });
  if (value.contactMobile && !/^05\d{8}$/.test(value.contactMobile))
    ctx.addIssue({ code: "custom", path: ["contactMobile"], message: "מספר הנייד חייב להכיל 10 ספרות ולהתחיל ב־05." });
}) satisfies z.ZodType<EmployerInput, unknown>;

export type EmployerFormValues = z.input<typeof employerSchema>;
