"use client";

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
}: {
  category: string;
  scope?: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
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

  const hasCurrentValue = useMemo(() => value != null && options.some((item) => item.code === Number(value)), [options, value]);

  return (
    <>
      <select
        disabled={disabled || loading}
        required={required}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      >
        <option value="">{loading ? "טוען אפשרויות..." : placeholder}</option>
        {!hasCurrentValue && value != null ? <option value={Number(value)}>קוד {Number(value)}</option> : null}
        {options.map((item) => <option key={`${item.scope}-${item.code}`} value={item.code}>{item.name} ({item.code})</option>)}
      </select>
      {error ? <span className="field-error">{error}</span> : null}
    </>
  );
}
