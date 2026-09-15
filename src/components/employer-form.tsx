"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Save } from "lucide-react";
import { alphaApi } from "@/lib/api";
import type { Employer, EmployerInput } from "@/lib/types";
import { validateEmployerInput } from "@/lib/validation";

export function EmployerForm({ organizationId, employer, editable = true }: { organizationId: string; employer?: Employer; editable?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<EmployerInput>({ legalName: employer?.legalName ?? "", registrationNumber: employer?.registrationNumber ?? "", withholdingFileNumber: employer?.withholdingFileNumber ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const title = employer ? employer.legalName : "מעסיק חדש";
  function update(key: keyof EmployerInput, value: string) { setForm((current) => ({ ...current, [key]: value })); setError(""); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editable) return;
    const normalized = { ...form, legalName: form.legalName.trim(), registrationNumber: form.registrationNumber.trim(), withholdingFileNumber: form.withholdingFileNumber.trim() };
    const errors = validateEmployerInput(normalized);
    if (errors.length) { setError(errors.join(" ")); return; }
    setSaving(true); setError("");
    try {
      const saved = employer ? await alphaApi.updateEmployer(organizationId, employer.id, normalized) : await alphaApi.createEmployer(organizationId, normalized);
      router.push(`/employers/${saved.id}?organizationId=${organizationId}`);
    } catch (err) { setError(err instanceof Error ? err.message : "שמירת המעסיק נכשלה"); }
    finally { setSaving(false); }
  }
  return <div className="card profile-card"><div className="profile-summary"><div className="profile-avatar"><Building2 /></div><div><h2 style={{ margin: 0 }}>{title}</h2><span style={{ color: "var(--muted)" }}>{employer ? editable ? "עריכת פרופיל מעסיק" : "צפייה בפרופיל מעסיק" : "הקמת מעסיק חדש בארגון"}</span></div></div>{!editable && employer ? <div className="notice notice-info" style={{ marginBottom: 18 }}>יש לך הרשאת צפייה במעסיק הזה, ללא הרשאת עריכה.</div> : null}{error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}<form className="form" onSubmit={submit} noValidate><div className="field"><label>שם משפטי מלא *</label><input required minLength={2} maxLength={200} disabled={!editable} value={form.legalName} onChange={(event) => update("legalName", event.target.value)} /></div><div className="grid two-cols"><div className="field"><label>מספר חברה / עוסק *</label><input required disabled={!editable} inputMode="numeric" maxLength={15} value={form.registrationNumber} onChange={(event) => update("registrationNumber", event.target.value.replace(/\D/g, "").slice(0, 15))} /></div><div className="field"><label>מספר תיק ניכויים *</label><input required disabled={!editable} inputMode="numeric" maxLength={15} value={form.withholdingFileNumber} onChange={(event) => update("withholdingFileNumber", event.target.value.replace(/\D/g, "").slice(0, 15))} /></div></div>{employer ? <div className="field"><label>סטטוס</label><input disabled value={employer.status === 2 ? "פעיל" : "בתהליך הקמה"} /></div> : null}<div className="form-actions"><Link className="btn btn-secondary" href="/employers">חזרה</Link>{editable ? <button className="btn btn-primary" disabled={saving} type="submit"><Save size={18} />{saving ? "שומר..." : employer ? "שמירת שינויים" : "הקמת מעסיק"}</button> : null}</div></form></div>;
}