/**
 * Search term for code-labelled autocompletes ("12 - Bank Name"): once an
 * option is selected, look it up by its code; otherwise by the typed text.
 */
export function autocompleteLookupTerm(value: string) {
  const trimmed = value.trim();
  const selectedCode = trimmed.match(/^(\d+)\s*(?:-|·)/);
  return selectedCode?.[1] ?? trimmed;
}
