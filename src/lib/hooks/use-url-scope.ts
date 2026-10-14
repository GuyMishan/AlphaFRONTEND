"use client";

import { useSearchParams } from "next/navigation";

/** organizationId/employerId from the current URL query (profile pages linked from lists). */
export function useUrlScope() {
  const params = useSearchParams();
  return { organizationId: params.get("organizationId") ?? "", employerId: params.get("employerId") ?? "" };
}
