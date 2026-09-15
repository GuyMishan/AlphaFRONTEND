"use client";

import { useEffect, useMemo, useState } from "react";
import { alphaApi } from "@/lib/api";
import type { PensionFundOption, PensionProductType } from "@/lib/types";

type FundValue = {
  fundExternalKey?: string;
  fundCode?: string;
  fundName?: string;
  fundCompanyName?: string;
};

type Props = {
  productType: PensionProductType;
  value: FundValue;
  disabled?: boolean;
  onChange: (value: Required<FundValue>) => void;
};

export function PensionFundSelect({ productType, value, disabled = false, onChange }: Props) {
  const [options, setOptions] = useState<PensionFundOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (productType === 99) {
      setOptions([]);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    alphaApi.pensionFunds(productType)
      .then((items) => { if (active) setOptions(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "טעינת רשימת הקופות נכשלה"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productType]);

  const selectedExists = useMemo(() => options.some((item) => item.externalKey === value.fundExternalKey), [options, value.fundExternalKey]);

  if (productType === 99) {
    return <div className="field"><label>קופה</label><input disabled value="לא נדרש עבור מוצר מסוג אחר" /></div>;
  }

  return <div className="field">
    <label>קופה *</label>
    <select
      disabled={disabled || loading}
      value={value.fundExternalKey ?? ""}
      onChange={(event) => {
        const item = options.find((option) => option.externalKey === event.target.value);
        if (!item) {
          onChange({ fundExternalKey: "", fundCode: "", fundName: "", fundCompanyName: "" });
          return;
        }
        onChange({ fundExternalKey: item.externalKey, fundCode: item.fundCode, fundName: item.fundName, fundCompanyName: item.companyName });
      }}
    >
      <option value="">{loading ? "טוען קופות..." : "בחר קופה"}</option>
      {!selectedExists && value.fundExternalKey ? <option value={value.fundExternalKey}>{value.fundName || value.fundCode || "קופה שמורה"}</option> : null}
      {options.map((item) => <option key={item.externalKey} value={item.externalKey}>{item.fundCode ? `${item.fundCode} · ` : ""}{item.fundName}{item.companyName ? ` · ${item.companyName}` : ""}</option>)}
    </select>
    {error ? <span style={{ color: "var(--danger, #b42318)", fontSize: 12 }}>{error}</span> : null}
    {!loading && !error && options.length === 0 ? <span style={{ color: "var(--muted)", fontSize: 12 }}>אין קופות מסונכרנות מסוג זה. יש להריץ את ממשק הקופות במסך האדמין.</span> : null}
  </div>;
}
