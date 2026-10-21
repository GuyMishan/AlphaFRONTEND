/** Normalizes data-owned document focus metadata. Never infer a file type from error code. */
export type DocumentFocusType = 0 | 3 | 4 | 5 | 6;

export function documentFocusFromFields(fields: string | null | undefined): DocumentFocusType {
  if (!fields) return 0;
  try {
    const data: unknown = JSON.parse(fields);
    if (!data || typeof data !== "object" || Array.isArray(data)) return 0;
    const type = (data as Record<string, unknown>).documentTypeCode;
    return type === 3 || type === 4 || type === 5 || type === 6 ? type : 0;
  } catch {
    return 0;
  }
}
