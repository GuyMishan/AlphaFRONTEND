"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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

export function ScopeController() {
  const pathname = usePathname();
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
    if (!empId) { setEmployees([]); return; }
    const items = await alphaApi.employees(orgId, empId);
    setEmployees(items);
    const saved = getEmployeeSelection();
    const nextId = saved && items.some((item) => item.id === saved) ? saved : items[0]?.id ?? "";
    setEmployeeId(nextId);
    if (nextId) setEmployeeSelection(nextId);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const orgItems = await alphaApi.organizations();
        if (!active) return;
        setOrganizations(orgItems);
        const savedOrg = getOrganizationSelection();
        const orgId = savedOrg && orgItems.some((item) => item.id === savedOrg) ? savedOrg : orgItems[0]?.id ?? "";
        setOrganizationId(orgId);
        if (orgId) setOrganizationSelection(orgId);
        if (level !== "organization" && orgId) {
          const empId = await loadEmployers(orgId);
          if (level === "employee" && empId) await loadEmployees(orgId, empId);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [level, loadEmployers, loadEmployees]);

  async function changeOrganization(value: string) {
    setOrganizationId(value);
    setOrganizationSelection(value);
    if (level !== "organization") {
      const empId = await loadEmployers(value);
      if (level === "employee") await loadEmployees(value, empId);
    }
    window.location.assign(pathname);
  }

  async function changeEmployer(value: string) {
    setEmployerId(value);
    setEmployerSelection(organizationId, value);
    if (level === "employee") await loadEmployees(organizationId, value);
    window.location.assign(pathname);
  }

  function changeEmployee(value: string) {
    setEmployeeId(value);
    setEmployeeSelection(value);
    window.location.assign(pathname);
  }

  return (
    <div className="scopebar" aria-label="בחירת הקשר עבודה">
      <div className="scope-selects">
        <label><span>ארגון</span><div><Building2 size={16} /><select value={organizationId} disabled={loading} onChange={(event) => void changeOrganization(event.target.value)}>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></label>
        {level !== "organization" ? <label><span>מעסיק</span><div><Building2 size={16} /><select value={employerId} disabled={loading || !organizationId} onChange={(event) => void changeEmployer(event.target.value)}>{employers.map((item) => <option key={item.id} value={item.id}>{item.legalName}</option>)}</select></div></label> : null}
        {level === "employee" ? <label><span>עובד</span><div><UserRound size={16} /><select value={employeeId} disabled={loading || !employerId} onChange={(event) => changeEmployee(event.target.value)}>{employees.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select></div></label> : null}
      </div>
    </div>
  );
}
