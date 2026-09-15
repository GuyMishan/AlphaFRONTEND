"use client";

import { useState } from "react";
import { Save, UserPlus, X } from "lucide-react";
import { notify } from "@/components/notifications";
import { alphaApi } from "@/lib/api";
import { validateEmployeeInput } from "@/lib/validation";
import type { Employee, EmployeeInput } from "@/lib/types";

type Props = {
  organizationId: string;
  employerId: string;
  onClose: () => void;
  onCreated: (employee: Employee) => void | Promise<void>;
  initial?: Partial<EmployeeInput>;
};

const today = () => new Date().toISOString().slice(0, 10);

export function InlineEmployeeCreateModal({ organizationId, employerId, onClose, onCreated, initial }: Props) {
  const [form, setForm] = useState<EmployeeInput>({
    nationalId: initial?.nationalId ?? "",
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    employeeNumber: initial?.employeeNumber ?? "",
    startDate: initial?.startDate ?? today(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof EmployeeInput, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function save() {
    const normalized: EmployeeInput = {
      ...form,
      nationalId: form.nationalId.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      employeeNumber: form.employeeNumber.trim(),
    };
    const errors = validateEmployeeInput(normalized);
    if (errors.length) {
      const message = errors.join(" ");
      setError(message);
      notify.error(message);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const saved = await alphaApi.createEmployee(organizationId, employerId, normalized);
      const employee: Employee = {
        id: saved.id,
        personId: saved.personId,
        nationalId: normalized.nationalId,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        employeeNumber: normalized.employeeNumber,
        startDate: normalized.startDate,
        endDate: null,
        status: 1,
      };
      await onCreated(employee);
      notify.success("העובד הוקם ונוסף לדיווח");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "הקמת העובד נכשלה";
      setError(message);
      notify.error(message);
      setSaving(false);
    }
  }

  return <div className="report-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <div className="report-modal" role="dialog" aria-modal="true" aria-label="הקמת עובד חדש">
      <div className="report-modal-header">
        <div><h2>הקמת עובד חדש</h2><span>העובד יוקם אצל המעסיק הנבחר וייכנס מיד לדיווח.</span></div>
        <button type="button" className="icon-button" disabled={saving} onClick={onClose} aria-label="סגירה"><X size={18} /></button>
      </div>
      <div className="report-modal-body">
        {error ? <div className="notice notice-error" style={{ marginBottom: 16 }}>{error}</div> : null}
        <div className="grid two-cols">
          <div className="field"><label>שם פרטי *</label><input autoFocus maxLength={100} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} /></div>
          <div className="field"><label>שם משפחה *</label><input maxLength={100} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} /></div>
          <div className="field"><label>תעודת זהות *</label><input inputMode="numeric" maxLength={9} value={form.nationalId} onChange={(e) => update("nationalId", e.target.value.replace(/\D/g, "").slice(0, 9))} /></div>
          <div className="field"><label>מספר עובד *</label><input maxLength={50} value={form.employeeNumber} onChange={(e) => update("employeeNumber", e.target.value)} /></div>
          <div className="field"><label>תאריך תחילת עבודה *</label><input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} /></div>
        </div>
        <div className="notice notice-info" style={{ marginTop: 16 }}>לאחר ההקמה ניתן להשלים את תמהיל העובד מתוך פרופיל העובד או ישירות מתוך הדיווח.</div>
      </div>
      <div className="report-modal-footer">
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>ביטול</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}><UserPlus size={16} />{saving ? "מקים עובד..." : "הקמת עובד והוספה לדיווח"}</button>
      </div>
    </div>
  </div>;
}
