"use client";

import { Save } from "lucide-react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";
import { UiInput } from "@/components/ui/ui-controls";
import { FormSelect } from "@/components/forms/form-select";
import { organizationsApi, type OrganizationGeneralInput } from "@/features/organizations/api";
import { organizationTypeLabel, organizationTypeOptions } from "@/features/organizations/organization-types";
import { organizationGeneralSchema } from "@/features/organizations/schemas";
import type { OrganizationProfileCenter } from "@/features/organizations/types";
import { errorMessage } from "@/lib/api/error-messages";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { digitsOnly } from "@/lib/forms/input-masks";

type TextField = Exclude<keyof OrganizationGeneralInput, "type" | "name" | "postalCode">;

const textFields: { name: TextField; label: string; maxLength: number; type?: string }[] = [
  { name: "registrationNumber", label: "מספר חברה / עוסק", maxLength: 30 },
  { name: "contactName", label: "איש קשר", maxLength: 150 },
  { name: "contactEmail", label: "אימייל איש קשר", maxLength: 320, type: "email" },
  { name: "contactPhone", label: "טלפון איש קשר", maxLength: 20 },
  { name: "city", label: "יישוב", maxLength: 100 },
  { name: "street", label: "רחוב", maxLength: 100 },
  { name: "houseNumber", label: "מספר בית", maxLength: 20 },
  { name: "apartment", label: "דירה", maxLength: 20 },
];

/** Organization profile → general details (company, address and contact). */
export function OrganizationGeneralForm({ profile, onSaved }: { profile: OrganizationProfileCenter; onSaved: () => Promise<void> }) {
  const canEdit = profile.canEditOrganizationGeneral ?? profile.canManageOrganization;
  const { register, handleSubmit, control, formState: { isSubmitting: saving } } = useZodForm(organizationGeneralSchema, {
    defaultValues: { name: profile.name, type: profile.type, ...profile.general },
  });
  const type = useWatch({ control, name: "type" });

  async function save(values: OrganizationGeneralInput) {
    try {
      await organizationsApi.updateOrganizationGeneral(profile.id, values);
      await onSaved();
      toast.success("פרטי הארגון נשמרו");
    } catch (err) {
      toast.error(errorMessage(err, "שמירת פרטי הארגון נכשלה"));
    }
  }

  return <section className="card profile-card">
    <div className="card-head"><div><h2>פרטים כלליים</h2><span style={{ color: "var(--muted)" }}>פרטי החברה, כתובת ואיש קשר ארגוני.</span></div></div>
    {!canEdit ? <div className="notice notice-info" style={{ marginBottom: 18 }}>הפרטים מוצגים לקריאה בלבד. משתמש מורשה יכול לעדכן את פרטי הארגון.</div> : null}
    <form className="form" onSubmit={handleSubmit(save)}>
      <div className="grid organization-details-grid">
        <div className="field"><label>שם הארגון</label><UiInput disabled={!canEdit} required maxLength={200} {...register("name")} /></div>
        <div className="field"><label>סוג ארגון</label><FormSelect control={control} name="type" numeric disabled={!profile.canManageOrganization}>{!organizationTypeOptions.some((option) => option.value === type) ? <option value={type} disabled>{organizationTypeLabel(type)} (סוג קיים)</option> : null}{organizationTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</FormSelect></div>
        {textFields.map((field) => <div key={field.name} className="field"><label>{field.label}</label><UiInput disabled={!canEdit} type={field.type} maxLength={field.maxLength} {...register(field.name)} /></div>)}
        <div className="field"><label>מיקוד</label><UiInput disabled={!canEdit} maxLength={10} {...digitsOnly(register("postalCode"), 10)} /></div>
        <div className="field"><label>תא דואר</label><UiInput disabled={!canEdit} maxLength={20} {...register("postOfficeBox")} /></div>
      </div>
      {canEdit ? <div className="form-actions"><span /><button className="btn btn-primary" disabled={saving} type="submit"><Save size={17} />{saving ? "שומר..." : "שמירת פרטים"}</button></div> : null}
    </form>
  </section>;
}
