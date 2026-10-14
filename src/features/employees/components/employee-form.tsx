"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useWatch, type PathValue } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { employeesApi } from "@/features/employees/api";
import { employerInterfaceApi, type EmployerInterfaceOption } from "@/features/reporting/employer-interface-api";
import type { Employee, EmployeeInput } from "@/features/employees/types";
import type { Employer } from "@/features/employers/types";
import { EmployerInterfaceOptionSelect } from "@/features/reporting/components/employer-interface-option-select";
import { AddressAutocompleteFields } from "@/features/reference-data/components/address-autocomplete-fields";
import { Field } from "@/components/forms/form-feedback";
import { invalidateEmployeeData } from "@/features/employees/queries";
import { EMPLOYEE_FIELDS, employeeSchema, type EmployeeFormValues } from "@/features/employees/schemas";
import { errorMessage } from "@/lib/api/error-messages";
import { digitsOnly, withoutWhitespace } from "@/lib/forms/input-masks";
import { applyServerErrors } from "@/lib/forms/server-errors";
import { INVALID_FORM_MESSAGE, useZodForm } from "@/lib/forms/use-zod-form";
import { UiDateInput, UiInput  } from "@/components/ui/ui-controls";

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
  formId?: string;
  hideActions?: boolean;
  onSavingChange?: (saving: boolean) => void;
  beforeSave?: (employee: EmployeeInput) => void | Promise<void>;
};

