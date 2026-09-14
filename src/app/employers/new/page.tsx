"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmployerForm } from "@/components/employer-form";
import { alphaApi } from "@/lib/api";
import { useQueryContext } from "@/lib/use-query-context";

export default function NewEmployerPage() {
  const { organizationId } = useQueryContext();
  const [canCreateEmployer, setCanCreateEmployer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId) { setLoading(false); return; }
    alphaApi.capabilities(organizationId)
      .then((capabilities) => setCanCreateEmployer(capabilities.canCreateEmployer))
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת ההרשאות נכשלה"))
      .finally(() => setLoading(false));
  }, [organizationId]);

  return <AppShell title="הקמת מעסיק" hideScopeController><div className="page-head"><div><h1>הקמת מעסיק</h1><p>אותו פרופיל ישמש בהמשך גם לעריכת המעסיק.</p></div></div>{error ? <div className="notice notice-error">{error}</div> : !organizationId ? <div className="notice notice-error">לא נבחר ארגון.</div> : loading ? <div className="empty">טוען הרשאות...</div> : canCreateEmployer ? <EmployerForm organizationId={organizationId} /> : <div className="notice notice-info">אין לך הרשאה להקים מעסיק חדש בארגון הזה.</div>}</AppShell>;
}
