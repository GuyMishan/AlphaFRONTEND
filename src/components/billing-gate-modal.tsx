"use client";

import Link from "next/link";
import { AlertTriangle, Building2, CreditCard, House } from "lucide-react";
import { AppModal } from "@/components/app-modal";
import type { BillingGateStatus } from "@/lib/types";

function messageForGate(gate: BillingGateStatus) {
  if (gate.error === "pension_payment_account_required") return "לא הוגדר אמצעי תשלום פנסיוני. יש להגדיר חשבון לתשלום ההפקדות לפני המשך הדיווח.";
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
  const employerBillingHref = `/employers/${employerId}?organizationId=${organizationId}&tab=pension-payment`;
  const organizationBillingHref = `/organizations/${organizationId}?tab=pension-payment`;
  const hasBillingAction = canManageOrganizationBilling || canManageEmployerBilling;

  return (
    <AppModal title="נדרשת השלמת אמצעי תשלום פנסיוני" onClose={onClose} width="md">
        <div className="billing-gate-icon"><AlertTriangle size={26} /></div>
        <p id="billing-gate-description">{messageForGate(gate)}</p>
        {gate.billedThroughName ? <div className="billing-gate-source">החיוב עבור המעסיק מתבצע דרך <b>{gate.billedThroughName}</b>.</div> : null}

        {canManageOrganizationBilling ? <div className="billing-gate-choice-copy">
          יש לך הרשאה לנהל את החיוב ברמת הארגון. אפשר להגדיר אמצעי תשלום פנסיוני מרכזי לארגון או אמצעי תשלום פנסיוני עצמאי למעסיק הזה.
        </div> : null}

        {!canManageOrganizationBilling && canManageEmployerBilling ? <div className="billing-gate-choice-copy">
          יש להשלים את אמצעי התשלום הפנסיוני של המעסיק כדי להמשיך.
        </div> : null}

        {!hasBillingAction ? <div className="notice notice-info billing-gate-permission-note">
          אין לך הרשאה לעדכן אמצעי תשלום פנסיוני. יש לפנות למנהל הארגון או למנהל המעסיק.
        </div> : null}

        <div className="billing-gate-actions">
          {canManageOrganizationBilling ? <Link className="btn btn-primary" href={organizationBillingHref}><Building2 size={17} />להגדרת תשלום פנסיוני בארגון</Link> : null}
          {canManageEmployerBilling ? <Link className={canManageOrganizationBilling ? "btn btn-secondary" : "btn btn-primary"} href={employerBillingHref}><CreditCard size={17} />להגדרת תשלום פנסיוני למעסיק</Link> : null}
          {onClose ? <button type="button" className="btn btn-secondary" onClick={onClose}>המשך מאוחר יותר</button> : <Link className="btn btn-secondary" href="/dashboard"><House size={17} />חזרה לדף הבית</Link>}
        </div>
    </AppModal>
  );
}
