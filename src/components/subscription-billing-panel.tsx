"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlphaBillingAccountForm } from "@/components/alpha-billing-account-form";
import { UiInput, UiSelect } from "@/components/ui-controls";
import { PlanUsage } from "@/components/plan-usage";
import { alphaApi, ApiError } from "@/lib/api";
import type { BillingAccountPricingType, EntitlementSnapshot, SelfServiceBillingPricing } from "@/lib/types";

const OPTIONS: { value: BillingAccountPricingType; title: string; description: string }[] = [
  { value: "Free", title: "חינם", description: "מעסיק אחד, משתמש אחד ועד 3 עובדים פעילים." },
  { value: "PerEmployee", title: "עמלה פר עובד", description: "חיוב לפי מספר העובדים. ללא מגבלת משתמשים, מעסיקים או עובדים." },
  { value: "PerReportRow", title: "עמלה פר שורה", description: "חיוב לפי שורות הדיווח. ללא מגבלת משתמשים, מעסיקים או עובדים." },
];

export function SubscriptionBillingPanel({ organizationId, employerId, entitlements, canManage, onChanged, showBillingAccount = true }: {
  organizationId: string;
  employerId?: string;
  entitlements: EntitlementSnapshot;
  canManage: boolean;
  onChanged: () => Promise<void>;
  showBillingAccount?: boolean;
}) {
  const [pricing, setPricing] = useState<SelfServiceBillingPricing | null>(null);
  const [selected, setSelected] = useState<BillingAccountPricingType>("Free");
  const [saving, setSaving] = useState(false);

  async function loadPricing() {
    const value = employerId
      ? await alphaApi.employerSelfServicePricing(organizationId, employerId)
      : await alphaApi.organizationSelfServicePricing(organizationId);
    setPricing(value);
    setSelected(value.billingType);
  }

  useEffect(() => { void loadPricing().catch(() => setPricing(null)); }, [organizationId, employerId]);

  async function savePricing() {
    if (!canManage || !pricing || selected === pricing.billingType) return;
    setSaving(true);
    try {
      if (employerId) await alphaApi.updateEmployerSelfServicePricing(organizationId, employerId, selected);
      else await alphaApi.updateOrganizationSelfServicePricing(organizationId, selected);
      await loadPricing();
      await onChanged();
      toast.success("התוכנית ופרטי החיוב נשמרו");
    } catch (err) {
      if (err instanceof ApiError && err.problem?.error === "free_plan_limits_exceeded") {
        toast.error("לא ניתן לעבור לתוכנית החינמית", { description: "נדרש מעסיק אחד, משתמש אחד ועד 3 עובדים פעילים. יש לצמצם את השימוש או ליצור קשר עם התמיכה.", duration: 9000 });
      } else if (err instanceof ApiError && (err.problem?.error === "billing_account_required" || err.problem?.error === "billing_payment_method_invalid")) {
        toast.error("לא ניתן לשנות לתוכנית בתשלום", { description: "יש להגדיר ולאמת קודם חשבון ואמצעי תשלום תקינים לחיוב ALPHA.", duration: 9000 });
      } else {
        toast.error(err instanceof Error ? err.message : "שמירת התוכנית נכשלה");
      }
    } finally {
      setSaving(false);
    }
  }

  const price = pricing?.unitPrice ?? 0;
  return <div className="employer-profile-stack">
    <section className="card profile-card">
      <div className="card-head"><div><h2>מנוי וחיוב ALPHA</h2><span style={{ color: "var(--muted)" }}>בחרו את שיטת החיוב. בתוכנית בתשלום אין מגבלת משתמשים, מעסיקים או עובדים.</span></div></div>

      {pricing?.billingType === "Free" ? <div className="grid stats">
        <PlanUsage label="מעסיקים" usage={entitlements.employers} />
        <PlanUsage label="עובדים פעילים" usage={entitlements.activeEmployees} />
        <PlanUsage label="משתמשים" usage={entitlements.users} />
      </div> : null}

      <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 14, marginTop: 18 }}>
        <label className="field">
          <span>סוג התוכנית</span>
          <UiSelect value={selected} disabled={!canManage || saving} onChange={(event) => setSelected(event.target.value as BillingAccountPricingType)}>
            {OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.title}</option>)}
          </UiSelect>
        </label>
        {selected !== "Free" ? <label className="field">
          <span>{selected === "PerEmployee" ? "תעריף לעובד" : "תעריף לשורה"}</span>
          <UiInput disabled value={pricing ? String(selected === "PerEmployee" ? pricing.employeeUnitPrice : pricing.rowUnitPrice) : ""} />
          <small style={{ color: "var(--muted)" }}>₪ {selected === "PerEmployee" ? "לעובד" : "לשורה"} · התעריף נקבע על ידי ALPHA. לשינוי יש ליצור קשר עם התמיכה.</small>
        </label> : null}
      </div>
      <div className="notice notice-info" style={{ marginTop: 16 }}>התעריף נקבע לפי התמחור שהוגדר עבורכם במערכת. אם התעריף אינו תואם למה שסוכם, יש ליצור קשר עם התמיכה.</div>
      {!canManage ? <div className="notice notice-info" style={{ marginTop: 12 }}>אין לך הרשאה לשנות את התוכנית.</div> : null}
      {!showBillingAccount && canManage ? <div className="form-actions"><span /><button className="btn btn-primary" type="button" disabled={saving || !pricing || selected === pricing.billingType} onClick={() => void savePricing()}>{saving ? "שומר..." : "שמירת תוכנית וחיוב"}</button></div> : null}
    </section>

    {showBillingAccount ? <AlphaBillingAccountForm organizationId={organizationId} employerId={employerId} canManage={canManage} onSaved={async () => { await savePricing(); }} /> : null}
  </div>;
}
