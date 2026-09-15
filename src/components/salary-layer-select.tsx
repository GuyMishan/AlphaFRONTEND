"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/session";

type SalaryLayerOption = { code: number; name: string };

const fallbackOptions: SalaryLayerOption[] = [
  { code: 1, name: "שכר יסוד" },
  { code: 3, name: "דמי הבראה" },
  { code: 5, name: "שעות נוספות" },
  { code: 6, name: "החזר הוצאות" },
  { code: 7, name: "אחר" },
];

export function SalaryLayerSelect({ value, disabled = false, onChange }: { value: string; disabled?: boolean; onChange: (value: string) => void }) {
  const [options, setOptions] = useState<SalaryLayerOption[]>(fallbackOptions);

  useEffect(() => {
    let active = true;
    const session = getSession();
    const headers = new Headers({ Accept: "application/json" });
    if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
    if (session?.mode === "development" && session.userId) {
      headers.set("X-Alpha-User-Id", session.userId);
      if (session.platformAdmin) headers.set("X-Alpha-Platform-Admin", "true");
    }

    fetch("/api/backend/api/reference-data/salary-layers", { headers, cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<SalaryLayerOption[]> : fallbackOptions)
      .then((items) => { if (active && items.length) setOptions(items); })
      .catch(() => { /* keep fallback reference values */ });

    return () => { active = false; };
  }, []);

  return (
    <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
      {!options.some((item) => item.name === value) && value ? <option value={value}>{value}</option> : null}
      {options.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
    </select>
  );
}
