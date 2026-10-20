"use client";

import { UiFileUpload } from "@/components/ui/ui-file-upload";
import { useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { employerInterfaceApi, type EmployerInterfaceImportResult, type EmployerInterfaceUploadValidation } from "@/features/reporting/employer-interface-api";
import { errorMessage } from "@/lib/api/error-messages";

function documentTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "CurrentReport": return "דיווח שוטף";
    case "NegativeReport": return "דיווח שלילי";
    case "SummaryFeedback": return "משוב מסכם";
    case "AnnualSummaryFeedback": return "משוב מסכם שנתי";
    default: return value || "לא זוהה";
  }
}

export function EmployerInterfaceXmlIntake({
  organizationId,
  employerId,
  disabled = false,
  paymentAccountId,
  salaryPaymentDate,
  onBeforeImport,
  onReportImported,
}: {
  organizationId: string;
  employerId: string;
  disabled?: boolean;
  paymentAccountId: string;
  salaryPaymentDate: string;
  onBeforeImport?: () => Promise<boolean>;
  onReportImported?: (result: EmployerInterfaceImportResult) => Promise<void> | void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<EmployerInterfaceUploadValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedbackId, setFeedbackId] = useState("");

  async function validateSelected(nextFile: File | null) {
    setFile(nextFile);
    setValidation(null);
    setFeedbackId("");
    if (!nextFile) return;

    const lower = nextFile.name.toLowerCase();
    if (!lower.endsWith(".xml") && !lower.endsWith(".dat") && !lower.endsWith(".tst")) {
      toast.error("יש לבחור קובץ XML, DAT או TST שמכיל XML של ממשק מעסיקים.");
      setFile(null);
      return;
    }

    setValidating(true);
    try {
      const result = await employerInterfaceApi.validateUpload(organizationId, employerId, nextFile);
      setValidation(result);
      if (result.isValid) {
        toast.success(`הקובץ זוהה כ־${documentTypeLabel(result.documentType)} ועבר ולידציה.`);
      } else {
        toast.error(result.issues?.[0] || "הקובץ לא עבר ולידציה.");
      }
    } catch (error) {
      toast.error(errorMessage(error, "בדיקת קובץ ה־XML נכשלה."));
    } finally {
      setValidating(false);
    }
  }

  async function importFile() {
    if (!file || !validation?.isValid || importing || !paymentAccountId) return;
    setImporting(true);
    try {
      if (onBeforeImport && !await onBeforeImport()) return;
      const result = await employerInterfaceApi.importUpload(organizationId, employerId, file, paymentAccountId, salaryPaymentDate);
      if (result.reportId) {
        toast.success(`הדיווח נקלט בהצלחה. יובאו ${result.importedEmployees} עובדים${result.unmatchedRows ? `, ${result.unmatchedRows} רשומות לא הותאמו` : ""}.`);
        await onReportImported?.(result);
        return;
      }
      if (result.feedbackId) {
        setFeedbackId(result.feedbackId);
        toast.success("המשוב נקלט ונשמר בהצלחה.");
        return;
      }
      toast.error("הקובץ עבר ולידציה אך לא נוצר דיווח או משוב.");
    } catch (error) {
      toast.error(errorMessage(error, "קליטת קובץ ה־XML נכשלה."));
    } finally {
      setImporting(false);
    }
  }

  return <div>
    <div className="card-head"><div>
      <h2>העלאת קובץ דיווח מלא</h2>
      <span style={{ color: "var(--color-text-muted)" }}>XML / DAT / TST · ממשק מעסיקים 006 · בדיקת מבנה וסכמה רשמית</span>
    </div></div>
    <UiFileUpload id="employer-interface-xml" variant="zone" label="גררו קובץ לכאן או בחרו מהמחשב"
      fileName={file?.name}
      description="העלאת ממשק מעסיקים 006. המערכת מזהה את סוג המסמך באופן אוטומטי ומבצעת בדיקה מול סכמת XSD המתאימה. גודל קובץ מרבי: 20MB."
      accept=".xml,.dat,.tst,application/xml,text/xml" maxBytes={20 * 1024 * 1024}
      disabled={disabled} busy={validating || importing}
      onFileSelected={validateSelected} onInvalid={(message) => toast.error(message)} />

    {validating ? <div className="notice notice-info" role="status" style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
      <UploadCloud size={18} />בודק מבנה וסכמה רשמית...
    </div> : null}

    {validation ? <div className={validation.isValid ? "notice notice-info" : "notice notice-error"}
      role="status" style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {validation.isValid ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}
        <b>{validation.isValid ? "הקובץ תקין ומוכן לקליטה" : "הקובץ אינו תקין"}</b>
      </div>
      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 12 }}>
        <span>סוג: {documentTypeLabel(validation.documentType)}</span>
        {validation.version ? <span>גרסה: {validation.version}</span> : null}
        {validation.schemaFileName ? <span>סכמה: {validation.schemaFileName}</span> : null}
      </div>
      {validation.issues?.length ? <ul style={{ marginBottom: 0, marginTop: 10 }}>{validation.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul> : null}
    </div> : null}

    {feedbackId ? <div className="notice notice-info" role="status" style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
      <FileCheck2 size={18} /><span>המשוב נשמר במערכת · מזהה: {feedbackId}</span>
    </div> : null}

    {validation?.isValid && !feedbackId ? <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
      <button type="button" className="btn btn-primary"
        disabled={disabled || !paymentAccountId || !file || validating || importing}
        onClick={() => void importFile()}>
        {importing ? "קולט קובץ..." : "אישור וקליטת הקובץ"}
      </button>
    </div> : null}
  </div>;
}