export function EmployeeForm({ organizationId, employerId, employee, employer, editable = true, embedded = false, onSaved, onCancel, submitLabel, formId, hideActions = false, onSavingChange, beforeSave }: EmployeeFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { register, control, handleSubmit, setValue, setError, clearErrors, formState: { errors, isSubmitting: saving } } = useZodForm(employeeSchema, {
    defaultValues: {
      nationalId: employee?.nationalId ?? "",
      identifierType: employee?.identifierType ?? 1,
      firstName: employee?.firstName ?? "",
      lastName: employee?.lastName ?? "",
      employeeNumber: employee?.employeeNumber ?? "",
      startDate: employee?.startDate ?? new Date().toISOString().slice(0, 10),
      monthlySalary: employee?.monthlySalary || "",
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
    },
  });
  useEffect(() => { onSavingChange?.(saving); }, [saving, onSavingChange]);
  const [identifierType, city, street] = useWatch({ control, name: ["identifierType", "city", "street"] });
  const [formOptions, setFormOptions] = useState<Record<string, EmployerInterfaceOption[]>>({});
  const [formOptionsLoading, setFormOptionsLoading] = useState(true);
  const [formOptionsError, setFormOptionsError] = useState("");
  const title = employee ? `${employee.firstName} ${employee.lastName}` : "עובד חדש";

  useEffect(() => {
    let active = true;
    setFormOptionsLoading(true);
    setFormOptionsError("");
    employerInterfaceApi.optionsBundle(["employee-identifier-type", "gender"])
      .then((items) => { if (active) setFormOptions(items); })
      .catch((err) => { if (active) setFormOptionsError(errorMessage(err, "טעינת אפשרויות העובד נכשלה")); })
      .finally(() => { if (active) setFormOptionsLoading(false); });
    return () => { active = false; };
  }, []);

  /** Value setter for non-native controls (selects, dates, address autocomplete). */
  function setField<K extends "identifierType" | "startDate" | "birthDate" | "gender" | "city" | "street">(name: K, value: EmployeeFormValues[K]) {
    clearErrors(name);
    setValue(name, value as PathValue<EmployeeFormValues, K>, { shouldDirty: true });
  }

  async function save(normalized: EmployeeInput) {
    if (!editable) return;
    try {
      await beforeSave?.(normalized);
      let employmentId: string;
      let personId = employee?.personId ?? "";
      if (employee) {
        await employeesApi.updateEmployee(organizationId, employerId, employee.id, normalized);
        employmentId = employee.id;
      } else {
        const saved = await employeesApi.createEmployee(organizationId, employerId, normalized);
        employmentId = saved.id;
        personId = saved.personId;
      }
      void invalidateEmployeeData(queryClient, organizationId, employerId);
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
    } catch (err) {
      if (!applyServerErrors(err, EMPLOYEE_FIELDS, setError)) toast.error(errorMessage(err, "שמירת העובד נכשלה"));
    }
  }

  const submit = handleSubmit(save, () => toast.error(INVALID_FORM_MESSAGE));
  const nationalIdRegistration = register("nationalId");

  const body = <>
    <div className="profile-summary"><div className="profile-avatar"><UserRound /></div><div><h2 style={{ margin: 0 }}>{title}</h2><span style={{ color: "var(--color-text-muted)" }}>{employee ? editable ? "עריכת פרופיל עובד" : "צפייה בפרופיל עובד" : <>הקמת עובד אצל {employer ? <Link className="profile-link" href={`/employers/${employer.id}?organizationId=${organizationId}`}>{employer.legalName}</Link> : "המעסיק שנבחר"}</>}</span></div></div>
    {!editable && employee ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה בעובד הזה, ללא הרשאת עריכה.</div> : null}
    <form id={formId} className="form" onSubmit={submit} noValidate>
      <div className="grid employee-details-grid">
        <Field label="שם פרטי *" error={errors.firstName?.message}><UiInput aria-invalid={Boolean(errors.firstName)} required minLength={2} maxLength={100} disabled={!editable} {...register("firstName")} /></Field>
        <Field label="שם משפחה *" error={errors.lastName?.message}><UiInput aria-invalid={Boolean(errors.lastName)} required minLength={2} maxLength={100} disabled={!editable} {...register("lastName")} /></Field>
        <Field label="סוג מזהה *" error={errors.identifierType?.message}><EmployerInterfaceOptionSelect category="employee-identifier-type" value={identifierType} disabled={!editable} required placeholder="בחרו סוג מזהה" suppliedOptions={formOptions["employee-identifier-type"] ?? []} suppliedLoading={formOptionsLoading} suppliedError={formOptionsError} onChange={(value) => setField("identifierType", value === 2 ? 2 : 1)} /></Field>
        <Field label={identifierType === 2 ? "מספר דרכון *" : "תעודת זהות *"} error={errors.nationalId?.message}><UiInput aria-invalid={Boolean(errors.nationalId)} required disabled={!editable} inputMode={identifierType === 1 ? "numeric" : "text"} maxLength={identifierType === 1 ? 9 : 16}
          {...(identifierType === 1 ? digitsOnly(nationalIdRegistration, 9) : withoutWhitespace(nationalIdRegistration, 16))} /></Field>
        <Field label="מספר עובד אצל המעסיק *" error={errors.employeeNumber?.message}><UiInput aria-invalid={Boolean(errors.employeeNumber)} required maxLength={50} disabled={!editable} {...register("employeeNumber")} /></Field>
        <Field label="תאריך תחילת עבודה *" error={errors.startDate?.message}><Controller control={control} name="startDate" render={({ field }) => <UiDateInput aria-invalid={Boolean(errors.startDate)} required disabled={!editable} value={field.value} onValueChange={(value) => setField("startDate", value)} />} /></Field>
        <Field label="שכר חודשי" error={errors.monthlySalary?.message}><UiInput aria-invalid={Boolean(errors.monthlySalary)} disabled={!editable} type="number" min="0" max="10000000" step="0.01" {...register("monthlySalary")} /></Field>
        <Field label="תאריך לידה *" error={errors.birthDate?.message}><Controller control={control} name="birthDate" render={({ field }) => <UiDateInput disabled={!editable} required value={field.value ?? ""} onValueChange={(value) => setField("birthDate", value || null)} />} /></Field>
        <Field label="מין *" error={errors.gender?.message}><Controller control={control} name="gender" render={({ field }) => <EmployerInterfaceOptionSelect category="gender" value={field.value ?? null} disabled={!editable} required suppliedOptions={formOptions.gender ?? []} suppliedLoading={formOptionsLoading} suppliedError={formOptionsError} onChange={(value) => setField("gender", value)} />} /></Field>
        <Field label="אימייל *" error={errors.email?.message}><UiInput disabled={!editable} required type="email" maxLength={50} {...register("email")} /></Field>
        <Field label="נייד *" error={errors.mobile?.message}><UiInput disabled={!editable} required inputMode="numeric" maxLength={15} {...digitsOnly(register("mobile"), 15)} /></Field>
        <AddressAutocompleteFields
          city={city}
          street={street}
          cityError={errors.city?.message}
          streetError={errors.street?.message}
          disabled={!editable}
          onCityChange={(value) => setField("city", value)}
          onStreetChange={(value) => setField("street", value)}
        />
        <Field label="מספר בית *" error={errors.houseNumber?.message}><UiInput disabled={!editable} required maxLength={20} {...register("houseNumber")} /></Field>
        <Field label="מספר דירה *" error={errors.apartment?.message}><UiInput disabled={!editable} required maxLength={20} {...register("apartment")} /></Field>
        <Field label="מיקוד" error={errors.postalCode?.message}><UiInput disabled={!editable} inputMode="numeric" maxLength={7} {...digitsOnly(register("postalCode"), 7)} /></Field>
        <Field label="תא דואר" error={errors.postOfficeBox?.message}><UiInput disabled={!editable} inputMode="numeric" maxLength={5} {...digitsOnly(register("postOfficeBox"), 5)} /></Field>
        {employee ? <div className="field"><label>סטטוס</label><UiInput disabled value={employee.status === 1 ? "פעיל" : employee.status === 2 ? "חל״ת" : "סיים עבודה"} /></div> : null}
      </div>
      {!hideActions ? <div className="form-actions">{onCancel ? <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>ביטול</button> : <Link className="btn btn-secondary" href="/employees">חזרה</Link>}{editable ? <button className="btn btn-primary" disabled={saving} type="submit"><Save size={18} />{saving ? "שומר..." : submitLabel ?? (employee ? "שמירת שינויים" : "הקמת עובד")}</button> : null}</div> : null}
    </form>
  </>;

  return embedded ? <div className="employee-form-embedded">{body}</div> : <div className="card profile-card">{body}</div>;
}
