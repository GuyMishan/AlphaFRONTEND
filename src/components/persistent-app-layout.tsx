"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";

const publicPaths = new Set(["/login", "/register", "/session-timeout"]);

export function PersistentAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (publicPaths.has(pathname)) return <>{children}</>;

  return <AppShell>{children}</AppShell>;
}
