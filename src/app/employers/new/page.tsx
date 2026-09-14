"use client";

import { AppShell } from "@/components/app-shell";
import { EmployerForm } from "@/components/employer-form";
import { useQueryContext } from "@/lib/use-query-context";

export default function NewEmployerPage() {
  const { organizationId } = useQueryContext();
  return <AppShell title="הקמת מעסיק" hideScopeController><div className="page-head"><div><h1>הקמת מעסיק</h1><p>אותו פרופיל ישמש בהמשך גם לעריכת המעסיק.</p></div></div>{organizationId ? <EmployerForm organizationId={organizationId} /> : <div className="notice notice-error">לא נבחר ארגון.</div>}</AppShell>;
}
