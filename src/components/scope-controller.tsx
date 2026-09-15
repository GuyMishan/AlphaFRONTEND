"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, UserRound } from "lucide-react";
import { alphaApi } from "@/lib/api";
import {
  getEmployeeSelection,
  getEmployerSelection,
  getOrganizationSelection,
  setEmployeeSelection,
  setEmployerSelection,
  setOrganizationSelection,
} from "@/lib/session";
import type { Employee, Employer, Organization } from "@/lib/types";

type ScopeLevel = "organization" | "employer" | "employee";

function requiredScope(pathname: string): ScopeLevel {
  if (/^\/employees\/[^/]+/.test(pathname)) return "employee";
  if (pathname === "/reports/new" || pathname === "/reports" || pathname === "/employees") return "employer";
  return "organization";
}

function emitScopeChange(detail: { organizationId: string; employerId?: string; employeeId?: string }) {
  window.dispatchEvent(new CustomEvent("alpha:scope-change", { detail }));
}

export function ScopeController({ singleEmployerUser = false }: { singleEmployerUser?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const level = requiredScope(pathname);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);

  const loadEmployers = useCallback(async (orgId: string) => {
    const items = await alphaApi.employers(orgId);
    setEmployers(items);
    const saved = getEmployerSelection();
    const nextId = saved?.organizationId === orgId && items.some((item) => item.id === saved.employerId)
      ? saved.employerId
      : items[0]?.id ?? "";
    setEmployerId(nextId);
    if (nextId) setEmployerSelection(orgId, nextId);
    return nextId;
  }, []);

  const loadEmployees = useCallback(async (orgId: string, empId: string) => {
    if (!empId) { setEmployees([]); setEmployeeId(""); return ""; }
    const items = await alphaApi.employees(orgId, empId);
    setEmployees(items);
    const saved = getEmployeeSelection();
    const nextId = saved && items.some((item) => item.id === saved) ? saved : items[0]?.id ?? "";
    setEmployeeId(nextId);
    if (nextId) setEmployeeSelection(nextId);
    return nextId;
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const previousOrganizationId = getOrganizationSelection() ?? "";
      const previousEmployer = getEmployerSelection();
      const previousEmployerId = previousEmployer?.organizationId === previousOrganizationId ? previousEmployer.employerId : "";
      const previousEmployeeId = getEmployeeSelection() ?? "";

      try {
        const orgItems = await alphaApi.organizations();
        if (!active) return;
        setOrganizations(orgItems);
        const savedOrg = getOrganizationSelection();
        const orgId = savedOrg && orgItems.some((item) => item.id === savedOrg) ? savedOrg : orgItems[0]?.id ?? "";
        setOrganizationId(orgId);
        if (orgId) setOrganizationSelection(orgId);

        let empId = "";
        let empEmployeeId = "";
        if ((level !== "organization" || singleEmployerUser) && orgId) {
          empId = await loadEmployers(orgId);
          if (level === "employee" && empId) empEmployeeId = await loadEmployees(orgId, empId);
        }

        if (!active || !orgId) return;

        const organizationChanged = orgId !== previousOrganizationId;
        const employerChanged = (level !== "organization" || singleEmployerUser) && empId !== previousEmployerId;
        const employeeChanged = level === "employee" && empEmployeeId !== previousEmployeeId;

        if (organizationChanged || employerChanged || employeeChanged) {
          emitScopeChange({
            organizationId: orgId,
            employerId: empId || undefined,
            employeeId: empEmployeeId || undefined,
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [level, singleEmployerUser, loadEmployers, loadEmployees]);

  async function changeOrganization(value: string) {
    setOrganizationId(value);
    setOrganizationSelection(value);
    let nextEmployerId = "";
    let nextEmployeeId = "";
    if (level !== "organization") {
      nextEmployerId = await loadEmployers(value);
      if (level === "employee") nextEmployeeId = await loadEmployees(value, nextEmployerId);
    }
    if (level === "employee" && nextEmployeeId) {
      router.replace(`/employees/${nextEmployeeId}`);
      return;
    }
    emitScopeChange({ organizationId: value, employerId: nextEmployerId || undefined });
  }

  async function changeEmployer(value: string) {
    setEmployerId(value);
    setEmployerSelection(organizationId, value);
    let nextEmployeeId = "";
    if (level === "employee") nextEmployeeId = await loadEmployees(organizationId, value);
    if (level === "employee" && nextEmployeeId) {
      router.replace(`/employees/${nextEmployeeId}`);
      return;
    }
    emitScopeChange({ organizationId, employerId: value });
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

  const organization = organizations.find((item) => item.id === organizationId);
  const employer = employers.find((item) => item.id === employerId);

  const showEmployer = level !== "organization" && !singleEmployerUser;
  const showEmployee = level === "employee";
  if (singleEmployerUser && !showEmployee) return null;

  return (
    <div className="scopebar" aria-label="בחירת הקשר עבודה">
      <div className="scope-selects">
        {!singleEmployerUser ? organizations.length > 1 ? (
          <label><span>ארגון</span><div><Building2 size={16} /><select value={organizationId} disabled={loading} onChange={(event) => void changeOrganization(event.target.value)}>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></label>
        ) : organization ? (
          <label><span>ארגון</span><div><Building2 size={16} /><span>{organization.name}</span></div></label>
        ) : null : null}

        {showEmployer ? employers.length > 1 ? (
          <label><span>מעסיק</span><div><Building2 size={16} /><select value={employerId} disabled={loading || !organizationId} onChange={(event) => void changeEmployer(event.target.value)}>{employers.map((item) => <option key={item.id} value={item.id}>{item.legalName}</option>)}</select></div></label>
        ) : employer ? (
          <label><span>מעסיק</span><div><Building2 size={16} /><span>{employer.legalName}</span></div></label>
        ) : null : null}

        {showEmployee ? <label><span>עובד</span><div><UserRound size={16} /><select value={employeeId} disabled={loading || !employerId} onChange={(event) => changeEmployee(event.target.value)}>{employees.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select></div></label> : null}
      </div>
    </div>
  );
}
