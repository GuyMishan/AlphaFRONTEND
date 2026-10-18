"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { legalApi, type LegalDocument } from "@/features/legal/api";
import { AppLoader } from "@/components/loading/app-loader";
import { PageHeader } from "@/components/layout/page-header";
import packageInfo from "../../../../package.json";

const formatDate = (date: string) => new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));

export default function LegalPolicyScreen() {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    legalApi.active(controller.signal)
      .then(setDocument)
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  return <main style={{ maxWidth: 900, width: "100%", margin: "0 auto", padding: "32px 20px", direction: "rtl" }}>
    <PageHeader title="מדיניות ומידע משפטי" />
    <p>תנאי השימוש והמדיניויות של ALPHA מתעדכנים במקור מרכזי אחד.</p>
    {loading ? <AppLoader /> : error || !document
      ? <div role="status" className="notice notice-info">המסמך המשפטי אינו זמין כעת או שטרם פורסמה גרסה מאושרת.</div>
      : <article aria-label={document.title} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          <h2>{document.title}</h2>
          <p>גרסת מסמך {document.version} · פורסם {formatDate(document.publishedAt)} · בתוקף מ־{formatDate(document.effectiveAt)}</p>
          <div>{document.markdown}</div>
        </article>}
    <footer style={{ marginTop: 32 }}>
      <p>גרסת מערכת {packageInfo.version}</p>
      <Link href="/login">מעבר להתחברות</Link>
    </footer>
  </main>;
}
