/** Shekel amount: whole amounts without decimals ("₪1,234"), otherwise 2 ("₪1,234.50"); "—" when missing. */
export function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  const amount = Number(value);
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;
  return `₪${amount.toLocaleString("he-IL", { minimumFractionDigits: fractionDigits, maximumFractionDigits: 2 })}`;
}

/** Whole-number count with thousands separators ("1,234"). */
export function formatCount(value: number) {
  return value.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}
