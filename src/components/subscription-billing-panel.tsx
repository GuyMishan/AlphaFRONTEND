"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlphaBillingAccountForm } from "@/components/alpha-billing-account-form";
import { PlanUsage } from "@/components/plan-usage";
import { alphaApi, ApiError } from "@/lib/api";
import type { EntitlementSnapshot, SelfServiceSubscriptionPlan, SubscriptionSummary } from "@/lib/types";

export function SubscriptionBillingPanel({ organizationId, employerId, subscription, entitlements, canManage, onChanged, showBillingAccount = true }: {
  organizationId: string;
  employerId?: string;
  subscription: SubscriptionSummary;
  entitlements: EntitlementSnapshot;
  canManage: boolean;
  onChanged: () => Promise<void>;
  showBillingAccount?: boolean;
}) {
  const [plans, setPlans] = useState<SelfServiceSubscriptionPlan[]>([]);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    alphaApi.subscriptionPlans(organizationId).then(setPlans).catch(() => setPlans([]));
  }, [organizationId]);

  async function changePlan(plan: SelfServiceSubscriptionPlan) {
    if (!canManage || plan.id === subscription.planId) return;
    setChanging(true);
    try {
      await alphaApi.changeSubscriptionPlan(organizationId, plan.id);
      toast.success(`התוכנית שונתה ל${plan.name}`);
      await onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.problem?.error === "plan_downgrade_limits_exceeded") {
        toast.error("לא ניתן לעבור לתוכנית החינמית", {
          description: "כדי לעבור לחינם יש לעמוד במגבלות: מעסיק אחד, משתמש אחד ועד 3 עובדים פעילים. יש לצמצם את השימוש או ליצור קשר עם התמיכה.",
          duration: 9000,
        });
      } else {
        toast.error(err instanceof Error ? err.message : "שינוי התוכנית נכשל");
      }
    } finally {
      setChanging(false);
    }
  }

  const money = (value: number | null) => value == null ? "לא מוגדר" : `₪${value.toLocaleString("he-IL")}`;

  return <div className="employer-profile-stack">
    <section className="card profile-card">
      <div className="card-head">
        <div><h2>מנוי וחיוב ALPHA</h2><span style={{ color: "var(--muted)" }}>התוכנית, התעריפים ואמצעי התשלום במקום אחד.</span></div>
        <span className={subscription.isActive ? "badge badge-green" : "badge badge-gray"}>{subscription.isActive ? "פעיל" : "לא פעיל"}</span>
      </div>

      <div className="grid stats">
        <PlanUsage label="מעסיקים" usage={entitlements.employers} />
        <PlanUsage label="עובדים פעילים" usage={entitlements.activeEmployees} />
        <PlanUsage label="משתמשים" usage={entitlements.users} />
      </div>

      <div className="profile-form-section" style={{ marginTop: 22 }}>
        <h3>התוכנית שלך</h3>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {plans.map((plan) => <button key={plan.id} type="button" className={`card ${plan.id === subscription.planId ? "selected" : ""}`} style={{ textAlign: "right", cursor: canManage ? "pointer" : "default" }} disabled={!canManage || changing || plan.id === subscription.planId} onClick={() => void changePlan(plan)}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><b>{plan.name}</b>{plan.id === subscription.planId ? <span className="badge badge-green">נוכחית</span> : null}</div>
            <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>פר עובד: <b>{money(plan.employeeUnitPrice)}</b> · פר שורה: <b>{money(plan.rowUnitPrice)}</b></div>
            <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>עד {plan.maxEmployers} מעסיקים · עד {plan.maxEmployees} עובדים · עד {plan.maxUsers} משתמשים</div>
          </button>)}
        </div>
        <div className="notice notice-info" style={{ marginTop: 16 }}>התעריפים המוצגים הם התעריפים המוגדרים במערכת. אם התעריפים שסוכמו איתכם שונים, אין לבצע שינוי ויש ליצור קשר עם התמיכה.</div>
        {!canManage ? <div className="notice notice-info" style={{ marginTop: 12 }}>אין לך הרשאה לשנות תוכנית.</div> : null}
      </div>
    </section>

    {showBillingAccount ? <AlphaBillingAccountForm organizationId={organizationId} employerId={employerId} canManage={canManage} /> : null}
  </div>;
}
