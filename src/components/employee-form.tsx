"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, UserRound } from "lucide-react";
import { alphaApi } from "@/lib/api";
import type { Employee, EmployeeInput, Employer } from "@/lib/types";
import { validateEmployeeInput } from "@/lib/validation";

export function EmployeeForm({ organizationId, employerId, employee, employer, editable = true }: { organizationId: string; employerId: string; employee?: Employee; employer?: Employer; editable?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<EmployeeInput>({ nationalId: employee?.nationalId ?? "", firstName: employee?.firstName ?? "", lastName: employee?.lastName ?? "", employeeNumber: employee?.employeeNumber ?? "", startDate: employee?.startDate ?? new Date().toISOString().slice(0, 10), monthlySalary: employee?.monthlySalary ?? 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const title = employee ? `${employee.firstName} ${employee.lastName}` : "עובד חדש";
  function update(key: keyof EmployeeInput, value: string | number) { setForm((current) => ({ ...current, [key]: value })); setError(""); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editable) return;
    const normalized = { ...form, nationalId: form.nationalId.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim(), employeeNumber: form.employeeNumber.trim(), monthlySalary: Number(form.monthlySalary ?? 0) };
    const errors = validateEmployeeInput(normalized);
    if (normalized.monthlySalary < 0) errors.push("שכר חודשי לא יכול להיות שלילי.");
    if (errors.length) { setError(errors.join(" ")); return; }
    setSaving(true); setError("");
    try {
      if (employee) {
        await alphaApi.updateEmployee(organizationId, employerId, employee.id, normalized);
        router.push(`/employees/${employee.id}?organizationId=${organizationId}&employerId=${employerId}`);
      } else {
        const saved = await alphaApi.createEmployee(organizationId, employerId, normalized);
        router.push(`/employees/${saved.id}?organizationId=${organizationId}&employerId=${employerId}`);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "שמירת העובד נכשלה"); }
    finally { setSaving(false); }
  }
  return <div className="card profile-card"><div className="profile-summary"><div className="profile-avatar"><UserRound /></div><div><h2 style={{ margin: 0 }}>{title}</h2><span style={{ color: "var(--muted)" }}>{employee ? editable ? "עריכת פרופיל עובד" : "צפייה בפרופיל עובד" : <>הקמת עובד אצל {employer ? <Link className="profile-link" href={`/employers/${employer.id}?organizationId=${organizationId}`}>{employer.legalName}</Link> : "המעסיק שנבחר"}</>}</span></div></div>{!editable && employee ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה בעובד הזה, ללא הרשאת עריכה.</div> : null}{error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}<form className="form" onSubmit={submit} noValidate><div className="grid two-cols"><div className="field"><label>שם פרטי *</label><input required minLength={2} maxLength={100} disabled={!editable} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></div><div className="field"><label>שם משפחה *</label><input required minLength={2} maxLength={100} disabled={!editable} value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></div></div><div className="grid two-cols"><div className="field"><label>תעודת זהות *</label><input required disabled={!editable} inputMode="numeric" maxLength={9} value={form.nationalId} onChange={(event) => update("nationalId", event.target.value.replace(/\D/g, "").slice(0, 9))} /></div><div className="field"><label>מספר עובד אצל המעסיק *</label><input required maxLength={50} disabled={!editable} value={form.employeeNumber} onChange={(event) => update("employeeNumber", event.target.value)} /></div></div><div className="grid two-cols"><div className="field"><label>תאריך תחילת עבודה *</label><input required disabled={!editable} type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></div><div className="field"><label>שכר חודשי</label><input disabled={!editable} type="number" min="0" max="10000000" step="0.01" value={form.monthlySalary || ""} onChange={(event) => update("monthlySalary", Number(event.target.value))} placeholder="לדוגמה 20000" /></div></div>{employee ? <div className="field"><label>סטטוס</label><input disabled value={employee.status === 1 ? "פעיל" : employee.status === 2 ? "חל״ת" : "סיים עבודה"} /></div> : null}<div className="form-actions"><Link className="btn btn-secondary" href="/employees">חזרה</Link>{editable ? <button className="btn btn-primary" disabled={saving} type="submit"><Save size={18} />{saving ? "שומר..." : employee ? "שמירת שינויים" : "הקמת עובד"}</button> : null}</div></form></div>;
}
