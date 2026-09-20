"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { EmployerForm } from "@/components/employer-form";
import { alphaApi } from "@/lib/api";
import { getSession, setEmployerSelection, setOrganizationSelection } from "@/lib/session";
import type { Employer, EmployerInput } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    alphaApi.onboardingStatus()
      .then((status) => {
        if (!status.needsOnboarding) {
          router.replace("/dashboard");
          return;
        }
        setChecking(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "לא ניתן לבדוק את סטטוס ההרשמה.");
        setChecking(false);
      });
  }, [router]);

  async function createBusiness(input: EmployerInput): Promise<Employer> {
    const result = await alphaApi.completeSelfServiceOnboarding(input);
    setOrganizationSelection(result.organizationId);
    setEmployerSelection(result.organizationId, result.employerId);
    return result.employer;
  }

  function complete() {
    router.replace("/dashboard");
  }

  if (checking) {
    return <main className="auth-page"><section className="auth-form-wrap"><div className="auth-card"><div className="empty">בודק את החשבון...</div></div></section></main>;
  }

  return (
    <main className="auth-page">
      <section className="auth-form-wrap" style={{ width: "min(760px, 100%)" }}>
        <div className="auth-card" style={{ width: "100%" }}>
          <div className="profile-summary" style={{ marginBottom: 20 }}>
            <div className="profile-avatar"><Building2 /></div>
            <div>
              <h1 style={{ margin: 0 }}>בואו נגדיר את העסק שלכם</h1>
              <p style={{ marginBottom: 0 }}>הזינו את פרטי המעסיק. בסיום העסק ייבחר אוטומטית ותעברו לדף הבית.</p>
            </div>
          </div>
          {error ? <div className="notice notice-error" style={{ marginBottom: 18 }}>{error}</div> : null}
          <EmployerForm
            editable
            onCreate={createBusiness}
            onCreated={complete}
            showBackLink={false}
            createLabel="שמירה והמשך"
          />
        </div>
      </section>
    </main>
  );
}
