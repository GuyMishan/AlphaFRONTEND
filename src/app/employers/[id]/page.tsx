"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmployerForm } from "@/components/employer-form";
import { alphaApi } from "@/lib/api";
import type { Employer } from "@/lib/types";
import { useQueryContext } from "@/lib/use-query-context";

export default function EmployerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { organizationId } = useQueryContext();
  const [employer, setEmployer] = useState<Employer>();
  const [canEditEmployer, setCanEditEmployer] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!organizationId || !id) return;
    Promise.all([alphaApi.employer(organizationId, id), alphaApi.employerCapabilities(organizationId, id)])
      .then(([item, capabilities]) => { setEmployer(item); setCanEditEmployer(capabilities.canEditEmployer); })
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת המעסיק נכשלה"));
  }, [id, organizationId]);
  return <AppShell title="פרופיל מעסיק" hideScopeController><div className="page-head"><div><h1>פרופיל מעסיק</h1><p>פרטים משפטיים והגדרות זיהוי של המעסיק.</p></div></div>{error ? <div className="notice notice-error">{error}</div> : employer ? <EmployerForm organizationId={organizationId} employer={employer} editable={canEditEmployer} /> : <div className="empty">טוען פרופיל...</div>}</AppShell>;
}
