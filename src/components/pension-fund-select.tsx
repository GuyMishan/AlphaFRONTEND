"use client";

import { UiAutocomplete, UiInput } from "@/components/ui-controls";
import { useEffect, useState } from "react";
import { alphaApi } from "@/lib/api";
import type { PensionFundOption, PensionProductType } from "@/lib/types";

type FundValue = {
  fundExternalKey?: string;
  fundCode?: string;
  fundName?: string;
  fundCompanyName?: string;
  fundClassification?: string;
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

function valueLabel(value: FundValue) {
  return [value.fundCode, value.fundName, value.fundCompanyName].filter(Boolean).join(" · ");
}

export function PensionFundSelect({ productType, value, disabled = false, onChange }: Props) {
  const [query, setQuery] = useState(valueLabel(value));
  const [options, setOptions] = useState<PensionFundOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(valueLabel(value));
  }, [value.fundExternalKey, value.fundCode, value.fundName, value.fundCompanyName]);

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
        })
        .catch((err) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : "טעינת רשימת הקופות נכשלה");
          setOptions([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, 250);

    return () => window.clearTimeout(timer);
  }, [productType, query]);

  if (productType === 99) {
    return <div className="field"><label>קופה</label><UiInput disabled value="לא נדרש עבור מוצר מסוג אחר" /></div>;
  }

  return <div className="field"><label>קופה *</label><UiAutocomplete value={query} disabled={disabled} loading={loading} ariaLabel="בחירת קופה" placeholder="חיפוש לפי שם / מספר קופה" loadingText="טוען קופות..." emptyText={error || "לא נמצאו קופות מהסוג שנבחר."} options={options.map(item=>({value:item.externalKey,label:optionLabel(item)}))} onClear={()=>{setOptions([]);onChange({ fundExternalKey:"",fundCode:"",fundName:"",fundCompanyName:"",fundClassification:"" })}} onValueChange={(next)=>{setQuery(next);const item=options.find(x=>optionLabel(x)===next);if(item){onChange({fundExternalKey:item.externalKey,fundCode:item.fundCode,fundName:item.fundName,fundCompanyName:item.companyName,fundClassification:item.classification||""})}else if(value.fundExternalKey){onChange({ fundExternalKey:"",fundCode:"",fundName:"",fundCompanyName:"",fundClassification:"" })}}}/></div>}
