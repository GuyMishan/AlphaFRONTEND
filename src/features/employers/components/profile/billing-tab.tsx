"use client";

import { useEffect, useState } from "react";
import { Building2, CreditCard, Save } from "lucide-react";
import { toast } from "sonner";
import { AlphaBillingAccountForm } from "@/features/billing/components/alpha-billing-account-form";
import { billingApi } from "@/features/billing/api";
import { employersApi } from "@/features/employers/api";
import type { EmployerBillingResolution } from "@/features/billing/types";
import type { Employer, EmployerProfileCenterSettings } from "@/features/employers/types";
import { UiChoiceCard } from "@/components/ui/ui-controls";
import { Tooltip } from "@/components/ui/tooltip";

export function EmployerBillingInheritanceTab({ organizationId, employer, canManageEmployer, billing, hasOrganizationContext, onModeSaved }: {
  organizationId: string;
  employer: Employer;
  canManageEmployer: boolean;
  billing: EmployerProfileCenterSettings["billing"];
  hasOrganizationContext: boolean;
  onModeSaved: (value: EmployerProfileCenterSettings["billing"]) => void;
}) {
  const [resolution, setResolution] = useState<EmployerBillingResolution | null>(null);
  const [selectedMode, setSelectedMode] = useState<1 | 2 | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadResolution() {
    setLoading(true);
    try {
      const value = await billingApi.employerBillingResolution(organizationId, employer.id);
      setResolution(value);
      setSelectedMode(value.source === "Organization" ? 2 : 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת הגדרת החיוב נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadResolution(); }, [organizationId, employer.id]);

  async function persistMode(nextMode: 1 | 2) {
    if (!billing.canChangeMode) return;
    setSavingMode(true);
    try {
      const result = await employersApi.updateEmployerBilling(organizationId, employer.id, nextMode);
      const nextBilling = { ...billing, mode: result.billingMode, modeOverridden: true };
      onModeSaved(nextBilling);
      setSelectedMode(result.billingMode);
      await loadResolution();
      toast.success("אופן החיוב של המעסיק נשמר");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת אופן החיוב נכשלה");
    } finally {
      setSavingMode(false);
    }
  }

  if (loading || !resolution) return <div className="empty">טוען הגדרות חיוב...</div>;

  const organizationAvailable = resolution.organizationAccount.configured;

  return <section className="card profile-payment-card payment-horizontal-shell">
    <div className="card-head">
      <div><h2>חיוב ALPHA</h2><span style={{ color: "var(--muted)" }}>בחרו אם החיוב של המעסיק מתבצע דרך הארגון או באמצעות פרטי חיוב עצמאיים.</span></div>
      {billing.modeOverridden && resolution.effectiveAccount.configured ? <span className={resolution.source === "Organization" ? "badge badge-blue" : "badge badge-green"}>{resolution.source === "Organization" ? "פעיל: חיוב ארגוני" : "פעיל: חיוב מעסיק"}</span> : null}
    </div>

    <div className="payment-horizontal-layout">
      <aside className="payment-source-column">
        {hasOrganizationContext ?         <UiChoiceCard
          compact
          disabled={!billing.canChangeMode || !organizationAvailable}
          selected={selectedMode === 2}
          onClick={() => setSelectedMode(2)}
          tooltip={organizationAvailable ? "קיימים פרטי חיוב ארגוניים זמינים למעסיק הזה" : "לא קיימים פרטי חיוב ארגוניים זמינים"}
        >
          <Building2 size={22} />
          <b>חיוב דרך הארגון</b>
          <p>{organizationAvailable ? "שימוש בפרטי החיוב המרכזיים של הארגון." : "לא הוגדרו עדיין פרטי חיוב בארגון."}</p>
          {organizationAvailable ? <Tooltip content="קיימים פרטי חיוב ארגוניים זמינים למעסיק הזה"><span className="option-hint">ⓘ קיים חיוב ארגוני</span></Tooltip> : null}
        </UiChoiceCard> : null}

        <UiChoiceCard
          compact
          disabled={!billing.canChangeMode}
          selected={selectedMode === 1}
          onClick={() => setSelectedMode(1)}
        >
          <CreditCard size={22} />
          <b>חיוב עצמאי למעסיק</b>
          <p>פרטי חיוב ואמצעי תשלום נפרדים למעסיק הזה.</p>
        </UiChoiceCard>

        {!billing.canChangeMode ? <small className="permission-hint">אין לך הרשאה לשנות את אופן החיוב.</small> : null}
      </aside>

      <div className="payment-details-column">
        {selectedMode === null ? <div className="payment-placeholder">
          <CreditCard size={30} />
          <b>בחרו מקור לחיוב</b>
          <span>לא נשמר שינוי עד להשלמת הפרטים ולחיצה על שמירה.</span>
        </div> : null}

        {selectedMode === 2 && organizationAvailable ? <>
          <div className="account-context-head">
            <div><span>מקור החיוב</span><strong>הארגון</strong><small>{resolution.billedThroughName}</small></div>
            <span className={resolution.organizationAccount.paymentMethodStatus === 3 ? "badge badge-green" : "badge badge-gray"}>{billingPaymentStatusLabel(resolution.organizationAccount.paymentMethodStatus)}</span>
          </div>
          <div className="grid compact-billing-summary">
            <span><b>שם לחיוב</b><small>{resolution.organizationAccount.billingName || "—"}</small></span>
            <span><b>ח.פ. / עוסק</b><small>{resolution.organizationAccount.taxId || "—"}</small></span>
            <span><b>אימייל לחשבוניות</b><small>{resolution.organizationAccount.invoiceEmail || "—"}</small></span>
            <span><b>אמצעי תשלום</b><small>{resolution.organizationAccount.paymentMethodType === 1 ? "כרטיס אשראי" : "הרשאה לחיוב חשבון"}</small></span>
          </div>
          {billing.canChangeMode ? <div className="form-actions"><span /><button className="btn btn-primary" type="button" disabled={savingMode} onClick={() => void persistMode(2)}><Save size={17} />{savingMode ? "שומר..." : "שמירת בחירה"}</button></div> : null}
        </> : null}

        {selectedMode === 1 ? <AlphaBillingAccountForm
          organizationId={organizationId}
          employerId={employer.id}
          canManage={canManageEmployer}
          embedded
          showOwnerContext={false}
          onSaved={async () => { await persistMode(1); }}
        /> : null}
      </div>
    </div>
  </section>;
}
export function billingPaymentStatusLabel(status: number) {
  if (status === 2) return "ממתין";
  if (status === 3) return "פעיל";
  if (status === 4) return "נכשל";
  if (status === 5) return "מושהה";
  if (status === 6) return "בוטל";
  return "לא הוגדר";
}
