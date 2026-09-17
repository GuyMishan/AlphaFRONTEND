"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { alphaApi } from "@/lib/api";
import { employerInterfaceApi } from "@/lib/employer-interface-api";
import type { Employee, EmployeeInput, Employer } from "@/lib/types";
import { isIsraeliId, isValidEmail } from "@/lib/validation";
import { EmployerInterfaceOptionSelect } from "@/components/employer-interface-option-select";
import { AddressAutocompleteFields } from "@/components/address-autocomplete-fields";
import { Field, type FieldErrors } from "@/components/form-feedback";

type EmployeeFormProps = {
  organizationId: string;
  employerId: string;
  employee?: Employee;
  employer?: Employer;
  editable?: boolean;
  embedded?: boolean;
  onSaved?: (employee: Employee) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
};

export function EmployeeForm({ organizationId, employerId, employee, employer, editable = true, embedded = false, onSaved, onCancel, submitLabel }: EmployeeFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<EmployeeInput>({
    nationalId: employee?.nationalId ?? "",
    firstName: employee?.firstName ?? "",
    lastName: employee?.lastName ?? "",
    employeeNumber: employee?.employeeNumber ?? "",
    startDate: employee?.startDate ?? new Date().toISOString().slice(0, 10),
    monthlySalary: employee?.monthlySalary ?? 0,
    birthDate: employee?.birthDate ?? null,
    gender: employee?.gender ?? null,
    email: employee?.email ?? "",
    mobile: employee?.mobile ?? "",
    city: employee?.city ?? "",
    street: employee?.street ?? "",
    houseNumber: employee?.houseNumber ?? "",
    apartment: employee?.apartment ?? "",
    postalCode: employee?.postalCode ?? "",
    postOfficeBox: employee?.postOfficeBox ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const title = employee ? `${employee.firstName} ${employee.lastName}` : "עובד חדש";

  useEffect(() => {
    if (!employee) return;
    employerInterfaceApi.employeeProfile(organizationId, employerId, employee.id).then((profile) => {
      setForm((current) => ({ ...current, ...profile }));
    }).catch(() => { /* profile may not yet be completed */ });
  }, [organizationId, employerId, employee?.id]);

  function update(key: keyof EmployeeInput, value: string | number | null) {
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
    if (!normalized.birthDate) next.birthDate = "תאריך לידה הוא שדה חובה.";
    if (!normalized.gender) next.gender = "מין העובד הוא שדה חובה.";
    if (!isValidEmail(normalized.email)) next.email = "כתובת האימייל אינה תקינה.";
    if (!/^\d{1,15}$/.test(normalized.mobile)) next.mobile = "מספר הנייד חייב להכיל 1-15 ספרות.";
    if (!normalized.city.trim()) next.city = "יישוב הוא שדה חובה.";
    if (!normalized.street.trim()) next.street = "רחוב הוא שדה חובה.";
    if (!normalized.houseNumber.trim()) next.houseNumber = "מספר בית הוא שדה חובה.";
    if (!normalized.apartment.trim()) next.apartment = "מספר דירה הוא שדה חובה.";
    if (!/^\d+$/.test(normalized.postalCode.trim())) next.postalCode = "מיקוד הוא שדה חובה וחייב להכיל ספרות בלבד.";
    if (!normalized.postOfficeBox.trim()) next.postOfficeBox = "תא דואר הוא שדה חובה.";
    return next;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editable) return;
    const normalized: EmployeeInput = {
      ...form,
      nationalId: form.nationalId.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      employeeNumber: form.employeeNumber.trim(),
      monthlySalary: Number(form.monthlySalary ?? 0),
      email: form.email.trim(),
      mobile: form.mobile.replace(/\D/g, ""),
      city: form.city.trim(),
      street: form.street.trim(),
      houseNumber: form.houseNumber.trim(),
      apartment: form.apartment.trim(),
      postalCode: form.postalCode.replace(/\D/g, ""),
      postOfficeBox: form.postOfficeBox.trim(),
    };
    const nextErrors = validate(normalized);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) { toast.error("יש לתקן את השדות המסומנים באדום."); return; }
    setSaving(true);
    try {
      let employmentId: string;
      let personId = employee?.personId ?? "";
      if (employee) {
        await alphaApi.updateEmployee(organizationId, employerId, employee.id, normalized);
        employmentId = employee.id;
      } else {
        const saved = await alphaApi.createEmployee(organizationId, employerId, normalized);
        employmentId = saved.id;
        personId = saved.personId;
      }
      await employerInterfaceApi.updateEmployeeProfile(organizationId, employerId, employmentId, {
        birthDate: normalized.birthDate,
        gender: normalized.gender,
        email: normalized.email,
        mobile: normalized.mobile,
        city: normalized.city,
        street: normalized.street,
        houseNumber: normalized.houseNumber,
        apartment: normalized.apartment,
        postalCode: normalized.postalCode,
        postOfficeBox: normalized.postOfficeBox,
      });
      const savedEmployee: Employee = {
        id: employmentId,
        personId,
        ...normalized,
        status: employee?.status ?? 1,
        endDate: employee?.endDate ?? null,
      };
      toast.success(employee ? "פרטי העובד נשמרו בהצלחה" : "העובד הוקם בהצלחה");
      if (onSaved) await onSaved(savedEmployee);
      else router.push(`/employees/${employmentId}?organizationId=${organizationId}&employerId=${employerId}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "שמירת העובד נכשלה"); }
    finally { setSaving(false); }
  }

  const body = <>
    <div className="profile-summary"><div className="profile-avatar"><UserRound /></div><div><h2 style={{ margin: 0 }}>{title}</h2><span style={{ color: "var(--muted)" }}>{employee ? editable ? "עריכת פרופיל עובד" : "צפייה בפרופיל עובד" : <>הקמת עובד אצל {employer ? <Link className="profile-link" href={`/employers/${employer.id}?organizationId=${organizationId}`}>{employer.legalName}</Link> : "המעסיק שנבחר"}</>}</span></div></div>
    {!editable && employee ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה בעובד הזה, ללא הרשאת עריכה.</div> : null}
    <form className="form" onSubmit={submit} noValidate>
      <div className="grid two-cols">
        <Field label="שם פרטי *" error={errors.firstName}><input aria-invalid={Boolean(errors.firstName)} required minLength={2} maxLength={100} disabled={!editable} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></Field>
        <Field label="שם משפחה *" error={errors.lastName}><input aria-invalid={Boolean(errors.lastName)} required minLength={2} maxLength={100} disabled={!editable} value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></Field>
      </div>
      <div className="grid two-cols">
        <Field label="תעודת זהות *" error={errors.nationalId}><input aria-invalid={Boolean(errors.nationalId)} required disabled={!editable} inputMode="numeric" maxLength={9} value={form.nationalId} onChange={(event) => update("nationalId", event.target.value.replace(/\D/g, "").slice(0, 9))} /></Field>
        <Field label="מספר עובד אצל המעסיק *" error={errors.employeeNumber}><input aria-invalid={Boolean(errors.employeeNumber)} required maxLength={50} disabled={!editable} value={form.employeeNumber} onChange={(event) => update("employeeNumber", event.target.value)} /></Field>
      </div>
      <div className="grid two-cols">
        <Field label="תאריך תחילת עבודה *" error={errors.startDate}><input aria-invalid={Boolean(errors.startDate)} required disabled={!editable} type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field>
        <Field label="שכר חודשי" error={errors.monthlySalary}><input aria-invalid={Boolean(errors.monthlySalary)} disabled={!editable} type="number" min="0" max="10000000" step="0.01" value={form.monthlySalary || ""} onChange={(event) => update("monthlySalary", Number(event.target.value))} /></Field>
      </div>
      <div className="grid two-cols">
        <Field label="תאריך לידה *" error={errors.birthDate}><input disabled={!editable} required type="date" value={form.birthDate ?? ""} onChange={(event) => update("birthDate", event.target.value || null)} /></Field>
        <Field label="מין *" error={errors.gender}><EmployerInterfaceOptionSelect category="gender" value={form.gender ?? null} disabled={!editable} required onChange={(value) => update("gender", value)} /></Field>
        <Field label="אימייל *" error={errors.email}><input disabled={!editable} required type="email" maxLength={50} value={form.email} onChange={(event) => update("email", event.target.value)} /></Field>
        <Field label="נייד *" error={errors.mobile}><input disabled={!editable} required inputMode="numeric" maxLength={15} value={form.mobile} onChange={(event) => update("mobile", event.target.value.replace(/\D/g, "").slice(0, 15))} /></Field>
        <AddressAutocompleteFields
          city={form.city}
          street={form.street}
          cityError={errors.city}
          streetError={errors.street}
          disabled={!editable}
          onCityChange={(value) => update("city", value)}
          onStreetChange={(value) => update("street", value)}
        />
        <Field label="מספר בית *" error={errors.houseNumber}><input disabled={!editable} required maxLength={20} value={form.houseNumber} onChange={(event) => update("houseNumber", event.target.value)} /></Field>
        <Field label="מספר דירה *" error={errors.apartment}><input disabled={!editable} required maxLength={20} value={form.apartment} onChange={(event) => update("apartment", event.target.value)} /></Field>
        <Field label="מיקוד *" error={errors.postalCode}><input disabled={!editable} required inputMode="numeric" maxLength={10} value={form.postalCode} onChange={(event) => update("postalCode", event.target.value.replace(/\D/g, "").slice(0, 10))} /></Field>
        <Field label="תא דואר *" error={errors.postOfficeBox}><input disabled={!editable} required maxLength={20} value={form.postOfficeBox} onChange={(event) => update("postOfficeBox", event.target.value)} /></Field>
      </div>
      {employee ? <div className="field"><label>סטטוס</label><input disabled value={employee.status === 1 ? "פעיל" : employee.status === 2 ? "חל״ת" : "סיים עבודה"} /></div> : null}
      <div className="form-actions">{onCancel ? <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>ביטול</button> : <Link className="btn btn-secondary" href="/employees">חזרה</Link>}{editable ? <button className="btn btn-primary" disabled={saving} type="submit"><Save size={18} />{saving ? "שומר..." : submitLabel ?? (employee ? "שמירת שינויים" : "הקמת עובד")}</button> : null}</div>
    </form>
  </>;

  return embedded ? <div className="employee-form-embedded">{body}</div> : <div className="card profile-card">{body}</div>;
}
