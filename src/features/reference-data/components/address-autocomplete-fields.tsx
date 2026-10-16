"use client";

import { useState } from "react";
import { UiAutocomplete } from "@/components/ui/ui-controls";
import { Field } from "@/components/forms/form-feedback";
import { useCities, useStreets } from "@/features/reference-data/queries";
import type { CityOption } from "@/features/reference-data/types";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { errorMessage } from "@/lib/api/error-messages";

type Props = {
  city: string;
  street: string;
  cityError?: string;
  streetError?: string;
  disabled?: boolean;
  onCityChange: (value: string) => void;
  onStreetChange: (value: string) => void;
};

function cityLabel(city: CityOption) {
  return city.cityName + (city.regionName ? ` · ${city.regionName}` : "");
}

export function AddressAutocompleteFields({ city, street, cityError, streetError, disabled = false, onCityChange, onStreetChange }: Props) {
  const [cityOpen, setCityOpen] = useState(false);
  const [streetOpen, setStreetOpen] = useState(false);
  const normalizedCity = city.trim();
  const normalizedStreet = street.trim();
  const citySearch = useDebouncedValue(normalizedCity, 220);
  const streetSearch = useDebouncedValue(normalizedStreet, 220);
  const citySearchReady = citySearch === normalizedCity && normalizedCity.length >= 2;
  const cities = useCities(citySearch, !disabled && (cityOpen || streetOpen) && citySearchReady);
  // Never expose results from the previous input, even during the debounce delay.
  const cityOptions = citySearchReady ? cities.data ?? [] : [];
  const cityCode = cityOptions.find(item => item.cityName.trim() === normalizedCity)?.cityCode ?? null;
  const streetSearchReady = streetSearch === normalizedStreet;
  const streets = useStreets(cityCode, streetSearch, !disabled && streetOpen && streetSearchReady);
  const streetOptions = cityCode !== null && streetSearchReady ? streets.data ?? [] : [];
  const cityLoading = !disabled && (cityOpen || streetOpen) && normalizedCity.length >= 2
    && (!citySearchReady || cities.isLoading);
  const streetLoading = !disabled && streetOpen
    && (cityLoading || (cityCode !== null && (!streetSearchReady || streets.isLoading)));

  function changeCity(next: string) {
    const selected = cityOptions.find(item => cityLabel(item) === next);
    const nextCity = selected?.cityName ?? next;
    onCityChange(nextCity);
    if (nextCity !== city && street) onStreetChange("");
  }

  return <>
    <Field label="יישוב *" error={cityError}>
      <UiAutocomplete value={city} disabled={disabled} required loading={cityLoading}
        maxLength={100} ariaLabel="בחירת יישוב" placeholder="התחילו להקליד יישוב"
        loadingText="טוען יישובים..."
        emptyText={cities.error ? errorMessage(cities.error, "טעינת היישובים נכשלה") : "לא נמצאו יישובים."}
        options={cityOptions.map(item => ({ value: String(item.cityCode), label: cityLabel(item) }))}
        onOpenChange={setCityOpen} onValueChange={changeCity} />
    </Field>
    <Field label="רחוב *" error={streetError}>
      <UiAutocomplete value={street} disabled={disabled || !normalizedCity} required loading={streetLoading}
        maxLength={100} ariaLabel="בחירת רחוב"
        placeholder={normalizedCity ? "התחילו להקליד רחוב" : "בחרו קודם יישוב"}
        loadingText="טוען רחובות..."
        emptyText={cities.error || streets.error
          ? errorMessage(cities.error || streets.error, "טעינת הרחובות נכשלה")
          : cityCode === null ? "יש לבחור יישוב מתוך הרשימה כדי לחפש רחובות." : "לא נמצאו רחובות ביישוב שנבחר."}
        options={streetOptions.map(item => ({ value: String(item.streetCode), label: item.streetName }))}
        onOpenChange={setStreetOpen} onValueChange={onStreetChange} />
    </Field>
  </>;
}
