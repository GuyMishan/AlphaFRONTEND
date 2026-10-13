import { z } from "zod";
import type { EmployerRole, OrganizationRole } from "./types";

/**
 * New customer invitation. Rules and their order match the screen's single error
 * notice: the first failing rule is the message shown.
 */
export const invitationSchema = z.object({
  email: z.string().trim().toLowerCase().refine((value) => Boolean(value) && value.includes("@"), "יש להזין כתובת אימייל תקינה."),
  nationalId: z.string().trim().regex(/^\d{1,9}$/, "יש להזין תעודת זהות תקינה."),
  phone: z.string().trim().regex(/^05\d{8}$/, "יש להזין מספר פלאפון ישראלי תקין."),
  scope: z.enum(["organization", "employer"]),
  organizationRole: z.custom<OrganizationRole>(),
  employerRole: z.custom<EmployerRole>(),
  employerId: z.string(),
}).superRefine((value, ctx) => {
  if (value.scope === "employer" && !value.employerId)
    ctx.addIssue({ code: "custom", path: ["employerId"], message: "יש לבחור מעסיק להזמנה." });
});

export type InvitationValues = z.output<typeof invitationSchema>;
export const INVITATION_FIELD_ORDER = ["email", "nationalId", "phone", "employerId"] as const;
