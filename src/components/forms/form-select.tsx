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
 * UiSelect bound to a react-hook-form field. UiSelect renders its trigger label
 * from `value`, so it must be controlled; `register()` alone would leave it blank.
 */
export function FormSelect<TValues extends FieldValues>({ control, name, numeric = false, ...props }: FormSelectProps<TValues>) {
  const { field: { name: fieldName, value, onBlur, onChange } } = useController({ control, name });
  return <UiSelect
    {...props}
    name={fieldName}
    value={value ?? ""}
    onBlur={onBlur}
    onChange={(event) => onChange(numeric ? Number(event.target.value) : event.target.value)}
  />;
}
