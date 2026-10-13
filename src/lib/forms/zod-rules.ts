import { z } from "zod";
import { isIsraeliId, isValidEmail } from "@/lib/forms/validators";

/**
 * Reusable Zod building blocks with Hebrew messages. Feature schemas compose
 * these; business rules specific to one feature stay in that feature's schema.
 * Every rule trims first, matching how the forms normalize input before saving.
 */

/** Trimmed text with a length range. */
export const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, message);

/** Optional trimmed text: empty is allowed. */
export const optionalText = (max: number, message: string) => z.string().trim().max(max, message);

/** Digits only, length in [min, max]. */
export const digits = (min: number, max: number, message: string) =>
  z.string().trim().regex(new RegExp(`^\\d{${min},${max}}$`), message);

export const email = (message = "כתובת האימייל אינה תקינה.", max = 50) =>
  z.string().trim().max(max, message).refine(isValidEmail, message);

export const israeliId = (message = "תעודת הזהות אינה תקינה.") =>
  z.string().trim().refine(isIsraeliId, message);

/** Israeli mobile: 10 digits starting with 05. */
export const israeliMobile = (message = "מספר הנייד חייב להכיל 10 ספרות ולהתחיל ב־05.") =>
  z.string().trim().regex(/^05\d{8}$/, message);
