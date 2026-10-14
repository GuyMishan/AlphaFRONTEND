"use client";

import { useEffect, useState } from "react";
import type { EmployerSelection } from "@/lib/session/app-store";
import { getEmployerSelection } from "@/lib/session/storage";
import { subscribeToScopeChanges } from "./scope-events";

const EMPTY: EmployerSelection = { organizationId: "", employerId: "" };

/**
 * The (organization, employer) a page works on: starts from the persisted
 * selection and follows ScopeController changes that carry an employer.
 */
export function useEmployerScope(): EmployerSelection {
  const [scope, setScope] = useState<EmployerSelection>(EMPTY);
  useEffect(() => {
    // Read browser storage after mount so server and first client render match.
    const saved = getEmployerSelection();
    if (saved) setScope(saved);
    return subscribeToScopeChanges((change) => {
      setScope({ organizationId: change.organizationId, employerId: change.employerId ?? "" });
    });
  }, []);
  return scope;
}
