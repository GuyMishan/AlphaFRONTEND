import type { EmployerStatus } from "./types";

export const editableEmployerStatuses: Array<{ value: 2 | 4; label: string }> = [
  { value: 2, label: "פעיל" },
  { value: 4, label: "מבוטל" },
];

export function employerStatusLabel(status: EmployerStatus | number): string {
  return status === 4 ? "מבוטל" : "פעיל";
}

export function employerStatusBadgeClass(status: EmployerStatus | number): string {
  return status === 4 ? "badge badge-gray" : "badge badge-green";
}
