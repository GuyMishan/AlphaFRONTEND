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
  const [testMode, setTestMode] = useState(true);
  const [testRecipient, setTestRecipient] = useState("alphapensia@gmail.com");
  const [selected, setSelected] = useState("");
  const [additionalInformation, setAdditionalInformation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    try {
      const result = await reportFeedbackApi.manufacturerInquiries(organizationId, employerId, caseId);
      setInquiries(result.inquiries);
      setHistory(result.history);
      setTestMode(result.testMode);
      if (result.testRecipient) setTestRecipient(result.testRecipient);
    } catch (err) { setError(errorMessage(err, "טעינת פניות ליצרן נכשלה")); }
  }, [organizationId, employerId, caseId]);

  useEffect(() => { void refresh(); }, [refresh]);
  const item = inquiries.find(x => `${x.reportProductId}:${x.errorCode}` === selected) ?? inquiries[0];
  const itemKey = item ? `${item.reportProductId}:${item.errorCode}` : "";
  useEffect(() => {
    if (!item) return;
    setAdditionalInformation("");
  }, [itemKey, item?.subject, item?.body, item]);

  async function send() {
    if (!item || busy || !window.confirm(`לשלוח מייל אל ${testMode ? testRecipient : item.recipient}?\n${testMode ? `זו הודעת בדיקה בלבד. הנמען המקורי: ${item.recipient}.\n` : ""}יש לוודא שתוכן ההודעה אינו חושף מידע שאינו נחוץ.`)) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await reportFeedbackApi.sendManufacturerInquiry(
        organizationId, employerId, caseId, item.reportProductId, item.errorCode, additionalInformation,
      );
      setSuccess(testMode ? "מייל בדיקה נשלח לתיבת ALPHA ותועד בתיק. לא נשלח מייל ליצרן." : "הפנייה נשלחה לספק הדואר ותועדה בתיק.");
      await refresh();
      onSent?.();
    } catch (err) { setError(errorMessage(err, "שליחת הפנייה נכשלה")); }
    finally { setBusy(false); }
  }

  return <div className="feedback-external-case-template">
    <h3>צור קשר עם היצרן</h3>
    <p>הנמען מזוהה אוטומטית מתוך המוצר. נושא ותוכן הפנייה מבוססים על תבנית קוד השגיאה המאושרת.</p>
    {testMode ? <p role="status"><strong>סביבת בדיקות:</strong> ההודעה תישלח רק אל <bdi dir="ltr">{testRecipient}</bdi>, ובגוף המייל יצוין הנמען המקורי. היצרן לא יקבל הודעה.</p> : null}
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
      <label><span>נמען בפועל</span><UiInput dir="ltr" readOnly value={testMode ? testRecipient : item.recipient || "לא הוגדרה כתובת מאומתת"} /></label>
      {testMode ? <label><span>הנמען המקורי (יצרן)</span><UiInput dir="ltr" readOnly value={item.recipient || "לא מוגדר"} /></label> : null}
      <label><span>נושא קבוע מהמערכת</span><UiInput value={item.subject} readOnly /></label>
      <label><span>תוכן מובנה — ללא אפשרות עריכה</span><UiTextarea rows={10} value={item.body} readOnly /></label>
      <label><span>מידע נוסף (יתווסף אחרי התבנית)</span><UiTextarea rows={4} value={additionalInformation}
        onChange={e => setAdditionalInformation(e.target.value)} maxLength={3000} disabled={busy} /></label>
      {(!item.recipient || !item.subject || !item.body) ?
        <p>לא ניתן לשלוח עד להגדרת כתובת מאומתת ותבנית פעילה לקוד השגיאה.</p> : null}
      <button type="button" className="btn btn-primary"
        disabled={busy || !item.recipient || !item.subject || !item.body}
        onClick={() => void send()}><Send size={16} />{busy ? "שולח..." : testMode ? "שלח מייל בדיקה" : "שלח מייל ליצרן"}</button>
    </>}
    {history.length ? <section className="feedback-external-case-history" aria-label="שרשור פניות ליצרן">
      <strong>שרשור הודעות יוצאות</strong>
      <p>המיילים היוצאים נשמרים לפי זמן השליחה. תשובות מהיצרן יוצגו כאן לאחר חיבור תיבת דואר נכנס.</p>
      {[...history].reverse().map(x => <article key={x.id} className="feedback-external-case-template" dir="rtl">
        <header><strong>ALPHA ← {x.recipient}</strong></header>
        <small>{formatDateTimeDDMMYYYY(x.createdAt)} · {x.status === "sent" ? "נשלח לספק הדואר" : x.status === "failed" ? "נכשל" : "בתהליך"}</small>
        <div><strong>{x.subject}</strong></div>
        {x.body ? <p style={{ whiteSpace: "pre-wrap" }}>{x.body}</p> : null}
        {x.failureCode ? <small role="status">{x.failureCode}</small> : null}
      </article>)}
    </section> : null}
  </div>;
}
