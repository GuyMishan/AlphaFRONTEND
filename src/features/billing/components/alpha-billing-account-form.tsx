"use client";

import { useEffect, useState } from "react";
import { CreditCard, Landmark, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { billingApi } from "@/features/billing/api";
import { UiChoiceCard, UiInput } from "@/components/ui/ui-controls";
import type { AlphaBillingAccount, AlphaBillingAccountInput, BillingPaymentMethodStatus } from "@/features/billing/types";
import { billingAccountSchema } from "@/features/billing/schemas";
import { useZodForm } from "@/lib/forms/use-zod-form";
import { LoadingState } from "@/components/loading/loading-state";
import { errorMessage } from "@/lib/api/error-messages";
import { useLatestRequest } from "@/lib/hooks/use-latest-request";
import { replaceSearchParams } from "@/lib/url-search-params";

/** The payment provider's HTTPS page, or this app itself (the development fake provider redirects back here). */
function isAllowedPaymentRedirect(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "https:" || url.origin === window.location.origin;
  } catch {
    return false;
  }
}

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
  hasProviderPaymentMethod: false,
  cardBrand: "",
  cardLast4: "",
  cardExpiryMonth: null,
  cardExpiryYear: null,
  hasBankDebitMandate: false,
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
  // Errors appear after the first submit and then follow the input live, as before.
  const { register, handleSubmit, reset, formState: { errors } } = useZodForm(billingAccountSchema, {
    defaultValues: { billingName: "", taxId: "", invoiceEmail: "", billingAddress: "", paymentMethodType: 1 },
    reValidateMode: "onChange",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const requests = useLatestRequest(organizationId, employerId);

  async function load() {
    const isCurrent = requests.begin();
    setLoading(true);
    try {
      const value = employerId
        ? await billingApi.employerBillingAccount(organizationId, employerId)
        : await billingApi.organizationBillingAccount(organizationId);
      if (!isCurrent()) return;
      setAccount(value);
      reset({
        billingName: value.billingName,
        taxId: value.taxId,
        invoiceEmail: value.invoiceEmail,
        billingAddress: value.billingAddress,
        paymentMethodType: value.paymentMethodType,
      });

    } catch (err) {
      if (isCurrent()) toast.error(errorMessage(err, "טעינת פרטי החיוב נכשלה"));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }

  async function settlePaymentMethodAfterReturn(expectedReference?: string | null) {
    setSyncing(true);
    try {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          if (employerId) await billingApi.syncEmployerPaymentMethod(organizationId, employerId);
          else await billingApi.syncOrganizationPaymentMethod(organizationId);
          const verified = employerId ? await billingApi.employerBillingAccount(organizationId, employerId) : await billingApi.organizationBillingAccount(organizationId);
          if (verified.paymentMethodStatus !== 3 || !verified.hasProviderPaymentMethod || !expectedReference || verified.defaultPaymentMethodId === null || verified.paymentMethodStatus !== 3) throw new Error("Payment verification pending");
          await load();
          if (onSaved) await onSaved();
          toast.success("חשבון החיוב ואמצעי התשלום נשמרו והופעלו");
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


  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the scope changes; the loader reads the current props
  useEffect(() => { void load(); }, [organizationId, employerId]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("payment");
    const setupReference = url.searchParams.get("setup_reference");
    if (!result) return;

    replaceSearchParams((params) => { params.delete("payment"); params.delete("setup_reference"); });

    if (result === "success") {
      toast.info("ספק הסליקה החזיר אתכם למערכת. מאמתים את אישור הכרטיס...");
      window.setTimeout(() => void settlePaymentMethodAfterReturn(setupReference), 300);
    } else if (result === "failed" || result === "cancelled") {
      if (setupReference) {
        const abandon = employerId
          ? billingApi.abandonEmployerPaymentSetup(organizationId, employerId, setupReference)
          : billingApi.abandonOrganizationPaymentSetup(organizationId, setupReference);
        void abandon.then(() => load()).catch(() => load());
      }
      if (result === "failed") toast.error("חיבור הכרטיס נכשל. פרטי החיוב לא הופעלו.");
      else toast.info("חיבור הכרטיס בוטל. פרטי החיוב לא הופעלו.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- handle the provider return once per scope; settlePaymentMethodAfterReturn reads the current props
  }, [organizationId, employerId]);

  async function saveDetails(normalized: AlphaBillingAccountInput) {
    if (!canManage) return;
    setSaving(true);
    try {
      if (normalized.paymentMethodType === 1 && (!account.hasProviderPaymentMethod || account.paymentMethodStatus !== 3)) {
        const url = new URL(window.location.href);
        url.searchParams.delete("payment");
        url.searchParams.set("tab", "billing");
        const returnPath = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
        const setup = employerId
          ? await billingApi.startEmployerPaymentSetup(organizationId, employerId, returnPath, normalized)
          : await billingApi.startOrganizationPaymentSetup(organizationId, returnPath, normalized);

        // Never navigate to a javascript:/data:/plain-http URL from an API response.
        if (!isAllowedPaymentRedirect(setup.redirectUrl)) throw new Error("לא ניתן לפתוח את דף חיבור אמצעי התשלום.");
        toast.info("מועברים לאימות הכרטיס. ההגדרה תושלם רק לאחר אישור ספק הסליקה.");
        window.location.assign(setup.redirectUrl);
        return;
      }

      const value = employerId
        ? await billingApi.saveEmployerBillingAccount(organizationId, employerId, normalized)
        : await billingApi.saveOrganizationBillingAccount(organizationId, normalized);
      setAccount(value);
      if (onSaved) await onSaved();
      toast.success("פרטי החיוב ואמצעי התשלום נשמרו");
    } catch (err) {
      toast.error(errorMessage(err, "שמירת פרטי החיוב ואמצעי התשלום נכשלה"));
    } finally {
      setSaving(false);
    }
  }

  async function syncPaymentMethod() {
    setSyncing(true);
    try {
      if (employerId) await billingApi.syncEmployerPaymentMethod(organizationId, employerId);
      else await billingApi.syncOrganizationPaymentMethod(organizationId);
      await load();
      toast.success("סטטוס אמצעי התשלום סונכרן");
    } catch (err) {
      toast.error(errorMessage(err, "סנכרון אמצעי התשלום נכשל"));
    } finally {
      setSyncing(false);
    }
  }

  async function cancelPaymentMethod() {
    if (!canManage || !account.configured) return;
    if (!window.confirm("לבטל את חשבון החיוב ואמצעי התשלום? הפעולה תנקה גם את פרטי החשבון השמורים.")) return;
    setCancelling(true);
    try {
      if (employerId) await billingApi.cancelEmployerPaymentMethod(organizationId, employerId);
      else await billingApi.cancelOrganizationPaymentMethod(organizationId);
      await load();
      toast.success("חשבון החיוב ואמצעי התשלום בוטלו");
    } catch (err) {
      toast.error(errorMessage(err, "ביטול אמצעי התשלום נכשל"));
    } finally {
      setCancelling(false);
    }
  }

  const cardConnected = account.paymentMethodType === 1 && account.hasProviderPaymentMethod;
  const bankConnected = account.paymentMethodType === 2 && account.hasBankDebitMandate;

  if (loading) return <LoadingState label="טוען פרטי חיוב..." />;

  return <div className={embedded ? "billing-inline-form" : "employer-profile-stack organization-billing-shell"}>
    <section className={embedded ? "billing-inline-panel" : "card profile-card profile-payment-card payment-horizontal-shell"}>
      <div className="card-head">
        <div>
          <h2>חשבון לחיוב ALPHA</h2>
          <span style={{ color: "var(--color-text-muted)" }}>פרטי החיוב עבור השימוש ב־ALPHA. חשבון זה נפרד מחשבון התשלומים הפנסיוניים.</span>
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

      <form className="form" onSubmit={handleSubmit(saveDetails)}>
        <div className="grid compact-payment-grid">
          <div className={`field${errors.billingName ? " field-error" : ""}`}><label>שם לחיוב *</label><UiInput disabled={!canManage} maxLength={200} {...register("billingName")} />{errors.billingName ? <span className="field-error-text">{errors.billingName.message}</span> : null}</div>
          <div className={`field${errors.taxId ? " field-error" : ""}`}><label>ח.פ. / עוסק *</label><UiInput disabled={!canManage} maxLength={30} {...register("taxId")} />{errors.taxId ? <span className="field-error-text">{errors.taxId.message}</span> : null}</div>
          <div className={`field${errors.invoiceEmail ? " field-error" : ""}`}><label>אימייל לחשבוניות *</label><UiInput disabled={!canManage} type="email" maxLength={320} {...register("invoiceEmail")} />{errors.invoiceEmail ? <span className="field-error-text">{errors.invoiceEmail.message}</span> : null}</div>
          <div className={`field${errors.billingAddress ? " field-error" : ""}`}><label>כתובת לחיוב *</label><UiInput disabled={!canManage} maxLength={500} {...register("billingAddress")} />{errors.billingAddress ? <span className="field-error-text">{errors.billingAddress.message}</span> : null}</div>
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
                : "לאחר לחיצה על שמירה תועברו לאימות הכרטיס. החשבון יהיה פעיל רק לאחר אישור ספק הסליקה."}</p>
            </div>
          </div>
        </div>

        {account.configured ? <div className="notice notice-info">
          {account.paymentMethodType === 1
            ? cardConnected
              ? <>כרטיס מחובר דרך ספק הסליקה: {account.cardBrand || "Card"} · •••• {account.cardLast4 || "----"}{account.cardExpiryMonth && account.cardExpiryYear ? ` · ${String(account.cardExpiryMonth).padStart(2, "0")}/${account.cardExpiryYear}` : ""}</>
              : account.paymentMethodStatus === 2 ? "ממתין להשלמת החיבור אצל ספק הסליקה." : "עדיין לא חובר כרטיס דרך ספק הסליקה."
            : bankConnected
              ? <>Bank Debit מחובר</>
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
