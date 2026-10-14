"use client";

import type { ComponentProps } from "react";
import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { UiSelect } from "@/components/ui/ui-controls";

type FormSelectProps<TValues extends FieldValues> = Omit<ComponentProps<typeof UiSelect>, "value" | "defaultValue" | "onChange" | "name"> & {
  control: Control<TValues>;
  name: FieldPath<TValues>;
  /** Store the selected option as a number (enum codes). */
  numeric?: boolean;
};

/**
 * UiSelect bound to a react-hook-form field, including numeric enum values and
 * the ref used to focus the visible control after validation fails.
 */
export function FormSelect<TValues extends FieldValues>({ control, name, numeric = false, ...props }: FormSelectProps<TValues>) {
  const { field: { name: fieldName, value, onBlur, onChange, ref } } = useController({ control, name });
  return <UiSelect
    {...props}
    ref={ref}
    name={fieldName}
    value={value ?? ""}
    onBlur={onBlur}
    onChange={(event) => onChange(numeric ? Number(event.target.value) : event.target.value)}
  />;
}
