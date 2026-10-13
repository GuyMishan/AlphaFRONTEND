/** Hebrew labels for reporting enums; the backend may send numeric codes or enum names. */

export function reportKindLabel(value: string | number | undefined) {
  if (value === 2 || value === "2" || value === "Differences") return "הפרשים";
  if (value === 3 || value === "3" || value === "Negative") return "שלילי";
  return "שוטף";
}

export function pensionProductTypeLabel(value: string | number) {
  if (value === 1 || value === "1" || value === "PensionFund") return "פנסיה";
  if (value === 2 || value === "2" || value === "StudyFund") return "השתלמות";
  if (value === 3 || value === "3" || value === "ManagersInsurance") return "ביטוח מנהלים";
  if (value === 4 || value === "4" || value === "ProvidentFund") return "קופת גמל";
  return "אחר";
}
