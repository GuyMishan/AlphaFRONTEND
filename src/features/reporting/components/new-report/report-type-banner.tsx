"use client";

import type { ManualReportKind, SourceManualReport } from "@/features/reporting/types";
import { formatReportingMonth } from "@/lib/format/date";
import { reportKindLabel } from "@/features/reporting/new-report-options";

export function ReportTypeBanner({ reportKind, source, month, correctionOperationCode }: { reportKind: ManualReportKind; source: SourceManualReport | null; month: string; correctionOperationCode: 2 | 3 | null }) { return <div className="notice" style={{ marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}><b>סוג הדיווח: {correctionOperationCode ? `דיווח שוטף מתקן · פעולה ${correctionOperationCode}` : reportKindLabel[reportKind]}</b><span>· חודש {formatReportingMonth(month)}</span>{(reportKind !== 1 || correctionOperationCode) && source ? <span>· מתקן דיווח מחודש {formatReportingMonth(source.reportingMonth)}</span> : null}</div>; }
