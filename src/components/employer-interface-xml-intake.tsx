"use client";

import { UiInput } from "@/components/ui-controls";
import { useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { employerInterfaceApi, type EmployerInterfaceUploadValidation } from "@/lib/employer-interface-api";

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
  onReportImported,
}: {
  organizationId: string;
  employerId: string;
  disabled?: boolean;
  onReportImported?: (reportId: string) => void;
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
      toast.error(error instanceof Error ? error.message : "בדיקת קובץ ה־XML נכשלה.");
    } finally {
      setValidating(false);
    }
  }

  async function importFile() {
    if (!file || !validation?.isValid || importing) return;
    setImporting(true);
    try {
      const result = await employerInterfaceApi.importUpload(organizationId, employerId, file);
      if (result.reportId) {
        toast.success(`הדיווח נקלט בהצלחה. יובאו ${result.importedEmployees} עובדים${result.unmatchedRows ? `, ${result.unmatchedRows} רשומות לא הותאמו` : ""}.`);
        onReportImported?.(result.reportId);
        return;
      }
      if (result.feedbackId) {
        setFeedbackId(result.feedbackId);
        toast.success("המשוב נקלט ונשמר בהצלחה.");
        return;
      }
      toast.error("הקובץ עבר ולידציה אך לא נוצר דיווח או משוב.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "קליטת קובץ ה־XML נכשלה.");
    } finally {
      setImporting(false);
    }
  }

  return <div style={{ marginTop: 20 }}>
    <div className="field">
      <label htmlFor="employer-interface-xml">קובץ XML ממשק מעסיקים 006</label>
      <small style={{ display: "block", marginBottom: 8 }}>המערכת מזהה אוטומטית את סוג הקובץ ומבצעת ולידציה מול ה־XSD המתאים.</small>
      <UiInput
        id="employer-interface-xml"
        type="file"
        accept=".xml,.dat,.tst,application/xml,text/xml"
        disabled={disabled || validating || importing}
        onChange={(event) => void validateSelected(event.target.files?.[0] ?? null)}
      />
      <small>עד 20MB. אין צורך לבחור סוג XML מראש.</small>
    </div>

    {validating ? <div className="notice" style={{ marginTop: 14 }}><UploadCloud size={16} />בודק מבנה וסכמה רשמית...</div> : null}

    {validation ? <div className={validation.isValid ? "notice notice-info" : "notice notice-error"} style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {validation.isValid ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
        <b>{validation.isValid ? "הקובץ תקין" : "הקובץ אינו תקין"}</b>
      </div>
      <div style={{ marginTop: 6 }}>סוג: {documentTypeLabel(validation.documentType)}</div>
      {validation.version ? <div>גרסה: {validation.version}</div> : null}
      {validation.schemaFileName ? <div>סכמה: {validation.schemaFileName}</div> : null}
      {validation.issues?.length ? <ul style={{ marginBottom: 0 }}>{validation.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul> : null}
    </div> : null}

    {feedbackId ? <div className="notice notice-info" style={{ marginTop: 14 }}>
      <b>המשוב נשמר במערכת</b>
      <div>מזהה משוב: {feedbackId}</div>
    </div> : null}

    <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
      <button
        type="button"
        className="btn btn-primary"
        disabled={disabled || !file || !validation?.isValid || validating || importing}
        onClick={() => void importFile()}
      >
        {importing ? "קולט קובץ..." : "אישור וקליטת הקובץ"}
      </button>
    </div>
  </div>;
}
