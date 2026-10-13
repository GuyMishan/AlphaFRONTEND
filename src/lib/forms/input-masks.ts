import type { UseFormRegisterReturn } from "react-hook-form";

/**
 * Keeps a registered input digits-only while typing (IDs, phone numbers,
 * registration numbers), preserving the existing UX of stripping other characters.
 */
export function digitsOnly<TName extends string>(registration: UseFormRegisterReturn<TName>, maxLength: number): UseFormRegisterReturn<TName> {
  return {
    ...registration,
    onChange: (event) => {
      const input = event.target as HTMLInputElement;
      input.value = input.value.replace(/\D/g, "").slice(0, maxLength);
      return registration.onChange(event);
    },
  };
}

/** Strips whitespace while typing (passport numbers and similar identifiers). */
export function withoutWhitespace<TName extends string>(registration: UseFormRegisterReturn<TName>, maxLength: number): UseFormRegisterReturn<TName> {
  return {
    ...registration,
    onChange: (event) => {
      const input = event.target as HTMLInputElement;
      input.value = input.value.replace(/\s/g, "").slice(0, maxLength);
      return registration.onChange(event);
    },
  };
}
