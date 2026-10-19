"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { employersApi } from "@/features/employers/api";
import type { EmployerProfileCenterSettings } from "@/features/employers/types";
import { UiSelect, UiTextarea } from "@/components/ui/ui-controls";
import { errorMessage } from "@/lib/api/error-messages";

export function ReportingTab({ organizationId, employerId, canEdit, value, onSaved }: {
  organizationId: string;
  employerId: string;
  canEdit: boolean;
  value: EmployerProfileCenterSettings["reporting"];
  onSaved: (value: EmployerProfileCenterSettings["reporting"]) => void;
}) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(value), [value]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await employersApi.updateEmployerReportingSettings(organizationId, employerId, form);
      onSaved(form);
      toast.success("הגדרות הדיווח נשמרו");
    } catch (err) {
      toast.error(errorMessage(err, "שמירת הגדרות הדיווח נכשלה"));
    } finally {
      setSaving(false);
    }
  }

  return <section className="card profile-card reporting-settings-card">
    <div className="card-head"><div><h2>הגדרות דיווח</h2><span style={{ color: "var(--color-text-muted)" }}>ברירות מחדל נוחות לדיווחים חדשים. בכל דיווח ניתן לשנות אותן לפי הצורך.</span></div></div>
    {!canEdit ? <div className="notice notice-info" style={{ marginBottom: 18 }}>הגדרות הדיווח מוצגות לקריאה בלבד לפי ההרשאה שלך.</div> : null}
    <form className="form" onSubmit={save}>
      <div className="grid two-cols">
        <div className="field">
          <label>יום תשלום שכר</label>
          <UiSelect disabled={!canEdit} value={form.defaultSalaryPaymentDay ?? ""} onChange={(e) => setForm({ ...form, defaultSalaryPaymentDay: e.target.value ? Number(e.target.value) : null })}>
            <option value="">לא הוגדר</option>
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day} בחודש</option>)}
          </UiSelect>
        </div>
        <div className="field">
          <label>סוג מפקיד</label>
          <UiSelect disabled={!canEdit} value={form.defaultDepositorTypeCode} onChange={(e) => setForm({ ...form, defaultDepositorTypeCode: Number(e.target.value) as 1 | 2 | 3 })}>
            <option value={1}>מעסיק – דיווח והפקדה עבור עובדים (קוד 1)</option>
            <option value={2}>עצמאי – דיווח והפקדה עבור עצמו (קוד 2)</option>
            <option value={3}>מעסיק קטן – לפי סיווג ממשק 006 (קוד 3)</option>
          </UiSelect>
          <small style={{ color: "var(--color-text-muted)" }}>הבחירה קובעת את סוג המפקיד (SUG-MAFKID) בקובץ ממשק 006.</small>
        </div>
        <div className="field">
          <label>סוג מזהה מעסיק בממשק 006</label>
          <UiSelect disabled={!canEdit} value={form.defaultEmployerIdentifierTypeCode} onChange={(e) => setForm({ ...form, defaultEmployerIdentifierTypeCode: Number(e.target.value) as EmployerProfileCenterSettings["reporting"]["defaultEmployerIdentifierTypeCode"] })}>
            <option value={1}>ח.פ</option>
            <option value={2}>ח.צ</option>
            <option value={3}>ת.ז</option>
            <option value={4}>דרכון</option>
            <option value={5}>עוסק מורשה</option>
            <option value={7}>עמותה</option>
            <option value={8}>אגודה שיתופית</option>
            <option value={9}>חברה ממשלתית</option>
            <option value={10}>איגוד</option>
            <option value={11}>שותפות</option>
            <option value={12}>מספר בעל רישיון</option>
            <option value={13}>ישות ללא רשם</option>
          </UiSelect>
        </div>
        <div className="field">
          <label>אמצעי תשלום</label>
          <UiSelect disabled={!canEdit} value={form.defaultPaymentMethodCode ?? ""} onChange={(e) => setForm({ ...form, defaultPaymentMethodCode: e.target.value ? Number(e.target.value) : null })}>
            <option value="">לא הוגדר</option>
            <option value={1}>העברה בנקאית</option>
            <option value={3}>כרטיס אשראי</option>
            <option value={5}>סליקה באמצעות מסלקה פנסיונית</option>
            <option value={6}>הרשאה לחיוב חשבון / הוראת קבע</option>
            <option value={7}>סליקה באמצעות מס״ב</option>
            <option value={9}>הרשאה לחיוב חשבון לפי קובץ דיווח</option>
          </UiSelect>
        </div>
        <div className="field">
          <label>סוג חשבון המעסיק</label>
          <UiSelect disabled={!canEdit} value={form.defaultEmployerAccountType ?? ""} onChange={(e) => setForm({ ...form, defaultEmployerAccountType: e.target.value ? Number(e.target.value) : null })}>
            <option value="">לא הוגדר</option>
            <option value={1}>חשבון מעסיק</option>
            <option value={2}>חשבון נאמנות</option>
          </UiSelect>
        </div>
        <div className="field">
          <label>סוג חשבון המקבל</label>
          <UiSelect disabled={!canEdit} value={form.defaultReceiverAccountType ?? ""} onChange={(e) => setForm({ ...form, defaultReceiverAccountType: e.target.value ? Number(e.target.value) : null })}>
            <option value="">לא הוגדר</option>
            <option value={1}>חשבון יצרן</option>
            <option value={2}>חשבון נאמנות</option>
          </UiSelect>
        </div>
      </div>
      <div className="field"><label>הערות תפעוליות לדיווח</label><UiTextarea disabled={!canEdit} maxLength={500} value={form.reportingNotes} onChange={(e) => setForm({ ...form, reportingNotes: e.target.value })} placeholder="הערות פנימיות שיופיעו כברירת מחדל בתהליך הדיווח" /></div>
      {canEdit ? <div className="form-actions"><span /><button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירת הגדרות"}</button></div> : null}
    </form>
  </section>;
}
