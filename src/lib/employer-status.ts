import type { EmployerStatus } from "./types";

export const editableEmployerStatuses: Array<{ value: 1 | 2 | 4; label: string }> = [
  { value: 1, label: "בהקמה" },
  { value: 2, label: "פעיל" },
  { value: 4, label: "סגור" },
];

export function employerStatusLabel(status: EmployerStatus | number): string {
  if (status === 2) return "פעיל";
  if (status === 4) return "סגור";
  if (status === 3) return "מושהה";
  return "בהקמה";
}

export function employerStatusBadgeClass(status: EmployerStatus | number): string {
  if (status === 2) return "badge badge-green";
  if (status === 4) return "badge badge-gray";
  if (status === 3) return "badge badge-orange";
  return "badge badge-orange";
}
