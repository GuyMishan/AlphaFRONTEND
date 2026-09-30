"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppModal } from "@/components/app-modal";
import { UiAutocomplete } from "@/components/ui-controls";
import { alphaApi } from "@/lib/api";
import { invalidateScopeContext } from "@/lib/app-data-cache";
import type { Organization, ScopeEmployer } from "@/lib/types";

type TransferCandidate = ScopeEmployer & { sourceName: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onTransferred: (targetOrganizationId: string) => void | Promise<void>;
  employer?: ScopeEmployer;
  /** When set, transfers an employer from any other organization INTO this one. */
  receiveIntoOrganizationId?: string;
};

export function EmployerTransferModal({
  open, onClose, onTransferred, employer, receiveIntoOrganizationId,
}: Props) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [candidates, setCandidates] = useState<TransferCandidate[]>([]);
  const [employerLabel, setEmployerLabel] = useState("");
  const [targetLabel, setTargetLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmployerLabel("");
    setTargetLabel("");
    setLoading(true);
    Promise.all([alphaApi.organizations(), alphaApi.scope()])
      .then(([orgRows, scope]) => {
        setOrganizations(orgRows);
        setCandidates(scope.organizations
          .filter((org) => !receiveIntoOrganizationId || org.id !== receiveIntoOrganizationId)
          .flatMap((org) => org.employers.map((item) => ({ ...item, sourceName: org.name }))));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "טעינת המעסיקים והארגונים נכשלה"))
      .finally(() => setLoading(false));
  }, [open, receiveIntoOrganizationId]);

  const employerOptions = useMemo(() => candidates.map((item) => ({
    value: item.id,
    label: `${item.legalName} · ${item.registrationNumber} · ${item.sourceName}`,
  })), [candidates]);
  const selectedEmployer = employer ?? candidates.find((item) =>
    employerOptions.find((option) => option.value === item.id)?.label === employerLabel);
  const targetOptions = useMemo(() => organizations.filter((item) =>
    item.id !== selectedEmployer?.organizationId).map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.id.slice(0, 8)}`,
  })), [organizations, selectedEmployer?.organizationId]);
  const selectedTarget = receiveIntoOrganizationId
    ? organizations.find((item) => item.id === receiveIntoOrganizationId)
    : organizations.find((item) => targetOptions.find((option) =>
      option.value === item.id)?.label === targetLabel);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedEmployer || !selectedTarget || saving || loading) return;
    setSaving(true);
    try {
      await alphaApi.transferEmployer(
        selectedEmployer.organizationId, selectedEmployer.id, selectedTarget.id);
      invalidateScopeContext();
      toast.success(`המעסיק הועבר בהצלחה לארגון ${selectedTarget.name}`);
      onClose();
      await onTransferred(selectedTarget.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "העברת המעסיק נכשלה");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return <AppModal open title={receiveIntoOrganizationId ? "שיוך מעסיק קיים לארגון" : "העברת מעסיק לארגון אחר"}
    subtitle="ההעברה מנתקת את המעסיק מארגון המקור, כולל ההרשאות הארגוניות הקודמות."
    onClose={onClose} closeDisabled={saving} closeOnBackdrop={!saving}
    actions={<>
      <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>ביטול</button>
      <button type="submit" form="employer-transfer-form" className="btn btn-primary"
        disabled={loading || saving || !selectedEmployer || !selectedTarget || selectedEmployer.organizationId === selectedTarget.id}>
        {saving ? "מעביר..." : "אישור העברה מלאה"}
      </button>
    </>}>
    <form id="employer-transfer-form" className="form" onSubmit={submit}>
      {employer ? <p><strong>מעסיק:</strong> {employer.legalName}</p> :
        <div className="field">
          <label>בחירת מעסיק להעברה</label>
          <UiAutocomplete ariaLabel="בחירת מעסיק להעברה" value={employerLabel}
            onValueChange={setEmployerLabel} loading={loading}
            options={employerOptions.filter((item) => item.label.toLowerCase().includes(employerLabel.toLowerCase())).slice(0, 70)}
            placeholder="חיפוש לפי מעסיק, ח.פ. או ארגון" />
        </div>}
      {receiveIntoOrganizationId
        ? <div className="notice notice-info">ארגון יעד: {selectedTarget?.name ?? "טוען..."}</div>
        : <div className="field">
            <label>ארגון יעד</label>
            <UiAutocomplete ariaLabel="ארגון יעד" value={targetLabel}
              onValueChange={setTargetLabel} loading={loading}
              options={targetOptions.filter((item) => item.label.toLowerCase().includes(targetLabel.toLowerCase())).slice(0, 70)}
              placeholder="חיפוש ארגון יעד" />
          </div>}
      <div className="notice notice-info">
        אם קיימת זהות עובד זהה בארגון היעד, או אם ההעברה חורגת ממגבלות המסלול, הפעולה תיחסם.
        חיובים היסטוריים שבוצעו לא יימחקו ולא ישונו.
      </div>
    </form>
  </AppModal>;
}
