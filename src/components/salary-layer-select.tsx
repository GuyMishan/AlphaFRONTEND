"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";

type SalaryLayerOption = { code: number; name: string };

export function SalaryLayerSelect({ value, disabled = false, onChange }: { value: string; disabled?: boolean; onChange: (value: string) => void }) {
  const [options, setOptions] = useState<SalaryLayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const session = getSession();
    const headers = new Headers({ Accept: "application/json" });
    if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
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
  }, []);

  const hasValue = options.some((item) => String(item.code) === String(value));

  return <>
    <select disabled={disabled || loading} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{loading ? "טוען רובדי שכר..." : "בחירת רובד שכר"}</option>
      {!hasValue && value ? <option value={value}>{value}</option> : null}
      {options.map((item) => <option key={item.code} value={String(item.code)}>{item.name} ({item.code})</option>)}
    </select>
    {error ? <span className="field-error">{error}</span> : null}
  </>;
}
