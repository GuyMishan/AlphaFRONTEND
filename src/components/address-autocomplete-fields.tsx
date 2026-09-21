"use client";

import { UiInput } from "@/components/ui-controls";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Field } from "@/components/form-feedback";
import { addressReferenceApi, type CityOption, type StreetOption } from "@/lib/address-reference-api";

type Props = {
  city: string;
  street: string;
  cityError?: string;
  streetError?: string;
  disabled?: boolean;
  onCityChange: (value: string) => void;
  onStreetChange: (value: string) => void;
};

export function AddressAutocompleteFields({ city, street, cityError, streetError, disabled = false, onCityChange, onStreetChange }: Props) {
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [streetOptions, setStreetOptions] = useState<StreetOption[]>([]);
  const [cityCode, setCityCode] = useState<number | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [streetOpen, setStreetOpen] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [streetLoading, setStreetLoading] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const timer = window.setTimeout(() => {
      let active = true;
      setCityLoading(true);
      addressReferenceApi.cities(city.trim(), 30)
        .then((items) => {
          if (!active) return;
          setCityOptions(items);
          const exact = items.find((item) => item.cityName.trim() === city.trim());
          setCityCode(exact?.cityCode ?? null);
        })
        .catch(() => {
          if (active) {
            setCityOptions([]);
            setCityCode(null);
          }
        })
        .finally(() => { if (active) setCityLoading(false); });
      return () => { active = false; };
    }, 220);
    return () => window.clearTimeout(timer);
  }, [city, disabled]);

  useEffect(() => {
    if (disabled || !cityCode) {
      setStreetOptions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      let active = true;
      setStreetLoading(true);
      addressReferenceApi.streets(cityCode, street.trim(), 40)
        .then((items) => { if (active) setStreetOptions(items); })
        .catch(() => { if (active) setStreetOptions([]); })
        .finally(() => { if (active) setStreetLoading(false); });
      return () => { active = false; };
    }, 220);
    return () => window.clearTimeout(timer);
  }, [cityCode, street, disabled]);

  return <>
    <Field label="יישוב *" error={cityError}>
      <div className="pension-fund-autocomplete" onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!nextTarget || !event.currentTarget.contains(nextTarget)) setCityOpen(false);
      }}>
        <div className="pension-fund-search">
          <Search size={16} aria-hidden="true" />
          <UiInput
            disabled={disabled}
            required
            autoComplete="off"
            maxLength={100}
            value={city}
            placeholder="התחילו להקליד יישוב"
            onFocus={() => setCityOpen(true)}
            onClick={() => setCityOpen(true)}
            onChange={(event) => {
              setCityCode(null);
              setCityOpen(true);
              onCityChange(event.target.value);
              if (street) onStreetChange("");
            }}
          />
        </div>
        {cityOpen && !disabled ? <div className="pension-fund-options" role="listbox" aria-busy={cityLoading}>
          {cityLoading ? <div className="pension-fund-loading">טוען יישובים...</div> : cityOptions.length === 0 ? <div className="pension-fund-empty">לא נמצאו יישובים.</div> : cityOptions.map((item) => <button
            type="button"
            key={item.cityCode}
            className="pension-fund-option"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const changed = item.cityName !== city;
              setCityCode(item.cityCode);
              onCityChange(item.cityName);
              if (changed) onStreetChange("");
              setCityOpen(false);
            }}
          >{item.cityName}{item.regionName ? ` · ${item.regionName}` : ""}</button>)}
        </div> : null}
      </div>
    </Field>

    <Field label="רחוב *" error={streetError}>
      <div className="pension-fund-autocomplete" onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!nextTarget || !event.currentTarget.contains(nextTarget)) setStreetOpen(false);
      }}>
        <div className="pension-fund-search">
          <Search size={16} aria-hidden="true" />
          <UiInput
            disabled={disabled || !cityCode}
            required
            autoComplete="off"
            maxLength={100}
            value={street}
            placeholder={cityCode ? "התחילו להקליד רחוב" : "בחרו קודם יישוב"}
            onFocus={() => setStreetOpen(true)}
            onClick={() => setStreetOpen(true)}
            onChange={(event) => { setStreetOpen(true); onStreetChange(event.target.value); }}
          />
        </div>
        {streetOpen && cityCode && !disabled ? <div className="pension-fund-options" role="listbox" aria-busy={streetLoading}>
          {streetLoading ? <div className="pension-fund-loading">טוען רחובות...</div> : streetOptions.length === 0 ? <div className="pension-fund-empty">לא נמצאו רחובות ביישוב שנבחר.</div> : streetOptions.map((item) => <button
            type="button"
            key={item.streetCode}
            className="pension-fund-option"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => { onStreetChange(item.streetName); setStreetOpen(false); }}
          >{item.streetName}</button>)}
        </div> : null}
      </div>
    </Field>
  </>;
}
