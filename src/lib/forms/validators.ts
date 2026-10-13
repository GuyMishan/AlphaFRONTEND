/** Israeli ID (Teudat Zehut) check digit, accepting up to 9 digits with implied leading zeros. */
export function isIsraeliId(value: string) {
  if (!/^\d{1,9}$/.test(value)) return false;
  const id = value.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    const n = Number(id[i]) * (i % 2 === 0 ? 1 : 2);
    sum += n > 9 ? n - 9 : n;
  }
  return sum % 10 === 0;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
