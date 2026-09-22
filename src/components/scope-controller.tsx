"use client";

import { UiSelect } from "@/components/ui-controls";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, UserRound } from "lucide-react";
import { alphaApi } from "@/lib/api";
import {
  getEmployeeSelection,
  getEmployerSelection,
  getOrganizationSelection,
  getSession,
  setEmployeeSelection,
  setEmployerSelection,
  setOrganizationSelection,
} from "@/lib/session";
import type { Employee, GlobalScopeContext, ScopeEmployer, ScopeOrganization } from "@/lib/types";

type ScopeLevel = "organization" | "employer" | "employee";

function requiredScope(pathname: string): ScopeLevel {
  if (pathname === "/employees/new") return "employer";
  if (/^\/employees\/[^/]+/.test(pathname)) return "employee";
  if (pathname === "/reports/new" || pathname === "/reports" || pathname === "/employees") return "employer";
  return "organization";
}

function emitScopeChange(detail: { organizationId: string; employerId?: string; employeeId?: string }) {
  window.dispatchEvent(new CustomEvent("alpha:scope-change", { detail }));
}

export function ScopeController() {
  const pathname = usePathname();
  const router = useRouter();
  const level = requiredScope(pathname);
  const isAdminDashboard = pathname === "/dashboard" && Boolean(getSession()?.platformAdmin);
  const [scope, setScope] = useState<GlobalScopeContext | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);

  const allEmployers = useMemo(() => {
    if (!scope) return [] as Array<{ organization: ScopeOrganization; employer: ScopeEmployer }>;
    return scope.organizations.flatMap((organization) =>
      organization.employers.map((employer) => ({ organization, employer }))
    );
  }, [scope]);

  const selectedOrganization = scope?.organizations.find((item) => item.id === organizationId) ?? null;
  const selectedOrganizationHasScope = Boolean(selectedOrganization?.hasOrganizationScope);
  const relevantOrganizations = scope?.organizations.filter((item) => item.hasOrganizationScope) ?? [];
  const organizationEmployers = selectedOrganization?.employers ?? [];

  async function loadEmployees(orgId: string, empId: string) {
    if (!orgId || !empId) {
      setEmployees([]);
      setEmployeeId("");
      return "";
    }
    const items = await alphaApi.employees(orgId, empId);
    setEmployees(items);
    const saved = getEmployeeSelection();
    const nextId = saved && items.some((item) => item.id === saved) ? saved : items[0]?.id ?? "";
    setEmployeeId(nextId);
    if (nextId) setEmployeeSelection(nextId);
    return nextId;
  }

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const context = await alphaApi.scope();
        if (!active) return;
        setScope(context);

        if (isAdminDashboard) {
          setOrganizationId("");
          setEmployerId("");
          setEmployees([]);
          setEmployeeId("");
          return;
        }

        const savedOrg = getOrganizationSelection();
        const savedEmployer = getEmployerSelection();

        let orgId = savedOrg && context.organizations.some((item) => item.id === savedOrg)
          ? savedOrg
          : context.organizations[0]?.id ?? "";

        let employerEntry: { organization: ScopeOrganization; employer: ScopeEmployer } | null = null;
        const hasOrganizationScope = context.organizations.some((item) => item.hasOrganizationScope);
        const needsEmployerScope = level !== "organization" || !hasOrganizationScope;

        if (needsEmployerScope) {
          if (savedEmployer) {
            employerEntry = context.organizations
              .flatMap((organization) => organization.employers.map((employer) => ({ organization, employer })))
              .find((item) => item.organization.id === savedEmployer.organizationId && item.employer.id === savedEmployer.employerId) ?? null;
          }

          if (!employerEntry) {
            const preferredOrganization = context.organizations.find((item) => item.id === orgId);
            const preferredEmployer = preferredOrganization?.employers[0];
            if (preferredOrganization && preferredEmployer)
              employerEntry = { organization: preferredOrganization, employer: preferredEmployer };
            else
              employerEntry = context.organizations
                .flatMap((organization) => organization.employers.map((employer) => ({ organization, employer })))[0] ?? null;
          }

          if (employerEntry) {
            orgId = employerEntry.organization.id;
            setOrganizationSelection(orgId);
            setEmployerSelection(orgId, employerEntry.employer.id);
            setEmployerId(employerEntry.employer.id);
          } else {
            setEmployerId("");
          }
        } else {
          setEmployerId("");
          if (orgId) setOrganizationSelection(orgId);
        }

        setOrganizationId(orgId);

        let nextEmployeeId = "";
        if (level === "employee" && employerEntry)
          nextEmployeeId = await loadEmployees(orgId, employerEntry.employer.id);

        if (!active || !orgId) return;
        emitScopeChange({
          organizationId: orgId,
          employerId: employerEntry?.employer.id,
          employeeId: nextEmployeeId || undefined,
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [level, isAdminDashboard]);

  async function changeOrganization(value: string) {
    if (!scope) return;
    setOrganizationId(value);
    setEmployerId("");

    if (isAdminDashboard) {
      if (!value) {
        emitScopeChange({ organizationId: "" });
        return;
      }
      setOrganizationSelection(value);
      emitScopeChange({ organizationId: value });
      return;
    }

    setOrganizationSelection(value);

    if (level === "organization") {
      emitScopeChange({ organizationId: value });
      return;
    }

    const organization = scope.organizations.find((item) => item.id === value);
    const nextEmployer = organization?.employers[0];
    if (!nextEmployer) {
      setEmployerId("");
      emitScopeChange({ organizationId: value });
      return;
    }

    setEmployerId(nextEmployer.id);
    setEmployerSelection(value, nextEmployer.id);

    if (level === "employee") {
      const nextEmployeeId = await loadEmployees(value, nextEmployer.id);
      if (nextEmployeeId) {
        router.replace(`/employees/${nextEmployeeId}`);
        return;
      }
    }

    emitScopeChange({ organizationId: value, employerId: nextEmployer.id });
  }

  async function changeEmployer(value: string) {
    if (!scope) return;

    if (isAdminDashboard && !value) {
      setEmployerId("");
      if (organizationId) emitScopeChange({ organizationId });
      return;
    }

    const entry = allEmployers.find((item) => item.employer.id === value);
    if (!entry) return;

    setOrganizationId(entry.organization.id);
    setOrganizationSelection(entry.organization.id);
    setEmployerId(value);
    setEmployerSelection(entry.organization.id, value);

    if (level === "employee") {
      const nextEmployeeId = await loadEmployees(entry.organization.id, value);
      if (nextEmployeeId) {
        router.replace(`/employees/${nextEmployeeId}`);
        return;
      }
    }

    emitScopeChange({ organizationId: entry.organization.id, employerId: value });
  }

  function changeEmployee(value: string) {
    setEmployeeId(value);
    setEmployeeSelection(value);
    if (/^\/employees\/[^/]+/.test(pathname)) {
      router.replace(`/employees/${value}`);
      return;
    }
    emitScopeChange({ organizationId, employerId, employeeId: value });
  }

  if (!scope || loading) return null;

  const hasAnyOrganizationScope = scope.organizations.some((item) => item.hasOrganizationScope);
  const showOrganizationSelector =
    isAdminDashboard
      ? scope.organizations.length > 0
      : hasAnyOrganizationScope &&
        relevantOrganizations.length > 1 &&
        (level === "organization" || selectedOrganizationHasScope);

  const employerOptions = selectedOrganizationHasScope
    ? organizationEmployers
    : allEmployers.map((item) => item.employer);

  const showEmployerSelector =
    isAdminDashboard
      ? Boolean(organizationId)
      : pathname !== "/employers" &&
        (level !== "organization" || !hasAnyOrganizationScope) &&
        employerOptions.length > 1;

  const showEmployeeSelector = level === "employee" && employees.length > 1;

  if (!showOrganizationSelector && !showEmployerSelector && !showEmployeeSelector)
    return null;

  return <div className="scopebar" aria-label="בחירת הקשר עבודה">
    <div className="scope-selects">
      {showOrganizationSelector ? <label>
        <span>ארגון</span>
        <div><Building2 size={16} /><UiSelect controlSize="compact" value={organizationId} disabled={loading} onChange={(event) => void changeOrganization(event.target.value)}>
          {isAdminDashboard ? [{ id: "", name: "בחר ארגון" }, ...scope.organizations].map((item) => <option key={item.id || "empty"} value={item.id}>{item.name}</option>) : relevantOrganizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </UiSelect></div>
      </label> : null}

      {showEmployerSelector ? <label>
        <span>מעסיק</span>
        <div><Building2 size={16} /><UiSelect controlSize="compact" value={employerId} disabled={loading} onChange={(event) => void changeEmployer(event.target.value)}>
          {isAdminDashboard
            ? [{ id: "", legalName: "בחר מעסיק" }, ...organizationEmployers].map((item) => <option key={item.id || "empty"} value={item.id}>{item.legalName}</option>)
            : selectedOrganizationHasScope
              ? employerOptions.map((item) => <option key={item.id} value={item.id}>{item.legalName}</option>)
              : allEmployers.map((item) => <option key={item.employer.id} value={item.employer.id}>{item.employer.legalName}{scope.organizations.length > 1 ? ` · ${item.organization.name}` : ""}</option>)}
        </UiSelect></div>
      </label> : null}

      {showEmployeeSelector ? <label>
        <span>עובד</span>
        <div><UserRound size={16} /><UiSelect controlSize="compact" value={employeeId} disabled={loading || !employerId} onChange={(event) => changeEmployee(event.target.value)}>
          {employees.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}
        </UiSelect></div>
      </label> : null}
    </div>
  </div>;
}
