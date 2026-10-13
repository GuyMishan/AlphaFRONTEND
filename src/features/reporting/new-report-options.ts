"use client";

import type { ManualReportKind, ReportMode } from "@/features/reporting/types";

export type IntakeMode = Extract<ReportMode, "manual" | "excel" | "xml" | "correction">;
export const reportKindLabel: Record<ManualReportKind, string> = { 1: "דיווח שוטף", 2: "דיווח הפרשים", 3: "דיווח שלילי" };
