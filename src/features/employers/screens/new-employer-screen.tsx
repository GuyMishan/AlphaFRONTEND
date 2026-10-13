"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/features/shell/components/app-shell";
import { EmployerForm } from "@/features/employers/components/employer-form";
import { useEntitlements } from "@/features/billing/queries";
import { useOrganizationCapabilities } from "@/features/organizations/queries";
import { errorMessage } from "@/lib/api/error-messages";
import { getOrganizationSelection } from "@/lib/session/storage";
import { openUpgradeDialog } from "@/features/billing/upgrade";
import { subscribeToScopeChanges } from "@/features/scope/scope-events";

function initialOrganizationId() {
  return new URLSearchParams(window.location.search).get("organizationId") || getOrganizationSelection() || "";
}

export default function NewEmployerPage() {
  const [scopeResolved, setScopeResolved] = useState(false);
  const [organizationId, setOrganizationId] = useState("");
  useEffect(() => {
    setOrganizationId(initialOrganizationId());
    setScopeResolved(true);
    return subscribeToScopeChanges((detail) => setOrganizationId(detail.organizationId));
  }, []);

  const capabilities = useOrganizationCapabilities(organizationId);
  const entitlementsQuery = useEntitlements(organizationId);
  const loading = Boolean(organizationId) && (capabilities.isPending || entitlementsQuery.isPending);
  const failure = capabilities.error ?? entitlementsQuery.error;
  const error = failure ? errorMessage(failure, "טעינת ההרשאות נכשלה") : "";
  const canCreateEmployer = !failure && Boolean(capabilities.data?.canCreateEmployer);
  const entitlements = entitlementsQuery.data;

  return <AppShell title="הקמת מעסיק">
    <div className="page-head"><div><h1>הקמת מעסיק</h1><p>בחרו ארגון בסרגל העליון והזינו את פרטי המעסיק.</p></div></div>
    {!scopeResolved || loading ? <div className="empty">טוען הרשאות...</div>
      : error ? <div className="notice notice-error">{error}</div>
      : !organizationId ? <div className="empty">בחרו ארגון כדי להתחיל בהקמת המעסיק.</div>
      : !canCreateEmployer ? <div className="notice notice-info">אין לך הרשאה להקים מעסיק חדש בארגון הזה.</div>
      : entitlements ? <>{entitlements.employers.maximum !== null && entitlements.employers.current >= entitlements.employers.maximum ? <div className="notice notice-info"><b>הגעתם למגבלת המעסיקים במסלול.</b><div style={{ marginTop: 10 }}><button className="btn btn-primary" type="button" onClick={() => openUpgradeDialog({ reason: "employers", planName: entitlements.plan.name, current: entitlements.employers.current, maximum: entitlements.employers.maximum ?? undefined })}>יצירת קשר לשדרוג</button></div></div> : <EmployerForm organizationId={organizationId} />}</>
      : <EmployerForm organizationId={organizationId} />}
  </AppShell>;
}
