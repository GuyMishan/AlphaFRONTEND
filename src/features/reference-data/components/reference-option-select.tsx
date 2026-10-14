"use client";

import { UiSelect } from "@/components/ui/ui-controls";
import { useEffect, useMemo, useState } from "react";
import { referenceDataApi } from "@/features/reference-data/api";
import type { ReferenceOption } from "@/features/reference-data/types";
import { errorMessage } from "@/lib/api/error-messages";

type Props = {
  category: string;
  scope?: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  suppliedOptions?: ReferenceOption[];
  suppliedLoading?: boolean;
  suppliedError?: string;
};

export function ReferenceOptionSelect({ category, scope = "all", value, onChange, disabled, required, placeholder = "בחרו אפשרות", className, suppliedOptions, suppliedLoading, suppliedError }: Props) {
  const [options, setOptions] = useState<ReferenceOption[]>(suppliedOptions ?? []);
  const [loading, setLoading] = useState(suppliedOptions ? Boolean(suppliedLoading) : true);
  const [error, setError] = useState(suppliedError ?? "");

  useEffect(() => {
    if (suppliedOptions) {
      setOptions(suppliedOptions);
      setLoading(Boolean(suppliedLoading));
      setError(suppliedError ?? "");
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    referenceDataApi.options(category, scope)
      .then((items) => { if (active) setOptions(items); })
      .catch((err) => { if (active) setError(errorMessage(err, "טעינת האפשרויות נכשלה")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category, scope, suppliedOptions, suppliedLoading, suppliedError]);

  const normalized = value == null ? "" : String(value);
  const hasCurrent = useMemo(() => options.some((item) => item.value === normalized), [options, normalized]);

  return <UiSelect className={className} disabled={disabled || loading || Boolean(error)} required={required} value={normalized} onChange={(event) => onChange(event.target.value)}>
    <option value="">{error ? "שגיאה בטעינת אפשרויות" : loading ? "טוען אפשרויות..." : placeholder}</option>
    {!hasCurrent && normalized ? <option value={normalized}>{normalized}</option> : null}
    {options.map((option) => <option key={`${option.scope}:${option.value}`} value={option.value}>{option.label}</option>)}
  </UiSelect>;
}
