"use client";

import { useEffect, useState } from "react";
import { CreditCard, Landmark, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { alphaApi } from "@/lib/api";
import { UiChoiceCard, UiInput } from "@/components/ui-controls";
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
  billingMode: 1,
  status: 1,
  defaultPaymentMethodId: null,
  configured: false,
};

export function AlphaBillingAccountForm({
  organizationId,
  employerId,
  canManage,
  onSaved,
  embedded = false,
  showOwnerContext = true,
}: {
  organizationId: string;
  employerId?: string;
  canManage: boolean;
  onSaved?: () => void | Promise<void>;
  embedded?: boolean;
  showOwnerContext?: boolean;
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
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);

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

  async function settlePaymentMethodAfterReturn() {
    setSyncing(true);
    try {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          if (employerId) await alphaApi.syncEmployerPaymentMethod(organizationId, employerId);
          else await alphaApi.syncOrganizationPaymentMethod(organizationId);
          await load();
          toast.success("אמצעי התשלום אומת והופעל");
          return;
        } catch {
          await new Promise((resolve) => window.setTimeout(resolve, 750));
        }
      }

      await load();
      toast.info("האישור מספק הסליקה עדיין בעיבוד. אפשר לרענן את הסטטוס בעוד רגע.");
    } finally {
      setSyncing(false);
    }
  }


  useEffect(() => { void load(); }, [organizationId, employerId]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("payment");
    if (!result) return;

    url.searchParams.delete("payment");
    const cleanUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") + url.hash;
    window.history.replaceState(window.history.state, "", cleanUrl);

    if (result === "success") {
      toast.success("אמצעי התשלום נקלט אצל ספק הסליקה. ממתין לאישור המאומת...");
      window.setTimeout(() => void settlePaymentMethodAfterReturn(), 300);
    } else if (result === "failed") {
      toast.error("חיבור אמצעי התשלום נכשל אצל ספק הסליקה.");
    } else if (result === "cancelled") {
      toast.info("חיבור אמצעי התשלום בוטל.");
    }
  }, [organizationId, employerId]);

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setValidationAttempted(true);

    const normalized = {
      ...details,
      billingName: details.billingName.trim(),
      taxId: details.taxId.trim(),
      invoiceEmail: details.invoiceEmail.trim(),
      billingAddress: details.billingAddress.trim(),
    };
    const emailValid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalized.invoiceEmail);
    if (!normalized.billingName || !normalized.taxId || !normalized.invoiceEmail || !emailValid || !normalized.billingAddress) return;

    setSaving(true);
    try {
      const value = employerId
        ? await alphaApi.saveEmployerBillingAccount(organizationId, employerId, normalized)
        : await alphaApi.saveOrganizationBillingAccount(organizationId, normalized);

      setAccount(value);
      if (onSaved) await onSaved();

      if (normalized.paymentMethodType === 1 && !value.providerPaymentMethodId) {
        const url = new URL(window.location.href);
        url.searchParams.delete("payment");
        url.searchParams.set("tab", "billing");
        const returnPath = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
        const setup = employerId
          ? await alphaApi.startEmployerPaymentSetup(organizationId, employerId, returnPath)
          : await alphaApi.startOrganizationPaymentSetup(organizationId, returnPath);

        toast.success("פרטי החיוב נשמרו. ממשיכים לחיבור הכרטיס...");
        window.location.assign(setup.redirectUrl);
        return;
      }

      toast.success("פרטי החיוב ואמצעי התשלום נשמרו");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירת פרטי החיוב ואמצעי התשלום נכשלה");
    } finally {
      setSaving(false);
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
    if (!canManage || !account.configured) return;
    if (!window.confirm("לבטל את חשבון החיוב ואמצעי התשלום? הפעולה תנקה גם את פרטי החשבון השמורים.")) return;
    setCancelling(true);
    try {
      if (employerId) await alphaApi.cancelEmployerPaymentMethod(organizationId, employerId);
      else await alphaApi.cancelOrganizationPaymentMethod(organizationId);
      await load();
      toast.success("חשבון החיוב ואמצעי התשלום בוטלו");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ביטול אמצעי התשלום נכשל");
    } finally {
      setCancelling(false);
    }
  }

  const cardConnected = account.paymentMethodType === 1 && Boolean(account.providerPaymentMethodId);
  const bankConnected = account.paymentMethodType === 2 && Boolean(account.bankDebitMandateReference);

  if (loading) return <div className="empty">טוען פרטי חיוב...</div>;

  return <div className={embedded ? "billing-inline-form" : "employer-profile-stack organization-billing-shell"}>
    <section className={embedded ? "billing-inline-panel" : "card profile-card profile-payment-card payment-horizontal-shell"}>
      <div className="card-head">
        <div>
          <h2>חשבון לחיוב ALPHA</h2>
          <span style={{ color: "var(--muted)" }}>פרטי החיוב עבור השימוש ב־ALPHA. חשבון זה נפרד מחשבון התשלומים הפנסיוניים.</span>
        </div>
        <span className={account.paymentMethodStatus === 3 ? "badge badge-green" : "badge badge-gray"}>
          {billingStatusLabel(account.paymentMethodStatus)}
        </span>
      </div>

      {showOwnerContext ? <div className={`billing-owner-banner ${employerId ? "employer" : "organization"}`}>
        <div className="billing-source-icon">{employerId ? <CreditCard size={24} /> : <Landmark size={24} />}</div>
        <div>
          <span>הפרטים במסך הזה שייכים ל־</span>
          <strong>{employerId ? "המעסיק" : "הארגון"}</strong>
          <small>{employerId ? "אלו פרטי חיוב עצמאיים של המעסיק." : "אלו פרטי החיוב המרכזיים של הארגון."}</small>
        </div>
      </div> : null}

      {!canManage ? <div className="notice notice-info" style={{ marginBottom: 18 }}>החשבון מוצג לקריאה בלבד לפי ההרשאה שלך.</div> : null}

      <form className="form" onSubmit={saveDetails}>
        <div className="grid compact-payment-grid">
          <div className={`field${validationAttempted && !details.billingName.trim() ? " field-error" : ""}`}><label>שם לחיוב *</label><UiInput disabled={!canManage} maxLength={200} value={details.billingName} onChange={(e) => setDetails({ ...details, billingName: e.target.value })} />{validationAttempted && !details.billingName.trim() ? <span className="field-error-text">שם לחיוב הוא שדה חובה.</span> : null}</div>
          <div className={`field${validationAttempted && !details.taxId.trim() ? " field-error" : ""}`}><label>ח.פ. / עוסק *</label><UiInput disabled={!canManage} maxLength={30} value={details.taxId} onChange={(e) => setDetails({ ...details, taxId: e.target.value })} />{validationAttempted && !details.taxId.trim() ? <span className="field-error-text">ח.פ. / עוסק הוא שדה חובה.</span> : null}</div>
          <div className={`field${validationAttempted && (!details.invoiceEmail.trim() || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(details.invoiceEmail.trim())) ? " field-error" : ""}`}><label>אימייל לחשבוניות *</label><UiInput disabled={!canManage} type="email" maxLength={320} value={details.invoiceEmail} onChange={(e) => setDetails({ ...details, invoiceEmail: e.target.value })} />{validationAttempted && !details.invoiceEmail.trim() ? <span className="field-error-text">אימייל לחשבוניות הוא שדה חובה.</span> : validationAttempted && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(details.invoiceEmail.trim()) ? <span className="field-error-text">יש להזין כתובת אימייל תקינה.</span> : null}</div>
          <div className={`field${validationAttempted && !details.billingAddress.trim() ? " field-error" : ""}`}><label>כתובת לחיוב *</label><UiInput disabled={!canManage} maxLength={500} value={details.billingAddress} onChange={(e) => setDetails({ ...details, billingAddress: e.target.value })} />{validationAttempted && !details.billingAddress.trim() ? <span className="field-error-text">כתובת לחיוב היא שדה חובה.</span> : null}</div>
        </div>

        <div className="field">
          <label>אמצעי תשלום *</label>
          <div className="billing-method-choices">
            <UiChoiceCard disabled={!canManage} className="billing-method-card selected" selected>
              <CreditCard size={24} /><b>כרטיס אשראי</b><p>חיבור מאובטח דרך ספק הסליקה. ALPHA לא שומרת מספר כרטיס מלא או CVV.</p>
            </UiChoiceCard>
          </div>

          <div className="billing-method-next card-method">
            <div className="billing-source-icon"><CreditCard size={22} /></div>
            <div>
              <b>כרטיס אשראי</b>
              <p>{cardConnected
                ? "הכרטיס המחובר יישאר פעיל. שמירה תעדכן גם את פרטי חשבון החיוב."
                : "בלחיצה על שמירה פרטי החשבון יישמרו ומיד תועברו לחיבור הכרטיס המאובטח."}</p>
            </div>
          </div>
        </div>

        {account.configured ? <div className="notice notice-info">
          {account.paymentMethodType === 1
            ? cardConnected
              ? <>כרטיס מחובר דרך ספק הסליקה: {account.cardBrand || "Card"} · •••• {account.cardLast4 || "----"}{account.cardExpiryMonth && account.cardExpiryYear ? ` · ${String(account.cardExpiryMonth).padStart(2, "0")}/${account.cardExpiryYear}` : ""}</>
              : account.paymentMethodStatus === 2 ? "ממתין להשלמת החיבור אצל ספק הסליקה." : "עדיין לא חובר כרטיס דרך ספק הסליקה."
            : bankConnected
              ? <>Bank Debit מחובר · reference: {account.bankDebitMandateReference}</>
              : "Bank Debit עדיין לא חובר לספק התשלום."}
        </div> : null}

        {canManage ? <div className="form-actions" style={{ gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {cardConnected ? <button className="btn btn-secondary" type="button" disabled={syncing} onClick={() => void syncPaymentMethod()}><RefreshCw size={17} />{syncing ? "מסנכרן..." : "רענון סטטוס"}</button> : null}
            {account.configured ? <button className="btn btn-danger" type="button" disabled={cancelling} onClick={() => void cancelPaymentMethod()}><Trash2 size={16} />{cancelling ? "מבטל..." : "ביטול חשבון ואמצעי תשלום"}</button> : null}
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}><Save size={17} />{saving ? "שומר..." : "שמירת חשבון ואמצעי תשלום"}</button>
        </div> : null}
      </form>
    </section>

    <div className="notice notice-info">ALPHA אינה מקבלת ואינה שומרת מספר כרטיס מלא או CVV.</div>
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
