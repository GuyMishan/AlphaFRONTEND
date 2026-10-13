"use client";

import { toast } from "sonner";
import { saveBlob } from "@/lib/download";
import { Download, FileSpreadsheet, Info } from "lucide-react";

const HEADERS = ["תעודת זהות", "מספר עובד", "שם פרטי", "שם משפחה", "סוג מוצר", "מספר פוליסה", "חודש שכר", "שכר", "סוג דיווח", "רובד שכר", "סעיף 14", "תאריך תחילת סעיף 14", "פיצויים מעסיק - סכום", "פיצויים מעסיק - אחוז", "תגמולים מעסיק - סכום", "תגמולים מעסיק - אחוז", "אכ״ע מעסיק - סכום", "אכ״ע מעסיק - אחוז", "שונות מעסיק - סכום", "שונות מעסיק - אחוז", "פיצויים עובד - סכום", "פיצויים עובד - אחוז", "תגמולים עובד - סכום", "תגמולים עובד - אחוז", "אכ״ע עובד - סכום", "אכ״ע עובד - אחוז", "שונות עובד - סכום", "שונות עובד - אחוז"];
const EXAMPLE = ["123456782", "EMP-001", "ישראל", "ישראלי", "קרן פנסיה", "POL-001", "2026-09", 12000, "שוטף", "רובד 1", "כן", "2024-01-01", 1000, 8.33, 780, 6.5, 0, 0, 0, 0, 0, 0, 720, 6, 0, 0, 0, 0];

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv() {
  const csv = "\ufeff" + [HEADERS, EXAMPLE].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "alpha-salary-template.csv");
}

/** The XLSX template is a static asset (public/templates). */
async function downloadXlsx() {
  const response = await fetch("/templates/alpha-salary-template.xlsx");
  if (!response.ok) throw new Error("הורדת התבנית נכשלה.");
  saveBlob(await response.blob(), "alpha-salary-template.xlsx");
}

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function downloadXls() {
  const rows = [HEADERS, EXAMPLE]
    .map((row) => `<Row>${row.map((value) => `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${xmlEscape(value)}</Data></Cell>`).join("")}</Row>`)
    .join("");
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="שכר"><Table>${rows}</Table></Worksheet>
</Workbook>`;
  saveBlob(new Blob(["\ufeff" + xml], { type: "application/vnd.ms-excel;charset=utf-8" }), "alpha-salary-template.xls");
}

/** Salary-file guidance and template downloads, rendered below the Excel upload zone. */
export function SalaryTemplateTools() {
  return <div className="salary-upload-tools-root">
    <div className="salary-upload-tools">
      <div className="salary-upload-info">
        <Info size={18} />
        <div>
          <b>איזה קובץ שכר אפשר להעלות?</b>
          <span>כרגע מוגדר במערכת מבנה שכר אחד של Alpha. אפשר לשמור ולהעלות אותו כ־XLSX, XLS או CSV — אלה שלושה פורמטים טכניים לא שלושה מבני שכר שונים.</span>
        </div>
      </div>
      <div className="salary-template-panel">
        <div className="salary-template-title">
          <FileSpreadsheet size={18} />
          <div><h3>תבנית קובץ שכר</h3><span>הורידו את אותו מבנה בפורמט שנוח לכם</span></div>
        </div>
        <div className="salary-template-actions">
          <button type="button" className="btn btn-secondary" onClick={() => void downloadXlsx().catch(() => toast.error("הורדת התבנית נכשלה."))}><Download size={14} />XLSX</button>
          <button type="button" className="btn btn-secondary" onClick={downloadXls}><Download size={14} />XLS</button>
          <button type="button" className="btn btn-secondary" onClick={downloadCsv}><Download size={14} />CSV</button>
        </div>
        <p>התבנית כוללת שורת כותרות ושורת דוגמה. בעתיד אפשר להוסיף מבנים נפרדים למערכות שכר שונות בלי לשנות את מסך ההעלאה.</p>
      </div>
    </div>
  </div>;
}
