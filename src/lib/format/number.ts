/** Shekel amount with up to 2 decimals ("₪1,234.5"); "—" when missing. */
export function formatMoney(value: number | null | undefined) {
  return value == null ? "—" : `₪${Number(value).toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
}
