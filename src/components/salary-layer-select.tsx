"use client";

import { UiSelect } from "@/components/ui-controls";
import { useEffect, useState } from "react";
import { getPensionEditorReferenceData } from "@/lib/pension-editor-reference-data";

type SalaryLayerOption = { code: number; name: string };

export function SalaryLayerSelect({ value, disabled = false, onChange }: { value: string; disabled?: boolean; onChange: (value: string) => void }) {
  const [options, setOptions] = useState<SalaryLayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getPensionEditorReferenceData()
      .then((data) => { if (active) setOptions(data.salaryLayers); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "טעינת רובדי השכר נכשלה"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

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
