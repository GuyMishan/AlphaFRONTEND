"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { alphaApi } from "@/lib/api";
import { employerInterfaceApi } from "@/lib/employer-interface-api";
import type { Employer, EmployerInput } from "@/lib/types";
import { isValidEmail } from "@/lib/validation";
import { Field, type FieldErrors } from "@/components/form-feedback";

export function EmployerForm({ organizationId, employer, editable = true }: { organizationId: string; employer?: Employer; editable?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<EmployerInput>({
    legalName: employer?.legalName ?? "",
    registrationNumber: employer?.registrationNumber ?? "",
    withholdingFileNumber: employer?.withholdingFileNumber ?? "",
    contactFirstName: employer?.contactFirstName ?? "",
    contactLastName: employer?.contactLastName ?? "",
    contactPhone: employer?.contactPhone ?? "",
    contactEmail: employer?.contactEmail ?? "",
    contactMobile: employer?.contactMobile ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const title = employer ? employer.legalName : "מעסיק חדש";

  useEffect(() => {
    if (!employer) return;
    employerInterfaceApi.employerProfile(organizationId, employer.id).then((profile) => {
      setForm((current) => ({ ...current, ...profile }));
    }).catch(() => { /* keep entity values if profile loading fails */ });
  }, [organizationId, employer?.id]);

  function update(key: keyof EmployerInput, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate(input: EmployerInput) {
    const next: FieldErrors = {};
    if (input.legalName.trim().length < 2) next.legalName = "שם משפטי מלא הוא שדה חובה ולפחות 2 תווים.";
    if (!/^\d{5,15}$/.test(input.registrationNumber.trim())) next.registrationNumber = "מספר חברה / עוסק חייב להכיל 5-15 ספרות.";
    if (!/^\d{5,9}$/.test(input.withholdingFileNumber.trim())) next.withholdingFileNumber = "מספר תיק ניכויים חייב להכיל 5-9 ספרות.";
    if (!(input.contactFirstName ?? "").trim()) next.contactFirstName = "שם פרטי של איש הקשר הוא שדה חובה.";
    if (!(input.contactLastName ?? "").trim()) next.contactLastName = "שם משפחה של איש הקשר הוא שדה חובה.";
    if (!/^\d{1,11}$/.test(input.contactPhone ?? "")) next.contactPhone = "טלפון איש הקשר חייב להכיל 1-11 ספרות.";
    if (!isValidEmail(input.contactEmail ?? "")) next.contactEmail = "כתובת האימייל של איש הקשר אינה תקינה.";
    if (!/^\d{1,15}$/.test(input.contactMobile ?? "")) next.contactMobile = "מספר הנייד חייב להכיל 1-15 ספרות.";
    return next;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editable) return;
    const normalized: EmployerInput = {
      ...form,
      legalName: form.legalName.trim(),
      registrationNumber: form.registrationNumber.trim(),
      withholdingFileNumber: form.withholdingFileNumber.trim(),
      contactFirstName: (form.contactFirstName ?? "").trim(),
      contactLastName: (form.contactLastName ?? "").trim(),
      contactPhone: (form.contactPhone ?? "").replace(/\D/g, ""),
      contactEmail: (form.contactEmail ?? "").trim(),
      contactMobile: (form.contactMobile ?? "").replace(/\D/g, ""),
    };
    const nextErrors = validate(normalized);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) { toast.error("יש לתקן את השדות המסומנים באדום."); return; }
    setSaving(true);
    try {
      const saved = employer ? await alphaApi.updateEmployer(organizationId, employer.id, normalized) : await alphaApi.createEmployer(organizationId, normalized);
      await employerInterfaceApi.updateEmployerProfile(organizationId, saved.id, {
        contactFirstName: normalized.contactFirstName ?? "",
        contactLastName: normalized.contactLastName ?? "",
        contactPhone: normalized.contactPhone ?? "",
        contactEmail: normalized.contactEmail ?? "",
        contactMobile: normalized.contactMobile ?? "",
      });
      toast.success(employer ? "פרטי המעסיק נשמרו בהצלחה" : "המעסיק הוקם בהצלחה");
      router.push(`/employers/${saved.id}?organizationId=${organizationId}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "שמירת המעסיק נכשלה"); }
    finally { setSaving(false); }
  }

  return <div className="card profile-card">
    <div className="profile-summary"><div className="profile-avatar"><Building2 /></div><div><h2 style={{ margin: 0 }}>{title}</h2><span style={{ color: "var(--muted)" }}>{employer ? editable ? "עריכת פרופיל מעסיק" : "צפייה בפרופיל מעסיק" : "הקמת מעסיק חדש בארגון"}</span></div></div>
    {!editable && employer ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה במעסיק הזה, ללא הרשאת עריכה.</div> : null}
    <form className="form" onSubmit={submit} noValidate>
      <Field label="שם משפטי מלא *" error={errors.legalName}><input aria-invalid={Boolean(errors.legalName)} required minLength={2} maxLength={200} disabled={!editable} value={form.legalName} onChange={(event) => update("legalName", event.target.value)} /></Field>
      <div className="grid two-cols">
        <Field label="מספר חברה / עוסק *" error={errors.registrationNumber}><input aria-invalid={Boolean(errors.registrationNumber)} required disabled={!editable} inputMode="numeric" maxLength={15} value={form.registrationNumber} onChange={(event) => update("registrationNumber", event.target.value.replace(/\D/g, "").slice(0, 15))} /></Field>
        <Field label="מספר תיק ניכויים *" error={errors.withholdingFileNumber}><input aria-invalid={Boolean(errors.withholdingFileNumber)} required disabled={!editable} inputMode="numeric" maxLength={9} value={form.withholdingFileNumber} onChange={(event) => update("withholdingFileNumber", event.target.value.replace(/\D/g, "").slice(0, 9))} /></Field>
      </div>
      <div className="grid two-cols">
        <Field label="שם פרטי איש קשר *" error={errors.contactFirstName}><input disabled={!editable} maxLength={20} value={form.contactFirstName ?? ""} onChange={(event) => update("contactFirstName", event.target.value)} /></Field>
        <Field label="שם משפחה איש קשר *" error={errors.contactLastName}><input disabled={!editable} maxLength={20} value={form.contactLastName ?? ""} onChange={(event) => update("contactLastName", event.target.value)} /></Field>
        <Field label="טלפון איש קשר *" error={errors.contactPhone}><input disabled={!editable} inputMode="numeric" maxLength={11} value={form.contactPhone ?? ""} onChange={(event) => update("contactPhone", event.target.value.replace(/\D/g, "").slice(0, 11))} /></Field>
        <Field label="נייד איש קשר *" error={errors.contactMobile}><input disabled={!editable} inputMode="numeric" maxLength={15} value={form.contactMobile ?? ""} onChange={(event) => update("contactMobile", event.target.value.replace(/\D/g, "").slice(0, 15))} /></Field>
      </div>
      <Field label="אימייל איש קשר *" error={errors.contactEmail}><input disabled={!editable} type="email" maxLength={50} value={form.contactEmail ?? ""} onChange={(event) => update("contactEmail", event.target.value)} /></Field>
      {employer ? <div className="field"><label>סטטוס</label><input disabled value={employer.status === 2 ? "פעיל" : "בתהליך הקמה"} /></div> : null}
      <div className="form-actions"><Link className="btn btn-secondary" href="/employers">חזרה</Link>{editable ? <button className="btn btn-primary" disabled={saving} type="submit"><Save size={18} />{saving ? "שומר..." : employer ? "שמירת שינויים" : "הקמת מעסיק"}</button> : null}</div>
    </form>
  </div>;
}
