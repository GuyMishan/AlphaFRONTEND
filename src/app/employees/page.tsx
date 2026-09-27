"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmployerEmployeesPanel } from "@/components/employer-employees-panel";
import { alphaApi } from "@/lib/api";
import { getEmployerSelection } from "@/lib/session";
import type { Employer, EntitlementSnapshot } from "@/lib/types";

export default function EmployeesPage() {
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [canCreateEmployee, setCanCreateEmployee] = useState(false);
  const [entitlements, setEntitlements] = useState<EntitlementSnapshot | null>(null);

  async function loadScope(orgId: string, empId: string) {
    if (!orgId || !empId) {
      setEmployer(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [employerItem, capabilities, entitlementSnapshot] = await Promise.all([
        alphaApi.employer(orgId, empId),
        alphaApi.employerCapabilities(orgId, empId),
        alphaApi.entitlements(orgId),
      ]);
      setEmployer(employerItem);
      setCanCreateEmployee(capabilities.canCreateEmployee);
      setEntitlements(entitlementSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת המעסיק נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const selected = getEmployerSelection();
    if (selected) {
      setOrganizationId(selected.organizationId);
      setEmployerId(selected.employerId);
      void loadScope(selected.organizationId, selected.employerId);
    } else {
      setLoading(false);
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId: string; employerId?: string }>).detail;
      if (!detail.employerId) return;
      setOrganizationId(detail.organizationId);
      setEmployerId(detail.employerId);
      void loadScope(detail.organizationId, detail.employerId);
    };
    window.addEventListener("alpha:scope-change", handler);
    return () => window.removeEventListener("alpha:scope-change", handler);
  }, []);

  return <AppShell title="עובדים">
    {loading ? <div className="empty">טוען עובדים...</div> : error ? <div className="notice notice-error">{error}</div> : employer && organizationId && employerId
      ? <>
          {entitlements?.plan.code?.toLowerCase() === "free" ? <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>שימוש במסלול Free</div>
            <div>עובדים פעילים <strong>{entitlements.activeEmployees.current}/{entitlements.activeEmployees.maximum ?? "∞"}</strong></div>
          </div> : null}
          <EmployerEmployeesPanel organizationId={organizationId} employer={employer} canCreate={canCreateEmployee} showHeader />
        </>
      : <div className="empty">בחרו ארגון ומעסיק בסרגל העליון</div>}
  </AppShell>;
}
