"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, CreditCard, House } from "lucide-react";
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
}: {
  gate: BillingGateStatus;
  organizationId: string;
  employerId: string;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const billingHref = employerId
    ? `/employers/${employerId}?organizationId=${organizationId}&tab=billing`
    : `/organizations/${organizationId}?tab=billing`;

  return (
    <div className="billing-gate-backdrop" role="presentation">
      <section className="billing-gate-modal" role="dialog" aria-modal="true" aria-labelledby="billing-gate-title" aria-describedby="billing-gate-description">
        <div className="billing-gate-icon"><AlertTriangle size={26} /></div>
        <h2 id="billing-gate-title">נדרשת השלמת פרטי חיוב</h2>
        <p id="billing-gate-description">{messageForGate(gate)}</p>
        {gate.billedThroughName ? <div className="billing-gate-source">החיוב עבור המעסיק מתבצע דרך <b>{gate.billedThroughName}</b>.</div> : null}
        <div className="billing-gate-actions">
          <Link className="btn btn-primary" href={billingHref}><CreditCard size={17} />לפרטי החיוב</Link>
          <Link className="btn btn-secondary" href="/dashboard"><House size={17} />חזרה לדף הבית</Link>
        </div>
      </section>
    </div>
  );
}
