"use client";

import { UiInput } from "@/components/ui-controls";
import { useEffect, useState } from "react";
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

  return (
    <div
      className="field pension-fund-autocomplete"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!nextTarget || !event.currentTarget.contains(nextTarget)) setOpen(false);
      }}
    >
      <label>קופה *</label>
      <div className="pension-fund-search">
        <Search size={16} aria-hidden="true" />
        <UiInput
          disabled={disabled}
          value={query}
          autoComplete="off"
          placeholder="חיפוש לפי שם / מספר קופה"
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
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

      {open && !disabled ? (
        <div className="pension-fund-options" role="listbox" aria-busy={loading}>
          {loading ? (
            <div className="pension-fund-loading" role="status" aria-live="polite">
              <span>בטעינה</span>
              <span className="loading-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
          ) : error ? null : options.length === 0 ? (
            <div className="pension-fund-empty">לא נמצאו קופות מהסוג שנבחר.</div>
          ) : options.map((item) => {
            const selected = item.externalKey === value.fundExternalKey;
            return (
              <button
                type="button"
                key={item.externalKey}
                role="option"
                aria-selected={selected}
                className={`pension-fund-option${selected ? " selected" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange({
                    fundExternalKey: item.externalKey,
                    fundCode: item.fundCode,
                    fundName: item.fundName,
                    fundCompanyName: item.companyName,
                  });
                  setQuery(optionLabel(item));
                  setOpen(false);
                }}
              >
                {optionLabel(item)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
