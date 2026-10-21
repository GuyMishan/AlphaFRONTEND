"use client";

import { useCallback, useEffect, useState } from "react";
import { UiInput, UiCheckbox } from "@/components/ui/ui-controls";
import { adminApi } from "@/features/admin/api";
import { errorMessage } from "@/lib/api/error-messages";
import { notify } from "@/components/ui/notifications";

type Manufacturer = { manufacturerName: string; email: string; isVerified: boolean; companyCount: number };
type Product = {
  externalKey: string; fundName: string; companyName: string; manufacturerName: string;
  overrideEmail: string; overrideVerified: boolean; manufacturerEmail: string;
  manufacturerVerified: boolean; effectiveEmail: string; source: string;
};

export function ManufacturerContactsAdminTab() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"manufacturer" | "product">("manufacturer");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [m, p] = await Promise.all([
        adminApi.manufacturerContacts(),
        adminApi.productContactOverrides(search),
      ]);
      setManufacturers(m);
      setProducts(p);
    } catch (err) { setError(errorMessage(err, "טעינת כתובות היצרנים נכשלה")); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function save(scope: "manufacturer" | "product", key: string, email: string, verified: boolean) {
    setBusy(key);
    try {
      if (scope === "manufacturer") await adminApi.saveManufacturerContact(key, email, verified);
      else await adminApi.saveProductContactOverride(key, email, verified);
      notify.success("כתובת הקשר נשמרה.");
      await refresh();
    } catch (err) { setError(errorMessage(err, "שמירת כתובת הקשר נכשלה")); }
    finally { setBusy(""); }
  }

  return <section className="card admin-section-card" style={{ padding: 18 }}>
    <h2>כתובות קשר ליצרנים ולמוצרים</h2>
    <p className="text-muted">מאגר מרכזי לאדמין. רק כתובת שסומנה כאומתת תוכל לשמש לשליחה עתידית. אין שליחת דוא״ל בשלב זה.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "16px 0" }}>
      <button type="button" className={mode === "manufacturer" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setMode("manufacturer")}>יצרנים</button>
      <button type="button" className={mode === "product" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setMode("product")}>חריגות ברמת מוצר</button>
    </div>
    {mode === "product" ? <label className="field" style={{ maxWidth: 460, marginBottom: 12 }}>
      <span>חיפוש מוצר או חברה מנהלת</span>
      <UiInput value={search} onChange={e => setSearch(e.target.value)} placeholder="שם מוצר, חברה או מזהה" />
    </label> : null}
    {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
    {loading ? <p>טוען כתובות קשר...</p> : mode === "manufacturer" ? (
      <div style={{ display: "grid", gap: 10 }}>
        {manufacturers.length === 0 ? <p>לא נמצאו יצרנים במיפוי המאומת.</p> : manufacturers.map(item =>
          <ContactRow key={item.manufacturerName} name={item.manufacturerName}
            description={`${item.companyCount} חברות מנהלות`} email={item.email}
            verified={item.isVerified} busy={busy === item.manufacturerName}
            onSave={(email, verified) => save("manufacturer", item.manufacturerName, email, verified)} />)}
      </div>
    ) : <div style={{ display: "grid", gap: 10 }}>
      {products.length === 0 ? <p>לא נמצאו מוצרים.</p> : products.map(item =>
        <ContactRow key={item.externalKey} name={item.fundName}
          description={`${item.companyName} · ${item.manufacturerName || "ללא יצרן מאומת"} · כתובת בפועל: ${item.effectiveEmail || "לא מוגדרת"} (${item.source === "product" ? "מוצר" : item.source === "manufacturer" ? "יצרן" : "אין"})`}
          email={item.overrideEmail} verified={item.overrideVerified}
          busy={busy === item.externalKey} onSave={(email, verified) => save("product", item.externalKey, email, verified)} />)}
    </div>}
  </section>;
}

function ContactRow({ name, description, email: initialEmail, verified: initialVerified, busy, onSave }: {
  name: string; description: string; email: string; verified: boolean; busy: boolean;
  onSave: (email: string, verified: boolean) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [verified, setVerified] = useState(initialVerified);
  useEffect(() => { setEmail(initialEmail); setVerified(initialVerified); }, [initialEmail, initialVerified]);
  const changed = email !== initialEmail || verified !== initialVerified;
  return <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
    <div><strong>{name}</strong><small style={{ display: "block", color: "var(--color-text-muted)" }}>{description}</small></div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <label className="field" style={{ flex: "1 1 250px" }}>
        <span>כתובת דוא״ל</span>
        <UiInput type="email" dir="ltr" value={email} disabled={busy} placeholder="contact@example.com"
          onChange={e => { setEmail(e.target.value); if (verified) setVerified(false); }} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <UiCheckbox checked={verified} disabled={busy || !email.trim()} onChange={e => setVerified(e.target.checked)} />
        כתובת אומתה
      </label>
      <button type="button" className="btn btn-primary" disabled={busy || !changed || (!!email && !email.includes("@"))}
        onClick={() => onSave(email.trim(), verified)}>{busy ? "שומר..." : "שמור"}</button>
    </div>
  </div>;
}
