"use client";

import { usePathname } from "next/navigation";
import { AppLoader } from "@/components/loading/app-loader";
import { PageSkeleton, type PageSkeletonVariant } from "@/components/loading/skeleton";
import { isPublicPath } from "@/features/shell/components/persistent-app-layout";

function skeletonFor(pathname: string): PageSkeletonVariant {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/settings" || /^\/(employers|employees|organizations)\/[^/]+/.test(pathname)) return "form";
  return "table";
}

/**
 * Route loading UI, re-exported by src/app/**\/loading.tsx. Inside the shell it shows a page
 * skeleton shaped like the destination; public pages get the branded loader.
 */
export default function RouteLoading() {
  const pathname = usePathname();
  if (isPublicPath(pathname)) return <AppLoader label="טוען..." />;
  return <PageSkeleton variant={skeletonFor(pathname)} />;
}
