"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLoader } from "@/components/loading/app-loader";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return <AppLoader />;
}
