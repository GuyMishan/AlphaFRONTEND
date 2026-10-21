"use client";

import type { Employer } from "@/features/employers/types";
import type { EmployerPaymentAccount } from "@/features/payment-accounts/types";
import type { ManualReportKind, SourceManualReport } from "../../types";
import { reportKindLabel, type IntakeMode } from "../../new-report-options";
import { formatReportingMonth } from "@/lib/format/date";

type Props = {
  employer: Employer;
  month: string;
  reportKind: ManualReportKind;
  mode: IntakeMode;
  correctionOperationCode: 2 | 3 | null;
  selectedCount: number;
  fileName: string;
  source: SourceManualReport | null;
  paymentAccount: EmployerPaymentAccount | null;
  sentExternalId: string;
};

export function Summary({
  employer, month, reportKind, mode, correctionOperationCode, selectedCount,
  fileName, source, paymentAccount, sentExternalId,
}: Props) {
  return <>
    <div className="card-head">
      <div>
        <h2>סיכום הדיווח</h2>
        <span style={{ color: "var(--color-text-muted)" }}>הנתונים עברו בדיקות חובה ותקינות לפני ההגעה לשלב הזה.</span>
      </div>
    </div>
    <div className="grid two-cols">
      <div className="field"><label>מעסיק</label><b>{employer.legalName}</b></div>
      <div className="field">
        <label>סוג דיווח</label>
        <b>{correctionOperationCode ? `שוטף מתקן · פעולה ${correctionOperationCode}` : reportKindLabel[reportKind]}</b>
      </div>
      <div className="field"><label>חודש</label><b>{formatReportingMonth(month)}</b></div>
      {reportKind === 1 ? <div className="field">
        <label>קליטת נתונים</label><b>{mode === "excel" ? `Excel${fileName ? ` · ${fileName}` : ""}` : "ידני"}</b>
      </div> : null}
      {(reportKind !== 1 || correctionOperationCode) && source ? <div className="field">
        <label>דיווח מקור</label><b>חודש {formatReportingMonth(source.reportingMonth)}</b>
      </div> : null}
      <div className="field"><label>עובדים בדיווח</label><b>{selectedCount}</b></div>
      {paymentAccount ? <div className="field">
        <label>חשבון תשלום</label>
        <b className="account-number report-summary-account-number">בנק {paymentAccount.bankId} · סניף {paymentAccount.branchId} · {paymentAccount.maskedAccountNumber}</b>
      </div> : null}
    </div>
    {reportKind !== 1 || correctionOperationCode ? <div className="notice" style={{ marginTop: 20 }}>
      הדיווח החדש שומר קישור לדיווח הקודם בשרשרת התיקון, והנתונים הועתקו ממנו כבסיס לעריכה.
    </div> : null}
    {sentExternalId ? <div className="notice notice-info" style={{ marginTop: 20 }}>
      <b>הדיווח נשלח בהצלחה</b><div>מזהה חיצוני: {sentExternalId}</div>
    </div> : null}
  </>;
}
