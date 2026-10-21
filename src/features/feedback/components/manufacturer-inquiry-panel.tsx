"use client";

import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { UiInput, UiTextarea } from "@/components/ui/ui-controls";
import { reportFeedbackApi, type ManufacturerInquiry, type ManufacturerInquiryHistory } from "@/features/feedback/api";
import { errorMessage } from "@/lib/api/error-messages";
import { formatDateTimeDDMMYYYY } from "@/lib/format/date";

export function ManufacturerInquiryPanel({ organizationId, employerId, caseId, onSent }: {
  organizationId: string; employerId: string; caseId: string; onSent?: () => void;
}) {
  const [inquiries, setInquiries] = useState<ManufacturerInquiry[]>([]);
  const [history, setHistory] = useState<ManufacturerInquiryHistory[]>([]);
  const [selected, setSelected] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    try {
      const result = await reportFeedbackApi.manufacturerInquiries(organizationId, employerId, caseId);
      setInquiries(result.inquiries);
      setHistory(result.history);
    } catch (err) { setError(errorMessage(err, "טעינת פניות ליצרן נכשלה")); }
  }, [organizationId, employerId, caseId]);

  useEffect(() => { void refresh(); }, [refresh]);
  const item = inquiries.find(x => `${x.reportProductId}:${x.errorCode}` === selected) ?? inquiries[0];
  const itemKey = item ? `${item.reportProductId}:${item.errorCode}` : "";
  useEffect(() => {
    if (!item) return;
    setSubject(item.subject);
    setBody(item.body);
  }, [itemKey, item?.subject, item?.body, item]);

  async function send() {
    if (!item || busy || !window.confirm(`לשלוח מייל אל ${item.recipient}?\nיש לוודא שתוכן ההודעה אינו חושף מידע שאינו נחוץ.`)) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await reportFeedbackApi.sendManufacturerInquiry(
        organizationId, employerId, caseId, item.reportProductId, item.errorCode, subject, body,
      );
      setSuccess("הפנייה נשלחה לספק הדואר ותועדה בתיק.");
      await refresh();
      onSent?.();
    } catch (err) { setError(errorMessage(err, "שליחת הפנייה נכשלה")); }
    finally { setBusy(false); }
  }

  return <div className="feedback-external-case-template">
    <h3>צור קשר עם היצרן</h3>
    <p>הנמען מזוהה אוטומטית מתוך המוצר. נושא ותוכן הפנייה מבוססים על תבנית קוד השגיאה המאושרת.</p>
    {inquiries.length > 1 ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {inquiries.map(x => <button type="button" key={`${x.reportProductId}:${x.errorCode}`}
        className={itemKey === `${x.reportProductId}:${x.errorCode}` ? "btn btn-primary" : "btn btn-secondary"}
        onClick={() => setSelected(`${x.reportProductId}:${x.errorCode}`)}>
        קוד {x.errorCode} — {x.product}
      </button>)}
    </div> : null}
    {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
    {success ? <div className="notice notice-success" role="status">{success}</div> : null}
    {!item ? <p>אין הפקדות המקושרות לתיק לצורך פנייה.</p> : <>
      <div><strong>יצרן:</strong> {item.manufacturer || "לא זוהה"}</div>
      <div><strong>מוצר:</strong> {item.product || "לא זוהה"}</div>
      <label><span>אל</span><UiInput dir="ltr" readOnly value={item.recipient || "לא הוגדרה כתובת מאומתת"} /></label>
      <label><span>נושא</span><UiInput value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} disabled={busy} /></label>
      <label><span>תוכן ההודעה</span><UiTextarea rows={10} value={body}
        onChange={e => setBody(e.target.value)} maxLength={8000} disabled={busy} /></label>
      {(!item.recipient || !item.subject || !item.body) ?
        <p>לא ניתן לשלוח עד להגדרת כתובת מאומתת ותבנית פעילה לקוד השגיאה.</p> : null}
      <button type="button" className="btn btn-primary"
        disabled={busy || !item.recipient || !item.subject || !item.body || !subject.trim() || !body.trim()}
        onClick={() => void send()}><Send size={16} />{busy ? "שולח..." : "שלח מייל ליצרן"}</button>
    </>}
    {history.length ? <div style={{ display: "grid", gap: 8 }}>
      <strong>היסטוריית שליחת פניות</strong>
      {history.map(x => <div key={x.id}>
        <span>{formatDateTimeDDMMYYYY(x.createdAt)} · {x.recipient} · {x.status === "sent" ? "נשלח לספק הדואר" : x.status === "failed" ? "נכשל" : "בתהליך"}</span>
        {x.failureCode ? <small>{x.failureCode}</small> : null}
      </div>)}
    </div> : null}
  </div>;
}
