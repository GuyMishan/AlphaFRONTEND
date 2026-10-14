"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { employersApi } from "@/features/employers/api";
import { refreshScopeContext } from "@/features/scope/scope-context";
import { editableEmployerStatuses, employerStatusBadgeClass, employerStatusLabel } from "@/features/employers/employer-status";
import type { Employer, EmployerInput, EmployerAddressSettings } from "@/features/employers/types";
import { UiInput, UiSelect } from "@/components/ui/ui-controls";
import { Tooltip } from "@/components/ui/tooltip";
import { errorMessage } from "@/lib/api/error-messages";

export function GeneralTab({ organizationId, employer, canEdit, canManage, address, onEmployerSaved, onAddressSaved }: {
  organizationId: string;
  employer: Employer;
  canEdit: boolean;
  canManage: boolean;
  address: EmployerAddressSettings;
  onEmployerSaved: (value: Employer) => void;
  onAddressSaved: (value: EmployerAddressSettings) => void;
}) {
  const [details, setDetails] = useState<EmployerInput>({
    legalName: employer.legalName,
    registrationNumber: employer.registrationNumber,
    withholdingFileNumber: employer.withholdingFileNumber,
    contactFirstName: employer.contactFirstName ?? "",
    contactLastName: employer.contactLastName ?? "",
    contactPhone: employer.contactPhone ?? "",
    contactEmail: employer.contactEmail ?? "",
    contactMobile: employer.contactMobile ?? "",
  });
  const [addressForm, setAddressForm] = useState(address);
  const [status, setStatus] = useState<2 | 4>(employer.status === 4 ? 4 : 2);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(employer.status === 4 ? 4 : 2);
    setDetails({
      legalName: employer.legalName,
      registrationNumber: employer.registrationNumber,
      withholdingFileNumber: employer.withholdingFileNumber,
      contactFirstName: employer.contactFirstName ?? "",
      contactLastName: employer.contactLastName ?? "",
      contactPhone: employer.contactPhone ?? "",
      contactEmail: employer.contactEmail ?? "",
      contactMobile: employer.contactMobile ?? "",
    });
  }, [employer]);

  useEffect(() => setAddressForm(address), [address]);

  async function saveAll(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) return;

    const phone = (details.contactPhone ?? "").replace(/\D/g, "");
    const mobile = (details.contactMobile ?? "").replace(/\D/g, "");
    if (!details.legalName.trim() || !details.registrationNumber.trim() || !details.withholdingFileNumber.trim()) {
      toast.error("יש למלא את פרטי המעסיק החובה.");
      return;
    }
    if (!phone && !mobile) {
      toast.error("יש להזין לפחות טלפון או נייד אחד.");
      return;
    }

    setSaving(true);
    try {
      const employerInput: EmployerInput = {
        ...details,
        legalName: details.legalName.trim(),
        registrationNumber: details.registrationNumber.replace(/\D/g, ""),
        withholdingFileNumber: details.withholdingFileNumber.replace(/\D/g, ""),
        contactFirstName: (details.contactFirstName ?? "").trim(),
        contactLastName: (details.contactLastName ?? "").trim(),
        contactPhone: phone,
        contactEmail: (details.contactEmail ?? "").trim(),
        contactMobile: mobile,
      };
      const normalizedAddress = {
        ...addressForm,
        postalCode: addressForm.postalCode.replace(/\D/g, ""),
      };

      const [savedEmployer] = await Promise.all([
        employersApi.updateEmployer(organizationId, employer.id, employerInput),
        employersApi.updateEmployerAddress(organizationId, employer.id, normalizedAddress),
      ]);
      let finalEmployer = savedEmployer;
      if (canManage && status !== employer.status) {
        finalEmployer = await employersApi.updateEmployerStatus(organizationId, employer.id, status);
        await refreshScopeContext();
      }
      onEmployerSaved(finalEmployer);
      onAddressSaved(normalizedAddress);
      toast.success("פרטי המעסיק נשמרו");
    } catch (err) {
      toast.error(errorMessage(err, "שמירת פרטי המעסיק נכשלה"));
    } finally {
      setSaving(false);
    }
  }

  return <section className="card profile-card employer-general-card employer-general-card-compact">
    <div className="card-head">
      <div><h2>פרטים כלליים</h2><span style={{ color: "var(--color-text-muted)" }}>פרטי המעסיק, איש הקשר והכתובת במקום אחד.</span></div>
      <span className={employerStatusBadgeClass(employer.status)}>{employerStatusLabel(employer.status)}</span>
    </div>
    {!canEdit ? <div className="notice notice-info" style={{ marginBottom: 18 }}>הפרטים מוצגים לקריאה בלבד לפי ההרשאה שלך.</div> : null}

    <form className="form" onSubmit={saveAll}>
      <div className="profile-form-section">
        <h3>פרטי מעסיק</h3>
        <div className="grid employer-details-grid">
          <div className="field field-span-2"><label>שם משפטי מלא *</label><UiInput disabled={!canEdit} required maxLength={200} value={details.legalName} onChange={(e) => setDetails({ ...details, legalName: e.target.value })} /></div>
          <div className="field"><label>מספר חברה / עוסק *</label><UiInput disabled={!canEdit} required inputMode="numeric" maxLength={15} value={details.registrationNumber} onChange={(e) => setDetails({ ...details, registrationNumber: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label className="field-label-with-info"><span>תיק ניכויים *</span><Tooltip content="אם אין תיק ניכויים, יש להזין 900000000." /></label><UiInput disabled={!canEdit} required inputMode="numeric" maxLength={9} value={details.withholdingFileNumber} onChange={(e) => setDetails({ ...details, withholdingFileNumber: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>סטטוס מעסיק</label><UiSelect disabled={!canManage} value={status} onChange={(e) => setStatus(Number(e.target.value) as 2 | 4)}>{editableEmployerStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</UiSelect></div>
        </div>
      </div>

      <div className="profile-form-section">
        <h3>איש קשר</h3>
        <div className="grid employer-details-grid">
          <div className="field"><label>שם פרטי *</label><UiInput disabled={!canEdit} maxLength={20} value={details.contactFirstName ?? ""} onChange={(e) => setDetails({ ...details, contactFirstName: e.target.value })} /></div>
          <div className="field"><label>שם משפחה *</label><UiInput disabled={!canEdit} maxLength={20} value={details.contactLastName ?? ""} onChange={(e) => setDetails({ ...details, contactLastName: e.target.value })} /></div>
          <div className="field"><label>טלפון</label><UiInput disabled={!canEdit} inputMode="numeric" maxLength={11} value={details.contactPhone ?? ""} onChange={(e) => setDetails({ ...details, contactPhone: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>נייד</label><UiInput disabled={!canEdit} inputMode="numeric" maxLength={15} value={details.contactMobile ?? ""} onChange={(e) => setDetails({ ...details, contactMobile: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field field-span-2"><label>אימייל *</label><UiInput disabled={!canEdit} required type="email" maxLength={50} value={details.contactEmail ?? ""} onChange={(e) => setDetails({ ...details, contactEmail: e.target.value })} /></div>
        </div>
      </div>

      <div className="profile-form-section">
        <h3>כתובת</h3>
        <div className="grid employer-details-grid">
          <div className="field"><label>יישוב</label><UiInput disabled={!canEdit} maxLength={100} value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} /></div>
          <div className="field"><label>רחוב</label><UiInput disabled={!canEdit} maxLength={100} value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} /></div>
          <div className="field"><label>מספר בית</label><UiInput disabled={!canEdit} maxLength={20} value={addressForm.houseNumber} onChange={(e) => setAddressForm({ ...addressForm, houseNumber: e.target.value })} /></div>
          <div className="field"><label>דירה</label><UiInput disabled={!canEdit} maxLength={20} value={addressForm.apartment} onChange={(e) => setAddressForm({ ...addressForm, apartment: e.target.value })} /></div>
          <div className="field"><label>מיקוד</label><UiInput disabled={!canEdit} inputMode="numeric" maxLength={10} value={addressForm.postalCode} onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="field"><label>תא דואר</label><UiInput disabled={!canEdit} maxLength={20} value={addressForm.postOfficeBox} onChange={(e) => setAddressForm({ ...addressForm, postOfficeBox: e.target.value })} /></div>
        </div>
      </div>

      {canEdit ? <div className="form-actions single-save-action"><span /><button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירת כל הפרטים"}</button></div> : null}
    </form>
  </section>;
}
