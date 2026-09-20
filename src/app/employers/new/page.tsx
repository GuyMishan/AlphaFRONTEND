"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmployerForm } from "@/components/employer-form";
import { alphaApi } from "@/lib/api";
import { getOrganizationSelection } from "@/lib/session";

export default function NewEmployerPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [canCreateEmployer, setCanCreateEmployer] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [limitText, setLimitText] = useState("");
  const [scopeResolved, setScopeResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrganizationScope(orgId: string) {
    setOrganizationId(orgId);
    setScopeResolved(true);
    setError("");

    if (!orgId) {
      setCanCreateEmployer(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [capabilities, entitlements] = await Promise.all([
        alphaApi.capabilities(orgId),
        alphaApi.entitlements(orgId),
      ]);
      setCanCreateEmployer(capabilities.canCreateEmployer);
      const reached = entitlements.employers.current >= entitlements.employers.maximum;
      setLimitReached(reached);
      setLimitText(`מסלול ${entitlements.plan.name}: ${entitlements.employers.current}/${entitlements.employers.maximum} מעסיקים`);
    } catch (err) {
      setCanCreateEmployer(false);
      setError(err instanceof Error ? err.message : "טעינת ההרשאות נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get("organizationId") || getOrganizationSelection() || "";
    void loadOrganizationScope(orgId);

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId: string }>).detail;
      void loadOrganizationScope(detail.organizationId);
    };
    window.addEventListener("alpha:scope-change", handler);
    return () => window.removeEventListener("alpha:scope-change", handler);
  }, []);

  return <AppShell title="הקמת מעסיק">
    <div className="page-head"><div><h1>הקמת מעסיק</h1><p>בחרו ארגון בסרגל העליון והזינו את פרטי המעסיק.</p></div></div>
    {!scopeResolved || loading ? <div className="empty">טוען הרשאות...</div>
      : error ? <div className="notice notice-error">{error}</div>
      : !organizationId ? <div className="empty">בחרו ארגון כדי להתחיל בהקמת המעסיק.</div>
      : !canCreateEmployer ? <div className="notice notice-info">אין לך הרשאה להקים מעסיק חדש בארגון הזה.</div>
      : limitReached ? <div className="notice notice-info"><b>הגעתם למגבלת המסלול</b><div>{limitText}</div></div>
      : <EmployerForm organizationId={organizationId} />}
  </AppShell>;
}
