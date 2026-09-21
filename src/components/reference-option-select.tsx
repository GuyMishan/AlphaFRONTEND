"use client";

import { UiSelect } from "@/components/ui-controls";
import { useEffect, useMemo, useState } from "react";
import { referenceOptionsApi, type ReferenceOption } from "@/lib/reference-options-api";

type Props = {
  category: string;
  scope?: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
};

export function ReferenceOptionSelect({ category, scope = "all", value, onChange, disabled, required, placeholder = "בחרו אפשרות", className }: Props) {
  const [options, setOptions] = useState<ReferenceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    referenceOptionsApi.list(category, scope)
      .then((items) => { if (active) setOptions(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "טעינת האפשרויות נכשלה"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category, scope]);

  const normalized = value == null ? "" : String(value);
  const hasCurrent = useMemo(() => options.some((item) => item.value === normalized), [options, normalized]);

  return <UiSelect className={className} disabled={disabled || loading || Boolean(error)} required={required} value={normalized} onChange={(event) => onChange(event.target.value)}>
    <option value="">{error ? "שגיאה בטעינת אפשרויות" : loading ? "טוען אפשרויות..." : placeholder}</option>
    {!hasCurrent && normalized ? <option value={normalized}>{normalized}</option> : null}
    {options.map((option) => <option key={`${option.scope}:${option.value}`} value={option.value}>{option.label}</option>)}
  </UiSelect>;
}
