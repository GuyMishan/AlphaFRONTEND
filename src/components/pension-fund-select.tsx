"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
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

function optionLabel(item: PensionFundOption) {
  return [item.fundCode, item.fundName, item.companyName].filter(Boolean).join(" · ");
}

export function PensionFundSelect({ productType, value, disabled = false, onChange }: Props) {
  const [query, setQuery] = useState(value.fundName || value.fundCode || "");
  const [options, setOptions] = useState<PensionFundOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value.fundName || value.fundCode || "");
  }, [value.fundExternalKey, value.fundName, value.fundCode]);

  useEffect(() => {
    if (productType === 99) {
      setOptions([]);
      setError("");
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(() => {
      let active = true;
      setLoading(true);
      setError("");
      alphaApi.pensionFunds(productType, query.trim(), 30)
        .then((items) => {
          if (!active) return;
          setOptions(items);
          setOpen(true);
        })
        .catch((err) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : "טעינת רשימת הקופות נכשלה");
          setOptions([]);
        })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, 250);

    return () => window.clearTimeout(timer);
  }, [productType, query]);

  const selectedLabel = useMemo(() => {
    if (!value.fundExternalKey) return "";
    return [value.fundCode, value.fundName, value.fundCompanyName].filter(Boolean).join(" · ");
  }, [value]);

  if (productType === 99) {
    return <div className="field"><label>קופה</label><input disabled value="לא נדרש עבור מוצר מסוג אחר" /></div>;
  }

  return <div className="field" style={{ position: "relative" }}>
    <label>קופה *</label>
    <div className="search" style={{ width: "100%" }}>
      <Search size={16} />
      <input
        disabled={disabled}
        value={query}
        autoComplete="off"
        placeholder="חיפוש לפי שם / מספר קופה"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setOpen(true);
          if (value.fundExternalKey) {
            onChange({ fundExternalKey: "", fundCode: "", fundName: "", fundCompanyName: "" });
          }
        }}
      />
    </div>

    {selectedLabel && value.fundExternalKey ? <span style={{ color: "var(--muted)", fontSize: 12 }}>נבחרה: {selectedLabel}</span> : null}
    {loading ? <span style={{ color: "var(--muted)", fontSize: 12 }}>מחפש קופות...</span> : null}
    {error ? <span style={{ color: "var(--danger, #b42318)", fontSize: 12 }}>{error}</span> : null}

    {open && !disabled && !loading && !error ? <div className="card" style={{ position: "absolute", zIndex: 30, top: "100%", right: 0, left: 0, marginTop: 4, padding: 6, maxHeight: 260, overflowY: "auto", boxShadow: "0 12px 30px rgba(0,0,0,.12)" }}>
      {options.length === 0 ? <div style={{ padding: 10, color: "var(--muted)", fontSize: 13 }}>לא נמצאו קופות מהסוג שנבחר.</div> : options.map((item) => <button
        type="button"
        key={item.externalKey}
        className="btn btn-soft"
        style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4, textAlign: "right" }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          onChange({ fundExternalKey: item.externalKey, fundCode: item.fundCode, fundName: item.fundName, fundCompanyName: item.companyName });
          setQuery(item.fundName || item.fundCode);
          setOpen(false);
        }}
      >{optionLabel(item)}</button>)}
    </div> : null}
  </div>;
}
