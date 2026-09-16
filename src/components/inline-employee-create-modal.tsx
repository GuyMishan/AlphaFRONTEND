"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { notify } from "@/components/notifications";
import { EmployerInterfaceOptionSelect } from "@/components/employer-interface-option-select";
import { alphaApi } from "@/lib/api";
import { employerInterfaceApi } from "@/lib/employer-interface-api";
import { isValidEmail, validateEmployeeInput } from "@/lib/validation";
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
    monthlySalary: initial?.monthlySalary ?? 0,
    birthDate: initial?.birthDate ?? null,
    gender: initial?.gender ?? null,
    email: initial?.email ?? "",
    mobile: initial?.mobile ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key: keyof EmployeeInput, value: string | number | null) {
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
      email: (form.email ?? "").trim(),
      mobile: (form.mobile ?? "").replace(/\D/g, ""),
      monthlySalary: Number(form.monthlySalary ?? 0),
    };
    const errors = validateEmployeeInput(normalized);
    if (!normalized.birthDate) errors.push("תאריך לידה הוא שדה חובה לממשק מעסיקים 006.");
    if (!normalized.gender) errors.push("מין העובד הוא שדה חובה לממשק מעסיקים 006.");
    if (!isValidEmail(normalized.email ?? "")) errors.push("כתובת האימייל אינה תקינה.");
    if (!/^\d{1,15}$/.test(normalized.mobile ?? "")) errors.push("מספר הנייד חייב להכיל 1-15 ספרות.");
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
      await employerInterfaceApi.updateEmployeeProfile(organizationId, employerId, saved.id, {
        birthDate: normalized.birthDate ?? null,
        gender: normalized.gender ?? null,
        email: normalized.email ?? "",
        mobile: normalized.mobile ?? "",
      });
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
        monthlySalary: normalized.monthlySalary,
        birthDate: normalized.birthDate,
        gender: normalized.gender,
        email: normalized.email,
        mobile: normalized.mobile,
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
          <div className="field"><label>שכר חודשי</label><input type="number" min="0" step="0.01" value={form.monthlySalary || ""} onChange={(e) => update("monthlySalary", Number(e.target.value))} /></div>
        </div>
        <div className="notice notice-info" style={{ marginTop: 16, marginBottom: 12 }}>פרטי 006 נשמרים בפרופיל העובד ומשמשים אוטומטית בעת יצירת קובץ ממשק מעסיקים.</div>
        <div className="grid two-cols">
          <div className="field"><label>תאריך לידה *</label><input type="date" value={form.birthDate ?? ""} onChange={(e) => update("birthDate", e.target.value || null)} /></div>
          <div className="field"><label>מין *</label><EmployerInterfaceOptionSelect category="gender" value={form.gender ?? null} required onChange={(value) => update("gender", value)} /></div>
          <div className="field"><label>אימייל *</label><input type="email" maxLength={50} value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} /></div>
          <div className="field"><label>נייד *</label><input inputMode="numeric" maxLength={15} value={form.mobile ?? ""} onChange={(e) => update("mobile", e.target.value.replace(/\D/g, "").slice(0, 15))} /></div>
        </div>
      </div>
      <div className="report-modal-footer">
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>ביטול</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}><UserPlus size={16} />{saving ? "מקים עובד..." : "הקמת עובד והוספה לדיווח"}</button>
      </div>
    </div>
  </div>;
}
