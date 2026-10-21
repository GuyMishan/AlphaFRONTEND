"use client";

import { useCallback, useEffect, useState } from "react";
import { UiInput, UiTextarea, UiCheckbox } from "@/components/ui/ui-controls";
import { adminApi } from "@/features/admin/api";
import { errorMessage } from "@/lib/api/error-messages";
import { notify } from "@/components/ui/notifications";

type Template = { errorCode: number; description: string; subject: string; body: string; isEnabled: boolean };
const tokenNames: Record<string, string> = {
  errorCode: "קוד שגיאה", errorDescription: "תיאור שגיאה",
  manufacturerName: "יצרן", productName: "מוצר", employerName: "מעסיק",
  reportMonth: "חודש דיווח", reportReference: "מזהה דיווח", paymentReference: "אסמכתת תשלום",
};
export function ManufacturerEmailTemplatesAdminTab() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Template[]>([]);
  const [tokens, setTokens] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await adminApi.manufacturerEmailTemplates(search);
      setRows(result.items); setTokens(result.allowedTokens);
    } catch (e) { setError(errorMessage(e, "טעינת תבניות המייל נכשלה")); }
  }, [search]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const item = rows.find(row => row.errorCode === selected);
    if (item) setDraft(item);
  }, [rows, selected]);
  async function save() {
    if (!draft) return;
    setBusy(true); setError("");
    try {
      await adminApi.saveManufacturerEmailTemplate(draft.errorCode, draft.subject, draft.body, draft.isEnabled);
      notify.success("התבנית נשמרה");
      await load();
    } catch (e) { setError(errorMessage(e, "שמירת התבנית נכשלה")); }
    finally { setBusy(false); }
  }
  const usable = draft && draft.subject.trim().length > 0 && draft.body.trim().length > 0;
  return <section className="card admin-section-card" style={{ padding: 18 }}>
    <h2>תבניות פנייה ליצרנים לפי קוד שגיאה</h2>
    <p style={{ color: "var(--color-text-muted)" }}>תבנית משותפת לכל היצרנים. הפעלת תבנית מאפשרת להשתמש בה בשלב השליחה העתידי, אך אינה שולחת מייל בעצמה.</p>
    <label className="field" style={{ maxWidth: 400, marginBlock: 12 }}><span>חיפוש קוד שגיאה</span>
      <UiInput value={search} onChange={event => setSearch(event.target.value)} placeholder="מספר קוד או תיאור" />
    </label>
    {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 14 }}>
      <div style={{ maxHeight: 480, overflow: "auto", display: "grid", alignContent: "start", gap: 6 }}>
        {rows.map(row => <button type="button" key={row.errorCode}
          className={selected === row.errorCode ? "btn btn-primary" : "btn btn-secondary"}
          style={{ whiteSpace: "normal", textAlign: "right", justifyContent: "flex-start" }}
          onClick={() => { setSelected(row.errorCode); setDraft(row); }}>
          קוד {row.errorCode} · {row.description} {row.isEnabled ? "✓" : ""}
        </button>)}
        {rows.length === 0 ? <p>לא נמצאו קודים בקטלוג.</p> : null}
      </div>
      {draft ? <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <h3>קוד {draft.errorCode} — {draft.description}</h3>
        <label className="field"><span>נושא ההודעה</span><UiInput maxLength={200}
          value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} /></label>
        <label className="field"><span>גוף ההודעה</span><UiTextarea rows={10} maxLength={8000}
          value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /></label>
        <div><strong>משתנים מותרים</strong><p style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
          {tokens.map(token => `{${token}} — ${tokenNames[token] || token}`).join(" · ")}
        </p></div>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UiCheckbox checked={draft.isEnabled} onChange={e => setDraft({ ...draft, isEnabled: e.target.checked })}
            disabled={!usable || busy} /> תבנית פעילה
        </label>
        <button type="button" className="btn btn-primary" disabled={busy || (draft.isEnabled && !usable)}
          onClick={() => void save()}>{busy ? "שומר..." : "שמור תבנית"}</button>
      </div> : <p>בחרו קוד שגיאה כדי להגדיר תבנית פנייה.</p>}
    </div>
  </section>;
}
