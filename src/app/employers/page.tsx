"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { alphaApi } from "@/lib/api";
import { getOrganizationSelection } from "@/lib/session";
import type { Employer } from "@/lib/types";

export default function EmployersPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    alphaApi.organizations().then(async (organizations) => {
      const saved = getOrganizationSelection();
      const orgId = saved && organizations.some((item) => item.id === saved) ? saved : organizations[0]?.id ?? "";
      setOrganizationId(orgId);
      if (!orgId) return;
      const [items, capabilities] = await Promise.all([alphaApi.employers(orgId), alphaApi.capabilities(orgId)]);
      setEmployers(items); setCanCreate(capabilities.canCreateEmployer);
    }).catch((err) => setError(err instanceof Error ? err.message : "טעינת המעסיקים נכשלה")).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => employers.filter((item) => `${item.legalName} ${item.registrationNumber} ${item.withholdingFileNumber}`.includes(query)), [employers, query]);
  return <AppShell title="מעסיקים"><div className="page-head"><div><h1>מעסיקים</h1><p>צפייה וניהול המעסיקים הזמינים עבורך</p></div>{canCreate ? <Link className="btn btn-primary" href={`/employers/new?organizationId=${organizationId}`}><Plus size={18} />הקמת מעסיק</Link> : null}</div>{!canCreate && !loading ? <div className="notice notice-info" style={{ marginBottom: 18 }}>אין לך הרשאה להקים מעסיק חדש. ניתן לצפות ולערוך רק מעסיקים שהוקצו לך.</div> : null}{error ? <div className="notice notice-error">{error}</div> : null}<section className="card"><div className="toolbar"><div className="search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="חיפוש לפי שם, ח.פ. או תיק ניכויים" /></div><span className="badge badge-blue">{employers.length} מעסיקים</span></div>{loading ? <div className="empty">טוען מעסיקים...</div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>שם המעסיק</th><th>ח.פ.</th><th>תיק ניכויים</th><th>סטטוס</th></tr></thead><tbody>{filtered.map((employer) => <tr key={employer.id}><td><Link className="profile-link" href={`/employers/${employer.id}?organizationId=${organizationId}`}><b>{employer.legalName}</b></Link></td><td>{employer.registrationNumber}</td><td>{employer.withholdingFileNumber}</td><td><span className={employer.status === 2 ? "badge badge-green" : "badge badge-orange"}>{employer.status === 2 ? "פעיל" : "בהקמה"}</span></td></tr>)}</tbody></table></div> : <div className="empty"><Building2 size={35} /><div>לא נמצאו מעסיקים.</div></div>}</section></AppShell>;
}
