"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { employersApi } from "@/features/employers/api";
import type { Employer, EmployerInput } from "@/features/employers/types";
import { Field } from "@/components/forms/form-feedback";
import { invalidateEmployerData } from "@/features/employers/queries";
import { employerSchema } from "@/features/employers/schemas";
import { errorMessage } from "@/lib/api/error-messages";
import { digitsOnly } from "@/lib/forms/input-masks";
import { applyServerErrors } from "@/lib/forms/server-errors";
import { INVALID_FORM_MESSAGE, useZodForm } from "@/lib/forms/use-zod-form";
import { UiInput } from "@/components/ui/ui-controls";

const EMPLOYER_FIELDS = ["legalName", "registrationNumber", "withholdingFileNumber", "contactFirstName", "contactLastName", "contactPhone", "contactEmail", "contactMobile"] as const;

export function EmployerForm({
  organizationId,
  employer,
  editable = true,
  onCreate,
  onCreated,
  showBackLink = true,
  createLabel = "הקמת מעסיק",
  embedded = false,
  focusField,
  formId,
  hideActions = false,
  onSavingChange,
}: {
  organizationId?: string;
  employer?: Employer;
  editable?: boolean;
  onCreate?: (input: EmployerInput) => Promise<Employer>;
  onCreated?: (employer: Employer) => void;
  showBackLink?: boolean;
  createLabel?: string;
  embedded?: boolean;
  focusField?: keyof EmployerInput;
  formId?: string;
  hideActions?: boolean;
  onSavingChange?: (saving: boolean) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useZodForm(employerSchema, {
    defaultValues: {
      legalName: employer?.legalName ?? "",
      registrationNumber: employer?.registrationNumber ?? "",
      withholdingFileNumber: employer?.withholdingFileNumber ?? "",
      contactFirstName: employer?.contactFirstName ?? "",
      contactLastName: employer?.contactLastName ?? "",
      contactPhone: employer?.contactPhone ?? "",
      contactEmail: employer?.contactEmail ?? "",
      contactMobile: employer?.contactMobile ?? "",
    },
  });
  const { register, handleSubmit, setError, formState: { errors, isSubmitting: saving } } = form;
  useEffect(() => { onSavingChange?.(saving); }, [saving, onSavingChange]);
  const title = employer ? employer.legalName : "מעסיק חדש";

  async function save(values: EmployerInput) {
    if (!editable) return;
    try {
      if (employer && !organizationId) throw new Error("חסר מזהה ארגון.");
      const saved = employer
        ? await employersApi.updateEmployer(organizationId!, employer.id, values)
        : onCreate
          ? await onCreate(values)
          : await employersApi.createEmployer(organizationId!, values);
      if (organizationId ?? saved.organizationId) void invalidateEmployerData(queryClient, organizationId ?? saved.organizationId);

      toast.success(employer ? "פרטי המעסיק נשמרו בהצלחה" : "המעסיק הוקם בהצלחה");
      if (onCreated) onCreated(saved);
      else router.push(`/employers/${saved.id}?organizationId=${organizationId}`);
    } catch (err) {
      if (!applyServerErrors(err, EMPLOYER_FIELDS, setError)) toast.error(errorMessage(err, "שמירת המעסיק נכשלה"));
    }
  }

  const submit = handleSubmit(save, () => toast.error(INVALID_FORM_MESSAGE));
  const contactProps = (name: "contactFirstName" | "contactLastName" | "contactPhone" | "contactMobile" | "contactEmail") => ({
    autoFocus: focusField === name,
    className: focusField === name ? "feedback-code18-target-field" : undefined,
    disabled: !editable,
  });

  return <div className={embedded ? "employer-form-embedded" : "card profile-card"}>
    <div className="profile-summary"><div className="profile-avatar"><Building2 /></div><div><h2 style={{ margin: 0 }}>{title}</h2><span style={{ color: "var(--color-text-muted)" }}>{employer ? editable ? "עריכת פרופיל מעסיק" : "צפייה בפרופיל מעסיק" : onCreate ? "הגדרת העסק שלכם" : "הקמת מעסיק חדש בארגון"}</span></div></div>
    {!editable && employer ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה במעסיק הזה, ללא הרשאת עריכה.</div> : null}
    <form id={formId} className="form" onSubmit={submit} noValidate>
      <Field label="שם משפטי מלא *" error={errors.legalName?.message}><UiInput aria-invalid={Boolean(errors.legalName)} required minLength={2} maxLength={200} disabled={!editable} {...register("legalName")} /></Field>
      <div className="grid two-cols">
        <Field label="מספר חברה / עוסק *" error={errors.registrationNumber?.message}><UiInput aria-invalid={Boolean(errors.registrationNumber)} required disabled={!editable} inputMode="numeric" maxLength={15} {...digitsOnly(register("registrationNumber"), 10)} /></Field>
        <Field label="מספר תיק ניכויים * (במידה ואין, יש להזין 900000000)" error={errors.withholdingFileNumber?.message}><UiInput aria-invalid={Boolean(errors.withholdingFileNumber)} required disabled={!editable} inputMode="numeric" maxLength={9} {...digitsOnly(register("withholdingFileNumber"), 9)} /></Field>
      </div>
      <div className="grid two-cols">
        <Field label="שם פרטי איש קשר *" error={errors.contactFirstName?.message}><UiInput {...contactProps("contactFirstName")} maxLength={20} {...register("contactFirstName")} /></Field>
        <Field label="שם משפחה איש קשר *" error={errors.contactLastName?.message}><UiInput {...contactProps("contactLastName")} maxLength={20} {...register("contactLastName")} /></Field>
        <Field label="טלפון איש קשר" error={errors.contactPhone?.message}><UiInput {...contactProps("contactPhone")} inputMode="numeric" maxLength={11} {...digitsOnly(register("contactPhone"), 11)} /></Field>
        <Field label="נייד איש קשר" error={errors.contactMobile?.message}><UiInput {...contactProps("contactMobile")} inputMode="numeric" maxLength={10} {...digitsOnly(register("contactMobile"), 15)} /></Field>
      </div>
      <small style={{ color: "var(--color-text-muted)", marginTop: -8 }}>יש להזין לפחות אחד מהשדות: טלפון או נייד.</small>
      <Field label="אימייל איש קשר *" error={errors.contactEmail?.message}><UiInput {...contactProps("contactEmail")} type="email" maxLength={50} {...register("contactEmail")} /></Field>
      {employer ? <div className="field"><label>סטטוס</label><UiInput disabled value={employer.status === 2 ? "פעיל" : "בתהליך הקמה"} /></div> : null}
      {!hideActions ? <div className="form-actions">{showBackLink ? <Link className="btn btn-secondary" href="/employers">חזרה</Link> : null}{editable ? <button className="btn btn-primary" disabled={saving} type="submit"><Save size={18} />{saving ? "שומר..." : employer ? "שמירת שינויים" : createLabel}</button> : null}</div> : null}
    </form>
  </div>;
}
