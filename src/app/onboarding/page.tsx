"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/session";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    router.replace(session ? "/dashboard" : "/login");
  }, [router]);

  return null;
}
