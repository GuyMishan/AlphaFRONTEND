"use client";

import { useEffect, useState } from "react";

/** organizationId/employerId from the current URL query (profile pages linked from lists). */
export function useUrlScope() {
  const [context, setContext] = useState({ organizationId: "", employerId: "" });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setContext({ organizationId: params.get("organizationId") ?? "", employerId: params.get("employerId") ?? "" });
  }, []);
  return context;
}
