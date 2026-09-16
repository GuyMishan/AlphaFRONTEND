"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { alphaApi } from "@/lib/api";
import type { Employee, EmployeeInput, Employer } from "@/lib/types";
import { isIsraeliId } from "@/lib/validation";
import { Field, type FieldErrors } from "@/components/form-feedback";

export function EmployeeForm({ organizationId, employerId, employee, employer, editable = true }: { organizationId: string; employerId: string; employee?: Employee; employer?: Employer; editable?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<EmployeeInput>({ nationalId: employee?.nationalId ?? "", firstName: employee?.firstName ?? "", lastName: employee?.lastName ?? "", employeeNumber: employee?.employeeNumber ?? "", startDate: employee?.startDate ?? new Date().toISOString().slice(0, 10), monthlySalary: employee?.monthlySalary ?? 0 });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const title = employee ? `${employee.firstName} ${employee.lastName}` : "עובד חדש";

  function update(key: keyof EmployeeInput, value: string | number) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate(normalized: EmployeeInput) {
    const next: FieldErrors = {};
    if (normalized.firstName.trim().length < 2) next.firstName = "שם פרטי הוא שדה חובה ולפחות 2 תווים.";
    if (normalized.lastName.trim().length < 2) next.lastName = "שם משפחה הוא שדה חובה ולפחות 2 תווים.";
    if (!isIsraeliId(normalized.nationalId.trim())) next.nationalId = "תעודת הזהות אינה תקינה.";
    if (!normalized.employeeNumber.trim()) next.employeeNumber = "מספר עובד הוא שדה חובה.";
    if (!normalized.startDate) next.startDate = "תאריך תחילת עבודה הוא שדה חובה.";
    else {
      const start = new Date(`${normalized.startDate}T00:00:00`);
      const min = new Date("1950-01-01T00:00:00");
      const max = new Date(); max.setFullYear(max.getFullYear() + 1);
      if (Number.isNaN(start.getTime()) || start < min || start > max) next.startDate = "תאריך תחילת העבודה אינו הגיוני.";
    }
    if (Number(normalized.monthlySalary ?? 0) < 0) next.monthlySalary = "שכר חודשי לא יכול להיות שלילי.";
    return next;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editable) return;
    const normalized = { ...form, nationalId: form.nationalId.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim(), employeeNumber: form.employeeNumber.trim(), monthlySalary: Number(form.monthlySalary ?? 0) };
    const nextErrors = validate(normalized);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) { toast.error("יש לתקן את השדות המסומנים באדום."); return; }
    setSaving(true);
    try {
      if (employee) {
        await alphaApi.updateEmployee(organizationId, employerId, employee.id, normalized);
        toast.success("פרטי העובד נשמרו בהצלחה");
        router.push(`/employees/${employee.id}?organizationId=${organizationId}&employerId=${employerId}`);
      } else {
        const saved = await alphaApi.createEmployee(organizationId, employerId, normalized);
        toast.success("העובד הוקם בהצלחה");
        router.push(`/employees/${saved.id}?organizationId=${organizationId}&employerId=${employerId}`);
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "שמירת העובד נכשלה"); }
    finally { setSaving(false); }
  }

  return <div className="card profile-card"><div className="profile-summary"><div className="profile-avatar"><UserRound /></div><div><h2 style={{ margin: 0 }}>{title}</h2><span style={{ color: "var(--muted)" }}>{employee ? editable ? "עריכת פרופיל עובד" : "צפייה בפרופיל עובד" : <>הקמת עובד אצל {employer ? <Link className="profile-link" href={`/employers/${employer.id}?organizationId=${organizationId}`}>{employer.legalName}</Link> : "המעסיק שנבחר"}</>}</span></div></div>{!editable && employee ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה בעובד הזה, ללא הרשאת עריכה.</div> : null}<form className="form" onSubmit={submit} noValidate><div className="grid two-cols"><Field label="שם פרטי *" error={errors.firstName}><input aria-invalid={Boolean(errors.firstName)} required minLength={2} maxLength={100} disabled={!editable} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></Field><Field label="שם משפחה *" error={errors.lastName}><input aria-invalid={Boolean(errors.lastName)} required minLength={2} maxLength={100} disabled={!editable} value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></Field></div><div className="grid two-cols"><Field label="תעודת זהות *" error={errors.nationalId}><input aria-invalid={Boolean(errors.nationalId)} required disabled={!editable} inputMode="numeric" maxLength={9} value={form.nationalId} onChange={(event) => update("nationalId", event.target.value.replace(/\D/g, "").slice(0, 9))} /></Field><Field label="מספר עובד אצל המעסיק *" error={errors.employeeNumber}><input aria-invalid={Boolean(errors.employeeNumber)} required maxLength={50} disabled={!editable} value={form.employeeNumber} onChange={(event) => update("employeeNumber", event.target.value)} /></Field></div><div className="grid two-cols"><Field label="תאריך תחילת עבודה *" error={errors.startDate}><input aria-invalid={Boolean(errors.startDate)} required disabled={!editable} type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field><Field label="שכר חודשי" error={errors.monthlySalary}><input aria-invalid={Boolean(errors.monthlySalary)} disabled={!editable} type="number" min="0" max="10000000" step="0.01" value={form.monthlySalary || ""} onChange={(event) => update("monthlySalary", Number(event.target.value))} placeholder="לדוגמה 20000" /></Field></div>{employee ? <div className="field"><label>סטטוס</label><input disabled value={employee.status === 1 ? "פעיל" : employee.status === 2 ? "חל״ת" : "סיים עבודה"} /></div> : null}<div className="form-actions"><Link className="btn btn-secondary" href="/employees">חזרה</Link>{editable ? <button className="btn btn-primary" disabled={saving} type="submit"><Save size={18} />{saving ? "שומר..." : employee ? "שמירת שינויים" : "הקמת עובד"}</button> : null}</div></form></div>;
}
