"use client";

import { useState } from "react";
import { FileSpreadsheet, FileCode2 } from "lucide-react";
import { toast } from "sonner";
import { ExcelEmployeeIntake, type ExcelEmployeeIntakeResult } from "./excel-employee-intake";
import { employerInterfaceApi, type EmployerInterfaceValidation } from "@/lib/employer-interface-api";

export type ReportFileType = "excel" | "employer-interface";
export function FileReportIntake({ organizationId, employerId, reportingMonth, onExcelChange, onXmlImported }: { organizationId: string; employerId: string; reportingMonth: string; onExcelChange: (result: ExcelEmployeeIntakeResult | null) => void; onXmlImported: (reportId: string, fileName: string) => void }) {
  const [fileType, setFileType] = useState<ReportFileType>("excel");
  const [validation, setValidation] = useState<EmployerInterfaceValidation | null>(null);
  const [busy, setBusy] = useState(false);
  async function xmlSelected(file: File | null) {
    setValidation(null); if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xml")) { toast.error("נבחר ממשק מעסיקים ולכן יש להעלות קובץ XML."); return; }
    setBusy(true);
    try {
      const checked = await employerInterfaceApi.validate(organizationId, employerId, file); setValidation(checked);
      if (!checked.isValid) { toast.error(checked.issues.join(" ")); return; }
      const imported = await employerInterfaceApi.importXml(organizationId, employerId, file);
      if (!imported.reportId) throw new Error(imported.validation?.issues?.join(" ") || "הקובץ תקין אך לא נוצר ממנו דיווח.");
      onXmlImported(imported.reportId, file.name); toast.success(`ממשק מעסיקים ${checked.version ?? "006"} נקלט בהצלחה`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "קליטת הקובץ נכשלה"); }
    finally { setBusy(false); }
  }
  return <div>
    <div className="grid two-cols" style={{ marginBottom: 22 }}><div className="field"><label>סוג הקובץ *</label><select value={fileType} onChange={(e) => { setFileType(e.target.value as ReportFileType); setValidation(null); onExcelChange(null); }}><option value="excel">Excel / קובץ שכר</option><option value="employer-interface">ממשק מעסיקים XML — גרסה 006</option></select></div><div className="notice" style={{ margin: 0 }}>{fileType === "excel" ? "המערכת תבדוק את מבנה קובץ השכר ותתאים עובדים." : "המערכת בודקת שזה XML של ממשק מעסיקים, SUG-MIMSHAK מתאים וגרסת XML היא 006."}</div></div>
    {fileType === "excel" ? <ExcelEmployeeIntake organizationId={organizationId} employerId={employerId} reportingMonth={reportingMonth} onChange={onExcelChange} /> : <div className="card" style={{ padding: 24 }}><div className="card-head"><div><h3 style={{ margin: 0 }}>העלאת ממשק מעסיקים 006</h3><span style={{ color: "var(--muted)" }}>XML בלבד, עד 20MB</span></div><FileCode2 size={28} /></div><div className="field"><label>קובץ XML *</label><input type="file" accept=".xml,application/xml,text/xml" disabled={busy} onChange={(e) => void xmlSelected(e.target.files?.[0] ?? null)} /></div>{busy ? <div className="notice" style={{ marginTop: 14 }}>בודק את הקובץ...</div> : null}{validation?.isValid ? <div className="notice notice-info" style={{ marginTop: 14 }}><b>הכותרת תקינה</b><div>גרסה {validation.version} · סוג ממשק {validation.interfaceType}</div></div> : null}</div>}
  </div>;
}
