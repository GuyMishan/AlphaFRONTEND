"use client";

import { useEffect, useState } from "react";

export function useQueryContext() {
  const [context, setContext] = useState({ organizationId: "", employerId: "" });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setContext({ organizationId: params.get("organizationId") ?? "", employerId: params.get("employerId") ?? "" });
  }, []);
  return context;
}
