"use client";

import { useEffect, useState } from "react";
import { CreditCard, Landmark, Save } from "lucide-react";
import { toast } from "sonner";
import { alphaApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import type {
  AlphaBillingAccount,
  AlphaBillingAccountInput,
  AlphaBillingProviderMetadataInput,
  BillingPaymentMethodStatus,
  BillingPaymentMethodType,
} from "@/lib/types";

const EMPTY: AlphaBillingAccount = {
  id: null,
  organizationId: null,
  employerId: null,
  billingName: "",
  taxId: "",
  invoiceEmail: "",
  billingAddress: "",
  paymentMethodType: 1,
  paymentMethodStatus: 1,
  providerCustomerId: "",
  providerPaymentMethodId: "",
  cardBrand: "",
  cardLast4: "",
  cardExpiryMonth: null,
  cardExpiryYear: null,
  bankDebitMandateReference: "",
  configured: false,
};

export function AlphaBillingAccountForm({
  organizationId,
  employerId,
  canManage,
}: {
  organizationId: string;
  employerId?: string;
  canManage: boolean;
}) {
  const platformAdmin = Boolean(getSession()?.platformAdmin);
  const [account, setAccount] = useState<AlphaBillingAccount>(EMPTY);
  const [details, setDetails] = useState<AlphaBillingAccountInput>({
    billingName: "",
    taxId: "",
    invoiceEmail: "",
    billingAddress: "",
    paymentMethodType: 1,
  });
  const [provider, setProvider] = useState<AlphaBillingProviderMetadataInput>({
    paymentMethodStatus: 1,
    providerCustomerId: "",
    providerPaymentMethodId: "",
    cardBrand: "",
    cardLast4: "",
    cardExpiryMonth: null,
    cardExpiryYear: null,
    bankDebitMandateReference: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const value = employerId
        ? await alphaApi.employerBillingAccount(organizationId, employerId)
        : await alphaApi.organizationBillingAccount(organizationId);
      setAccount(value);
      setDetails({
        billingName: value.billingName,
        taxId: value.taxId,
        invoiceEmail: value.invoiceEmail,
        billingAddress: value.billingAddress,
        paymentMethodType: value.paymentMethodType,
      });
      setProvider({
        paymentMethodStatus: value.paymentMethodStatus,
        providerCustomerId: value.providerCustomerId,
        providerPaymentMethodId: value.providerPaymentMethodId,
        cardBrand: value.cardBrand,
        cardLast4: value.cardLast4,
        cardExpiryMonth: value.cardExpiryMonth,
        cardExpiryYear: value.cardExpiryYear,
        bankDebitMandateReference: value.bankDebitMandateReference,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת Billing Account נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [organizationId, employerId]);

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    try {
      const value = employerId
        ? await alphaApi.saveEmployerBillingAccount(organizationId, employerId, details)
        : await alphaApi.saveOrganizationBillingAccount(organizationId, details);
      setAccount(value);
      toast.success("פרטי החיוב נשמרו");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת פרטי החיוב נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function saveProviderMetadata(event: React.FormEvent) {
    event.preventDefault();
    if (!platformAdmin || !account.configured) return;
    setSavingProvider(true);
    try {
      const sanitized: AlphaBillingProviderMetadataInput = account.paymentMethodType === 1
        ? { ...provider, bankDebitMandateReference: "" }
        : { ...provider, cardBrand: "", cardLast4: "", cardExpiryMonth: null, cardExpiryYear: null };
      const value = employerId
        ? await alphaApi.updateEmployerBillingProviderMetadata(organizationId, employerId, sanitized)
        : await alphaApi.updateOrganizationBillingProviderMetadata(organizationId, sanitized);
      setAccount(value);
      toast.success("Metadata של אמצעי התשלום עודכן");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "עדכון metadata נכשל");
    } finally {
      setSavingProvider(false);
    }
  }

  if (loading) return <div className="empty">טוען Billing Account...</div>;

  return <div className="employer-profile-stack">
    <section className="card profile-card">
      <div className="card-head">
        <div>
          <h2>Alpha Billing Account</h2>
          <span style={{ color: "var(--muted)" }}>פרטי החיוב עבור השימוש ב־Alpha. חשבון זה נפרד מחשבון התשלומים הפנסיוניים.</span>
        </div>
        <span className={account.paymentMethodStatus === 3 ? "badge badge-green" : "badge badge-gray"}>
          {billingStatusLabel(account.paymentMethodStatus)}
        </span>
      </div>

      {!canManage ? <div className="notice notice-info" style={{ marginBottom: 18 }}>החשבון מוצג לקריאה בלבד לפי ההרשאה שלך.</div> : null}

      <form className="form" onSubmit={saveDetails}>
        <div className="grid two-cols">
          <div className="field"><label>שם לחיוב</label><input disabled={!canManage} maxLength={200} value={details.billingName} onChange={(e) => setDetails({ ...details, billingName: e.target.value })} /></div>
          <div className="field"><label>ח.פ. / עוסק</label><input disabled={!canManage} maxLength={30} value={details.taxId} onChange={(e) => setDetails({ ...details, taxId: e.target.value })} /></div>
          <div className="field"><label>אימייל לחשבוניות</label><input disabled={!canManage} type="email" maxLength={320} value={details.invoiceEmail} onChange={(e) => setDetails({ ...details, invoiceEmail: e.target.value })} /></div>
          <div className="field"><label>כתובת לחיוב</label><input disabled={!canManage} maxLength={500} value={details.billingAddress} onChange={(e) => setDetails({ ...details, billingAddress: e.target.value })} /></div>
        </div>

        <div className="field">
          <label>אמצעי תשלום</label>
          <div className="grid two-cols">
            <button type="button" disabled={!canManage} className={`choice-card${details.paymentMethodType === 1 ? " selected" : ""}`} onClick={() => setDetails({ ...details, paymentMethodType: 1 })}>
              <CreditCard size={24} /><b>כרטיס אשראי</b><p>נשמרים רק token ו־metadata. לא נשמרים מספר כרטיס או CVV.</p>
            </button>
            <button type="button" disabled={!canManage} className={`choice-card${details.paymentMethodType === 2 ? " selected" : ""}`} onClick={() => setDetails({ ...details, paymentMethodType: 2 })}>
              <Landmark size={24} /><b>הרשאה לחיוב חשבון</b><p>נשמר רק mandate/reference מספק התשלום.</p>
            </button>
          </div>
        </div>

        {account.configured ? <div className="notice notice-info">
          {account.paymentMethodType === 1
            ? account.cardLast4
              ? <>כרטיס: {account.cardBrand || "Card"} · •••• {account.cardLast4}{account.cardExpiryMonth && account.cardExpiryYear ? ` · ${String(account.cardExpiryMonth).padStart(2, "0")}/${account.cardExpiryYear}` : ""}</>
              : "עדיין לא חובר token של כרטיס מספק התשלום."
            : account.bankDebitMandateReference
              ? <>Mandate reference: {account.bankDebitMandateReference}</>
              : "עדיין לא חובר mandate של חיוב חשבון מספק התשלום."}
        </div> : null}

        {canManage ? <div className="form-actions"><span /><button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירת Billing Account"}</button></div> : null}
      </form>
    </section>

    {platformAdmin && account.configured ? <section className="card profile-card">
      <div className="card-head"><div><h2>Provider metadata</h2><span style={{ color: "var(--muted)" }}>ניהול metadata בטוח בלבד. אין שדות למספר כרטיס מלא או CVV.</span></div></div>
      <form className="form" onSubmit={saveProviderMetadata}>
        <div className="grid two-cols">
          <div className="field"><label>סטטוס</label><select value={provider.paymentMethodStatus} onChange={(e) => setProvider({ ...provider, paymentMethodStatus: Number(e.target.value) as BillingPaymentMethodStatus })}><option value={1}>לא הוגדר</option><option value={2}>ממתין</option><option value={3}>פעיל</option><option value={4}>נכשל</option><option value={5}>מושהה</option><option value={6}>בוטל</option></select></div>
          <div className="field"><label>Provider Customer ID</label><input maxLength={200} value={provider.providerCustomerId} onChange={(e) => setProvider({ ...provider, providerCustomerId: e.target.value })} /></div>
          <div className="field"><label>Provider Payment Method ID</label><input maxLength={200} value={provider.providerPaymentMethodId} onChange={(e) => setProvider({ ...provider, providerPaymentMethodId: e.target.value })} /></div>
          {account.paymentMethodType === 1 ? <>
            <div className="field"><label>מותג כרטיס</label><input maxLength={40} value={provider.cardBrand} onChange={(e) => setProvider({ ...provider, cardBrand: e.target.value })} /></div>
            <div className="field"><label>4 ספרות אחרונות</label><input inputMode="numeric" maxLength={4} value={provider.cardLast4} onChange={(e) => setProvider({ ...provider, cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></div>
            <div className="field"><label>חודש תוקף</label><input type="number" min={1} max={12} value={provider.cardExpiryMonth ?? ""} onChange={(e) => setProvider({ ...provider, cardExpiryMonth: e.target.value ? Number(e.target.value) : null })} /></div>
            <div className="field"><label>שנת תוקף</label><input type="number" min={2026} max={2200} value={provider.cardExpiryYear ?? ""} onChange={(e) => setProvider({ ...provider, cardExpiryYear: e.target.value ? Number(e.target.value) : null })} /></div>
          </> : <div className="field"><label>Bank Debit Mandate Reference</label><input maxLength={200} value={provider.bankDebitMandateReference} onChange={(e) => setProvider({ ...provider, bankDebitMandateReference: e.target.value })} /></div>}
        </div>
        <div className="form-actions"><span /><button className="btn btn-primary" type="submit" disabled={savingProvider}><Save size={17} />{savingProvider ? "שומר..." : "שמירת Provider metadata"}</button></div>
      </form>
    </section> : null}

    <div className="notice notice-info">בשלב הזה Alpha שומרת את חשבון החיוב וה־metadata הבטוח בלבד. חיבור אמיתי לספק תשלום יתבצע בשלב הייעודי לכך.</div>
  </div>;
}

function billingStatusLabel(status: BillingPaymentMethodStatus) {
  if (status === 2) return "ממתין";
  if (status === 3) return "פעיל";
  if (status === 4) return "נכשל";
  if (status === 5) return "מושהה";
  if (status === 6) return "בוטל";
  return "לא הוגדר";
}
