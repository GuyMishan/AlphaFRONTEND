"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/features/shell/components/app-shell";

// Pages that render without the authenticated shell (no session required).
const publicPaths = new Set(["/login", "/register", "/invite", "/session-timeout"]);

export function PersistentAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (publicPaths.has(pathname)) return <>{children}</>;

  return <AppShell>{children}</AppShell>;
}
