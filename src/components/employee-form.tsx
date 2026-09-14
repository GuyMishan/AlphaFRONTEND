"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, UserRound } from "lucide-react";
import { alphaApi } from "@/lib/api";
import type { Employee, EmployeeInput, Employer } from "@/lib/types";

export function EmployeeForm({ organizationId, employerId, employee, employer, editable = true }: { organizationId: string; employerId: string; employee?: Employee; employer?: Employer; editable?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<EmployeeInput>({ nationalId: employee?.nationalId ?? "", firstName: employee?.firstName ?? "", lastName: employee?.lastName ?? "", employeeNumber: employee?.employeeNumber ?? "", startDate: employee?.startDate ?? new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const title = employee ? `${employee.firstName} ${employee.lastName}` : "עובד חדש";
  function update(key: keyof EmployeeInput, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editable) return;
    setSaving(true); setError("");
    try {
      if (employee) {
        await alphaApi.updateEmployee(organizationId, employerId, employee.id, form);
        router.push(`/employees/${employee.id}?organizationId=${organizationId}&employerId=${employerId}`);
      } else {
        const saved = await alphaApi.createEmployee(organizationId, employerId, form);
        router.push(`/employees/${saved.id}?organizationId=${organizationId}&employerId=${employerId}`);
      }
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "שמירת העובד נכשלה"); }
    finally { setSaving(false); }
  }
  return <div className="card profile-card"><div className="profile-summary"><div className="profile-avatar"><UserRound /></div><div><h2 style={{ margin: 0 }}>{title}</h2><span style={{ color: "var(--muted)" }}>{employee ? editable ? "עריכת פרופיל עובד" : "צפייה בפרופיל עובד" : <>הקמת עובד אצל {employer ? <Link className="profile-link" href={`/employers/${employer.id}?organizationId=${organizationId}`}>{employer.legalName}</Link> : "המעסיק שנבחר"}</>}</span></div></div>{!editable && employee ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה בעובד הזה, ללא הרשאת עריכה.</div> : null}{error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}<form className="form" onSubmit={submit}><div className="grid two-cols"><div className="field"><label>שם פרטי</label><input required disabled={!editable} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></div><div className="field"><label>שם משפחה</label><input required disabled={!editable} value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></div></div><div className="grid two-cols"><div className="field"><label>תעודת זהות</label><input required disabled={!editable} inputMode="numeric" value={form.nationalId} onChange={(event) => update("nationalId", event.target.value)} /></div><div className="field"><label>מספר עובד אצל המעסיק</label><input required disabled={!editable} value={form.employeeNumber} onChange={(event) => update("employeeNumber", event.target.value)} /></div></div><div className="field"><label>תאריך תחילת עבודה</label><input required disabled={!editable} type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></div>{employee ? <div className="field"><label>סטטוס</label><input disabled value={employee.status === 1 ? "פעיל" : employee.status === 2 ? "חל״ת" : "סיים עבודה"} /></div> : null}<div className="form-actions"><Link className="btn btn-secondary" href="/employees">חזרה</Link>{editable ? <button className="btn btn-primary" disabled={saving}><Save size={18} />{saving ? "שומר..." : employee ? "שמירת שינויים" : "הקמת עובד"}</button> : null}</div></form></div>;
}
