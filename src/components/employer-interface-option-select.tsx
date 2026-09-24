"use client";

import { UiSelect } from "@/components/ui-controls";
import { useEffect, useMemo, useState } from "react";
import { employerInterfaceApi, type EmployerInterfaceOption } from "@/lib/employer-interface-api";

export function EmployerInterfaceOptionSelect({
  category,
  scope = "all",
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = "בחירה",
  allowedCodes,
}: {
  category: string;
  scope?: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  allowedCodes?: number[];
}) {
  const [options, setOptions] = useState<EmployerInterfaceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    employerInterfaceApi.options(category, scope)
      .then((items) => { if (active) setOptions(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "טעינת האפשרויות נכשלה"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category, scope]);

  const visibleOptions = useMemo(\n    () => allowedCodes?.length ? options.filter((item) => allowedCodes.includes(item.code)) : options,\n    [allowedCodes, options],\n  );\n  const hasCurrentValue = useMemo(() => value != null && visibleOptions.some((item) => item.code === Number(value)), [visibleOptions, value]);

  return (
    <>
      <UiSelect
        disabled={disabled || loading}
        required={required}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      >
        <option value="">{loading ? "טוען אפשרויות..." : placeholder}</option>
        {!hasCurrentValue && value != null ? <option value={Number(value)}>קוד {Number(value)}</option> : null}
        {visibleOptions.map((item) => <option key={`${item.scope}-${item.code}`} value={item.code}>{item.name} ({item.code})</option>)}
      </UiSelect>
      {error ? <span className="field-error">{error}</span> : null}
    </>
  );
}
