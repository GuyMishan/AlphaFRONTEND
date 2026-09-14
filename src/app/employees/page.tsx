"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserRoundPlus, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { alphaApi } from "@/lib/api";
import { getEmployerSelection } from "@/lib/session";
import type { Employee, Employer } from "@/lib/types";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const selected = getEmployerSelection();
    if (!selected) { setLoading(false); return; }
    Promise.all([alphaApi.employees(selected.organizationId, selected.employerId), alphaApi.employers(selected.organizationId)])
      .then(([items, employers]) => { setEmployees(items); setEmployer(employers.find((x) => x.id === selected.employerId) ?? null); })
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת העובדים נכשלה"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => employees.filter((x) => `${x.firstName} ${x.lastName} ${x.nationalId} ${x.employeeNumber}`.includes(query)), [employees, query]);
  const selected = getEmployerSelection();
  return <AppShell title="עובדים"><div className="page-head"><div><h1>עובדים</h1><p>{employer ? <>עובדי <Link className="profile-link" href={`/employers/${employer.id}?organizationId=${selected?.organizationId}`}>{employer.legalName}</Link></> : "בחרו מעסיק בדף הבית"}</p></div>{selected ? <Link className="btn btn-primary" href={`/employees/new?organizationId=${selected.organizationId}&employerId=${selected.employerId}`}><UserRoundPlus size={18} />הוספת עובד</Link> : null}</div>{error ? <div className="notice notice-error">{error}</div> : null}<section className="card"><div className="toolbar"><div className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש עובד" /></div><span className="badge badge-blue">{employees.length} עובדים</span></div>{loading ? <div className="empty">טוען עובדים מה־Backend...</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>שם</th><th>תעודת זהות</th><th>מספר עובד</th><th>תאריך התחלה</th><th>תאריך סיום</th><th>סטטוס</th></tr></thead><tbody>{filtered.map((employee) => <tr key={employee.id}><td><Link className="profile-link" href={`/employees/${employee.id}?organizationId=${selected?.organizationId}&employerId=${selected?.employerId}`}><b>{employee.firstName} {employee.lastName}</b></Link></td><td>{employee.nationalId}</td><td>{employee.employeeNumber}</td><td>{employee.startDate}</td><td>{employee.endDate ?? "—"}</td><td><span className={employee.status === 1 ? "badge badge-green" : "badge badge-gray"}>{employee.status === 1 ? "פעיל" : employee.status === 2 ? "חל״ת" : "סיים עבודה"}</span></td></tr>)}</tbody></table></div> : <div className="empty"><Users size={35} /><div>לא נמצאו עובדים למעסיק הזה.</div></div>}</section></AppShell>;
}
