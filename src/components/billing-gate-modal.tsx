"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Building2, CreditCard, House, X } from "lucide-react";
import type { BillingGateStatus } from "@/lib/types";

function messageForGate(gate: BillingGateStatus) {
  if (gate.error === "billing_account_required")
    return "לא הוגדרו עדיין פרטי חיוב עבור החשבון שמחויב על השימוש במערכת.";
  if (gate.error === "billing_payment_method_not_active")
    return "פרטי החיוב קיימים, אבל אמצעי התשלום עדיין אינו פעיל.";
  if (gate.error === "billing_payment_method_reference_required")
    return "אמצעי התשלום עדיין לא הושלם ולכן אי אפשר להמשיך למסך הזה.";
  return "פרטי החיוב אינם מוכנים עדיין ולכן אי אפשר להמשיך למסך הזה.";
}

export function BillingGateModal({
  gate,
  organizationId,
  employerId,
  canManageOrganizationBilling,
  canManageEmployerBilling,
  onClose,
}: {
  gate: BillingGateStatus;
  organizationId: string;
  employerId: string;
  canManageOrganizationBilling: boolean;
  canManageEmployerBilling: boolean;
  onClose?: () => void;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const employerBillingHref = `/employers/${employerId}?organizationId=${organizationId}&tab=billing`;
  const organizationBillingHref = `/organizations/${organizationId}?tab=billing`;
  const hasBillingAction = canManageOrganizationBilling || canManageEmployerBilling;

  return (
    <div className="billing-gate-backdrop" role="presentation">
      <section className="billing-gate-modal" role="dialog" aria-modal="true" aria-labelledby="billing-gate-title" aria-describedby="billing-gate-description">
        {onClose ? <button type="button" className="billing-gate-close" onClick={onClose} aria-label="סגירה"><X size={20} /></button> : null}\n        <div className="billing-gate-icon"><AlertTriangle size={26} /></div>
        <h2 id="billing-gate-title">נדרשת השלמת פרטי חיוב</h2>
        <p id="billing-gate-description">{messageForGate(gate)}</p>
        {gate.billedThroughName ? <div className="billing-gate-source">החיוב עבור המעסיק מתבצע דרך <b>{gate.billedThroughName}</b>.</div> : null}

        {canManageOrganizationBilling ? <div className="billing-gate-choice-copy">
          יש לך הרשאה לנהל את החיוב ברמת הארגון. אפשר להגדיר פרטי חיוב מרכזיים לארגון או להגדיר חיוב עצמאי למעסיק הזה.
        </div> : null}

        {!canManageOrganizationBilling && canManageEmployerBilling ? <div className="billing-gate-choice-copy">
          יש להשלים את פרטי החיוב של המעסיק כדי להמשיך.
        </div> : null}

        {!hasBillingAction ? <div className="notice notice-info billing-gate-permission-note">
          אין לך הרשאה לעדכן פרטי חיוב. יש לפנות למנהל הארגון או למנהל המעסיק.
        </div> : null}

        <div className="billing-gate-actions">
          {canManageOrganizationBilling ? <Link className="btn btn-primary" href={organizationBillingHref}><Building2 size={17} />לפרטי החיוב של הארגון</Link> : null}
          {canManageEmployerBilling ? <Link className={canManageOrganizationBilling ? "btn btn-secondary" : "btn btn-primary"} href={employerBillingHref}><CreditCard size={17} />להגדיר חיוב למעסיק הזה</Link> : null}
          {onClose ? <button type="button" className="btn btn-secondary" onClick={onClose}>המשך מאוחר יותר</button> : <Link className="btn btn-secondary" href="/dashboard"><House size={17} />חזרה לדף הבית</Link>}
        </div>
      </section>
    </div>
  );
}
