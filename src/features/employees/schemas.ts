import { z } from "zod";
import { email } from "@/lib/forms/zod-rules";
import { isIsraeliId } from "@/lib/forms/validators";
import type { EmployeeInput } from "./types";

const required = (message: string) => z.string().trim().min(1, message);

function isReasonableStartDate(value: string) {
  const start = new Date(`${value}T00:00:00`);
  const max = new Date(); max.setFullYear(max.getFullYear() + 1);
  return !Number.isNaN(start.getTime()) && start >= new Date("1950-01-01T00:00:00") && start <= max;
}

/** Employee master data (create/edit, report-draft inline create, feedback employee resolver). */
export const employeeSchema = z.object({
  identifierType: z.union([z.literal(1), z.literal(2)]),
  nationalId: z.string().trim(),
  firstName: z.string().trim().min(2, "שם פרטי הוא שדה חובה ולפחות 2 תווים."),
  lastName: z.string().trim().min(2, "שם משפחה הוא שדה חובה ולפחות 2 תווים."),
  employeeNumber: required("מספר עובד הוא שדה חובה."),
  startDate: z.string().min(1, "תאריך תחילת עבודה הוא שדה חובה.").refine(isReasonableStartDate, "תאריך תחילת העבודה אינו הגיוני."),
  // The salary input is a number field whose empty value means 0.
  monthlySalary: z.union([z.number(), z.string()])
    .transform((value) => value === "" ? 0 : Number(value))
    .pipe(z.number({ error: "שכר חודשי לא יכול להיות שלילי." }).min(0, "שכר חודשי לא יכול להיות שלילי.")),
  birthDate: z.string().nullable().refine((value) => Boolean(value), "תאריך לידה הוא שדה חובה."),
  gender: z.number().nullable().refine((value) => Boolean(value), "מין העובד הוא שדה חובה."),
  email: email(),
  mobile: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().regex(/^\d{1,15}$/, "מספר הנייד חייב להכיל 1-15 ספרות.")),
  city: required("יישוב הוא שדה חובה."),
  street: required("רחוב הוא שדה חובה."),
  houseNumber: required("מספר בית הוא שדה חובה."),
  apartment: required("מספר דירה הוא שדה חובה."),
  postalCode: z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().regex(/^\d{0,7}$/, "מיקוד חייב להכיל עד 7 ספרות.")),
  postOfficeBox: z.string().trim(),
}).superRefine((value, ctx) => {
  if (value.identifierType === 1 && !isIsraeliId(value.nationalId))
    ctx.addIssue({ code: "custom", path: ["nationalId"], message: "תעודת הזהות אינה תקינה." });
  if (value.identifierType === 2 && (!value.nationalId || value.nationalId.length > 16 || /\s/.test(value.nationalId)))
    ctx.addIssue({ code: "custom", path: ["nationalId"], message: "מספר הדרכון הוא שדה חובה ויכול להכיל עד 16 תווים ללא רווחים." });
  if (value.postOfficeBox && (!/^\d{1,5}$/.test(value.postOfficeBox) || Number(value.postOfficeBox) > 99999))
    ctx.addIssue({ code: "custom", path: ["postOfficeBox"], message: "תא דואר חייב להיות מספר בין 0 ל־99999." });
  else if (!value.postOfficeBox && (!value.city || !value.street || !value.houseNumber || !value.postalCode))
    ctx.addIssue({ code: "custom", path: ["postOfficeBox"], message: "יש להזין תא דואר או כתובת רחוב מלאה הכוללת מיקוד." });
}) satisfies z.ZodType<EmployeeInput, unknown>;

export type EmployeeFormValues = z.input<typeof employeeSchema>;

export const EMPLOYEE_FIELDS = [
  "identifierType", "nationalId", "firstName", "lastName", "employeeNumber", "startDate", "monthlySalary", "birthDate", "gender",
  "email", "mobile", "city", "street", "houseNumber", "apartment", "postalCode", "postOfficeBox",
] as const satisfies readonly (keyof EmployeeFormValues)[];
