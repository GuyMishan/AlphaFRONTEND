import type { ReportFeedbackStatus } from "@/features/feedback/api";
export const statusFilters: Array<{ value: ReportFeedbackStatus; label: string }> = [
  { value: "all", label: "הכל" },
  { value: "completed", label: "הושלם" },
  { value: "attention", label: "דורש טיפול" },
  { value: "partial", label: "משוב חלקי" },
  { value: "pending", label: "ממתין למשוב" },
  { value: "not-sent", label: "לא נשלח" },
];

export type ExtraFilterKey = "kind" | "product" | "treatment" | "attention";
export type ColumnKey = "employer" | "month" | "kind" | "employees" | "total" | "status" | "attention" | "payoff" | "transmission" | "actions";

export const columnOptions: Array<{ key: ColumnKey; label: string; defaultVisible: boolean }> = [
  { key: "employer", label: "מעסיק", defaultVisible: true },
  { key: "month", label: "חודש", defaultVisible: true },
  { key: "kind", label: "סוג דיווח", defaultVisible: true },
  { key: "employees", label: "עובדים", defaultVisible: false },
  { key: "total", label: "סכום דיווח", defaultVisible: true },
  { key: "status", label: "מצב דיווח", defaultVisible: true },
  { key: "attention", label: "דורש טיפול", defaultVisible: true },
  { key: "payoff", label: "שיעור פירעון", defaultVisible: true },
  { key: "transmission", label: "שידור אחרון", defaultVisible: true },
  { key: "actions", label: "פעולות", defaultVisible: true },
];
