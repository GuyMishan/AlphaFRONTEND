"use client";

import { UiSelect } from "@/components/ui-controls";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";

type SalaryLayerOption = { code: number; name: string };

export function SalaryLayerSelect({ value, disabled = false, onChange, suppliedOptions, suppliedLoading, suppliedError }: { value: string; disabled?: boolean; onChange: (value: string) => void; suppliedOptions?: SalaryLayerOption[]; suppliedLoading?: boolean; suppliedError?: string }) {
  const [options, setOptions] = useState<SalaryLayerOption[]>(suppliedOptions ?? []);
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
    const session = getSession();
    const headers = new Headers({ Accept: "application/json" });
    if (session?.mode === "development" && session.userId) {
      headers.set("X-Alpha-User-Id", session.userId);
      if (session.platformAdmin) headers.set("X-Alpha-Platform-Admin", "true");
    }
    setLoading(true);
    setError("");
    fetch("/api/backend/api/reference-data/salary-layers", { headers, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`טעינת רובדי השכר נכשלה (${response.status})`);
        return response.json() as Promise<SalaryLayerOption[]>;
      })
      .then((items) => { if (active) setOptions(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "טעינת רובדי השכר נכשלה"); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [suppliedOptions, suppliedLoading, suppliedError]);

  const hasValue = options.some((item) => String(item.code) === String(value));

  return <>
    <UiSelect disabled={disabled || loading} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{loading ? "טוען רובדי שכר..." : "בחירת רובד שכר"}</option>
      {!hasValue && value ? <option value={value}>{value}</option> : null}
      {options.map((item) => <option key={item.code} value={String(item.code)}>{item.name} ({item.code})</option>)}
    </UiSelect>
    {error ? <span className="field-error">{error}</span> : null}
  </>;
}
