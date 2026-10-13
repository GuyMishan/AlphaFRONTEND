import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "@/lib/api/errors";

/**
 * Applies backend VALIDATION_FAILED field errors (RFC 9457 `errors`) to a form.
 * Backend keys are matched case-insensitively to form field names (and through
 * `aliases` when the DTO name differs). Returns true when at least one field
 * error was applied, so callers can skip a generic toast.
 */
export function applyServerErrors<TValues extends FieldValues>(
  error: unknown,
  fieldNames: readonly Path<TValues>[],
  setError: UseFormSetError<TValues>,
  aliases: Partial<Record<string, Path<TValues>>> = {},
): boolean {
  if (!isApiError(error)) return false;
  const byLowerName = new Map(fieldNames.map((name) => [name.toLowerCase(), name]));
  let applied = false;
  let first = true;
  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const field = aliases[key] ?? byLowerName.get(key.toLowerCase());
    if (!field || !messages[0]) continue;
    setError(field, { type: "server", message: messages[0] }, { shouldFocus: first });
    first = false;
    applied = true;
  }
  return applied;
}
