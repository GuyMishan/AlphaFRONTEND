/** Public organization types offered in admin forms; old numeric values remain readable. */
export const organizationTypeOptions = [
  { value: 7, label: "ארגון קטן - מעסיק אחד" },
  { value: 8, label: "ארגון רגיל" },
] as const;

const legacyOrganizationTypes: Record<number, string> = {
  1: "מעסיק (סוג ישן)",
  2: "משרד שכר (סוג ישן)",
  3: "סוכנות ביטוח (סוג ישן)",
  4: "ספק תפעול (סוג ישן)",
  5: "קבוצת חברות (סוג ישן)",
  6: "שירות עצמי",
};

export function organizationTypeLabel(type: number): string {
  return organizationTypeOptions.find(option => option.value === type)?.label
    ?? legacyOrganizationTypes[type] ?? String(type);
}
