"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { useForm, type FieldValues, type Path, type RegisterOptions, type UseFormProps, type UseFormRegister } from "react-hook-form";
import type { z } from "zod";

export const INVALID_FORM_MESSAGE = "יש לתקן את השדות המסומנים באדום.";

/**
 * React Hook Form + Zod with Alpha's validation UX:
 * - validate on submit (no errors while the user is still typing a fresh form);
 * - editing a field clears its error until the next submit;
 * - the first invalid field receives focus.
 *
 * The schema is the single source of client validation; the backend stays authoritative.
 */
export function useZodForm<TInput extends FieldValues, TOutput extends FieldValues>(
  schema: z.ZodType<TOutput, TInput>,
  options: Omit<UseFormProps<TInput, unknown, TOutput>, "resolver">,
) {
  const form = useForm<TInput, unknown, TOutput>({
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    shouldFocusError: true,
    ...options,
    resolver: zodResolver(schema),
  });

  const { register: baseRegister, clearErrors } = form;
  const register = useCallback((name: Path<TInput>, registerOptions?: RegisterOptions<TInput, Path<TInput>>) =>
    baseRegister(name, {
      ...registerOptions,
      onChange: (event: unknown) => {
        clearErrors(name);
        return registerOptions?.onChange?.(event);
      },
    }), [baseRegister, clearErrors]) as UseFormRegister<TInput>;

  return { ...form, register };
}
