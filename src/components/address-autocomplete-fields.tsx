"use client";

import { UiAutocomplete } from "@/components/ui-controls";
import { useEffect, useState } from "react";
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

  return <><Field label="יישוב *" error={cityError}><UiAutocomplete value={city} disabled={disabled} required loading={cityLoading} maxLength={100} ariaLabel="בחירת יישוב" placeholder="התחילו להקליד יישוב" loadingText="טוען יישובים..." emptyText="לא נמצאו יישובים." options={cityOptions.map(item=>({value:String(item.cityCode),label:item.cityName+(item.regionName?` · ${item.regionName}`:"")}))} onClear={()=>{setCityCode(null);if(street)onStreetChange("")}} onValueChange={(next)=>{const item=cityOptions.find(x=>next===x.cityName+(x.regionName?` · ${x.regionName}`:""));if(item){const changed=item.cityName!==city;setCityCode(item.cityCode);onCityChange(item.cityName);if(changed)onStreetChange("")}else{setCityCode(null);onCityChange(next);if(street)onStreetChange("")}}}/></Field>
<Field label="רחוב *" error={streetError}><UiAutocomplete value={street} disabled={disabled||!cityCode} required loading={streetLoading} maxLength={100} ariaLabel="בחירת רחוב" placeholder={cityCode?"התחילו להקליד רחוב":"בחרו קודם יישוב"} loadingText="טוען רחובות..." emptyText="לא נמצאו רחובות ביישוב שנבחר." options={streetOptions.map(item=>({value:String(item.streetCode),label:item.streetName}))} onValueChange={onStreetChange}/></Field></>
}
