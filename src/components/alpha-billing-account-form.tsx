"use client";

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, Landmark, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { alphaApi } from "@/lib/api";
import type {
  AlphaBillingAccount,
  AlphaBillingAccountInput,
  BillingPaymentMethodStatus,
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
  const [account, setAccount] = useState<AlphaBillingAccount>(EMPTY);
  const [details, setDetails] = useState<AlphaBillingAccountInput>({
    billingName: "",
    taxId: "",
    invoiceEmail: "",
    billingAddress: "",
    paymentMethodType: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "טעינת Billing Account נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [organizationId, employerId]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("payment");
    if (!result) return;
    if (result === "success") {
      toast.success("אמצעי התשלום נקלט אצל PayPlus. מסנכרן סטטוס...");
      window.setTimeout(() => void syncPaymentMethod(), 400);
    } else if (result === "failed") {
      toast.error("חיבור אמצעי התשלום נכשל אצל PayPlus.");
    } else if (result === "cancelled") {
      toast.info("חיבור אמצעי התשלום בוטל.");
    }
  }, [organizationId, employerId]);

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

  async function connectPaymentMethod() {
    if (!canManage || !account.configured) return;
    if (account.paymentMethodType !== 1) {
      toast.info("חיבור Bank Debit אוטומטי עדיין לא זמין ב-flow הנוכחי.");
      return;
    }
    setConnecting(true);
    try {
      const returnPath = window.location.pathname + window.location.search;
      const setup = employerId
        ? await alphaApi.startEmployerPaymentSetup(organizationId, employerId, returnPath)
        : await alphaApi.startOrganizationPaymentSetup(organizationId, returnPath);
      window.location.assign(setup.redirectUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "פתיחת דף הסליקה נכשלה");
      setConnecting(false);
    }
  }

  async function syncPaymentMethod() {
    setSyncing(true);
    try {
      if (employerId) await alphaApi.syncEmployerPaymentMethod(organizationId, employerId);
      else await alphaApi.syncOrganizationPaymentMethod(organizationId);
      await load();
      toast.success("סטטוס אמצעי התשלום סונכרן");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "סנכרון אמצעי התשלום נכשל");
    } finally {
      setSyncing(false);
    }
  }

  async function cancelPaymentMethod() {
    if (!canManage || !account.providerPaymentMethodId) return;
    if (!window.confirm("לבטל את אמצעי התשלום השמור אצל ספק הסליקה?")) return;
    setCancelling(true);
    try {
      if (employerId) await alphaApi.cancelEmployerPaymentMethod(organizationId, employerId);
      else await alphaApi.cancelOrganizationPaymentMethod(organizationId);
      await load();
      toast.success("אמצעי התשלום בוטל");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ביטול אמצעי התשלום נכשל");
    } finally {
      setCancelling(false);
    }
  }

  const cardConnected = account.paymentMethodType === 1 && Boolean(account.providerPaymentMethodId);
  const bankConnected = account.paymentMethodType === 2 && Boolean(account.bankDebitMandateReference);

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
              <CreditCard size={24} /><b>כרטיס אשראי</b><p>הפרטים מוזנים רק בדף המאובטח של PayPlus. Alpha שומרת token ו־metadata בלבד.</p>
            </button>
            <button type="button" disabled={!canManage} className={`choice-card${details.paymentMethodType === 2 ? " selected" : ""}`} onClick={() => setDetails({ ...details, paymentMethodType: 2 })}>
              <Landmark size={24} /><b>הרשאה לחיוב חשבון</b><p>נשמר רק mandate/reference מספק התשלום, ללא פרטי בנק רגישים.</p>
            </button>
          </div>
        </div>

        {account.configured ? <div className="notice notice-info">
          {account.paymentMethodType === 1
            ? cardConnected
              ? <>כרטיס מחובר דרך PayPlus: {account.cardBrand || "Card"} · •••• {account.cardLast4 || "----"}{account.cardExpiryMonth && account.cardExpiryYear ? ` · ${String(account.cardExpiryMonth).padStart(2, "0")}/${account.cardExpiryYear}` : ""}</>
              : account.paymentMethodStatus === 2 ? "ממתין להשלמת החיבור אצל PayPlus." : "עדיין לא חובר כרטיס דרך PayPlus."
            : bankConnected
              ? <>Bank Debit מחובר · reference: {account.bankDebitMandateReference}</>
              : "Bank Debit עדיין לא חובר לספק התשלום."}
        </div> : null}

        {canManage ? <div className="form-actions"><span /><button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירת Billing Account"}</button></div> : null}
      </form>
    </section>

    {account.configured ? <section className="card profile-card">
      <div className="card-head"><div><h2>ספק סליקה</h2><span style={{ color: "var(--muted)" }}>PayPlus · tokenization מאובטח, ללא שמירת מספר כרטיס או CVV ב־Alpha.</span></div><span className={account.paymentMethodStatus === 3 ? "badge badge-green" : "badge badge-gray"}>{billingStatusLabel(account.paymentMethodStatus)}</span></div>
      {account.paymentMethodType === 1 ? <div className="form-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        {canManage ? <button className="btn btn-primary" type="button" disabled={connecting} onClick={() => void connectPaymentMethod()}><ExternalLink size={17} />{connecting ? "פותח..." : cardConnected ? "החלפת כרטיס" : "חיבור כרטיס מאובטח"}</button> : null}
        {cardConnected ? <button className="btn btn-secondary" type="button" disabled={syncing} onClick={() => void syncPaymentMethod()}><RefreshCw size={17} />{syncing ? "מסנכרן..." : "רענון סטטוס"}</button> : null}
        {canManage && cardConnected ? <button className="btn btn-danger" type="button" disabled={cancelling} onClick={() => void cancelPaymentMethod()}><Trash2 size={16} />{cancelling ? "מבטל..." : "ביטול אמצעי תשלום"}</button> : null}
      </div> : <div className="notice notice-info">PayPlus תומך בתשתיות Bank Debit, אך חיבור mandate אוטומטי דורש הגדרת MASAV/מסוף ייעודית אצל הספק. Alpha לא אוספת כאן פרטי חשבון בנק של אמצעי החיוב.</div>}
    </section> : null}

    <div className="notice notice-info">החיוב מתבצע server-side דרך PayPlus באמצעות token. Alpha אינה מקבלת ואינה שומרת מספר כרטיס מלא או CVV.</div>
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
