import { z } from "zod";
import type { OrganizationGeneralInput } from "./api";

const digits = z.string().transform((value) => value.replace(/\D/g, ""));

/** Organization general details. Required-ness of the name is enforced by the native input, as before. */
export const organizationGeneralSchema = z.object({
  name: z.string(),
  type: z.number(),
  registrationNumber: z.string(),
  city: z.string(),
  street: z.string(),
  houseNumber: z.string(),
  apartment: z.string(),
  postalCode: digits,
  postOfficeBox: z.string(),
  contactName: z.string(),
  contactEmail: z.string(),
  contactPhone: digits,
}) satisfies z.ZodType<OrganizationGeneralInput, unknown>;

export type OrganizationGeneralValues = z.input<typeof organizationGeneralSchema>;

/** New organization (platform admin). */
export const newOrganizationSchema = z.object({
  name: z.string().trim().min(1, "שם הארגון הוא שדה חובה.").max(200),
  type: z.number(),
});
