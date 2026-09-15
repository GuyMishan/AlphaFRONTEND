"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/session";
import { Eye, Play, RefreshCw, X } from "lucide-react";

type RunSummary = {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  recordsReceived: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsDeactivated: number;
  errorMessage: string | null;
};

type IntegrationRow = {
  key: string;
  name: string;
  lastRun: RunSummary | null;
};

type RunDetail = RunSummary & {
  integrationKey: string;
  integrationName: string;
  details?: Record<string, unknown> | null;
};

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  if (session?.mode === "development" && session.userId) {
    headers.set("X-Alpha-User-Id", session.userId);
    if (session.platformAdmin) headers.set("X-Alpha-Platform-Admin", "true");
  }
  const response = await fetch(`/api/backend${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    let message = `שגיאת שרת (${response.status})`;
    try {
      const body = await response.json();
      message = body.errorMessage ?? body.error ?? body.detail ?? body.title ?? message;
    } catch { /* empty body */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function formatDate(value?: string | null) {
  if (!value) return "טרם הורץ";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status?: string) {
  if (status === "Success") return "הושלם בהצלחה";
  if (status === "Failed") return "נכשל";
  if (status === "Running") return "רץ כעת";
  return status ?? "-";
}

export default function AdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const [history, setHistory] = useState<RunDetail[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);

  async function load() {
    setError("");
    try {
      setRows(await adminRequest<IntegrationRow[]>("/api/platform/reference-data/interfaces"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת הממשקים נכשלה");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const session = getSession();
    if (!session?.platformAdmin) {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [router]);

  async function runInterface(key: string) {
    setRunning(key);
    setError("");
    try {
      const result = await adminRequest<RunDetail>(`/api/platform/reference-data/interfaces/${key}/run`, { method: "POST" });
      setSelectedRun(result);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "הרצת הממשק נכשלה");
      await load();
    } finally {
      setRunning(null);
    }
  }

  async function openHistory(key: string) {
    setHistoryKey(key);
    setSelectedRun(null);
    try {
      setHistory(await adminRequest<RunDetail[]>(`/api/platform/reference-data/interfaces/${key}/runs?take=30`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת היסטוריית ההרצות נכשלה");
      setHistory([]);
    }
  }

  return <AppShell title="מסך אדמין" hideScopeController>
    <div className="page-head">
      <div><h1>מסך אדמין</h1><p>ניהול והפעלה ידנית של ממשקי נתוני המערכת</p></div>
      <button className="btn btn-secondary" type="button" onClick={() => void load()} disabled={loading || Boolean(running)}><RefreshCw size={16} />רענון</button>
    </div>

    <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
      <button type="button" className="btn btn-primary">ממשקים</button>
    </div>

    {error ? <div className="notice notice-error" style={{ marginBottom: 16 }}>{error}</div> : null}

    <section className="card" style={{ overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border, #dce3ea)" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>ממשקי סנכרון</h2>
        <p style={{ margin: "5px 0 0", color: "#64748b" }}>הנתונים נשמרים מקומית ב־DB. ההרצה אינה תלויה במשתמש או בדיווח.</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead><tr>
            {['ממשק','הרצה אחרונה','סטטוס','נקלטו','חדשות','עודכנו','הושבתו','פעולות'].map((x) => <th key={x} style={{ textAlign: "right", padding: 12, borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{x}</th>)}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ padding: 24, textAlign: "center" }}>טוען...</td></tr> : rows.map((row) => <tr key={row.key}>
              <td style={{ padding: 12, borderBottom: "1px solid #eef2f6" }}><b>{row.name}</b><div style={{ color: "#64748b", fontSize: 12 }}>{row.key}</div></td>
              <td style={{ padding: 12, borderBottom: "1px solid #eef2f6", whiteSpace: "nowrap" }}>{formatDate(row.lastRun?.finishedAt ?? row.lastRun?.startedAt)}</td>
              <td style={{ padding: 12, borderBottom: "1px solid #eef2f6" }}>{statusLabel(row.lastRun?.status)}</td>
              <td style={{ padding: 12, borderBottom: "1px solid #eef2f6" }}>{row.lastRun?.recordsReceived ?? '-'}</td>
              <td style={{ padding: 12, borderBottom: "1px solid #eef2f6" }}>{row.lastRun?.recordsInserted ?? '-'}</td>
              <td style={{ padding: 12, borderBottom: "1px solid #eef2f6" }}>{row.lastRun?.recordsUpdated ?? '-'}</td>
              <td style={{ padding: 12, borderBottom: "1px solid #eef2f6" }}>{row.lastRun?.recordsDeactivated ?? '-'}</td>
              <td style={{ padding: 12, borderBottom: "1px solid #eef2f6" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-primary" type="button" disabled={Boolean(running)} onClick={() => void runInterface(row.key)}><Play size={15} />{running === row.key ? "מריץ..." : "הרץ עכשיו"}</button>
                  <button className="btn btn-secondary" type="button" onClick={() => void openHistory(row.key)}><Eye size={15} />דוחות הרצה</button>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>

    {historyKey ? <div style={backdropStyle} onClick={() => setHistoryKey(null)}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}><div><h2 style={{ margin: 0 }}>דוחות הרצה</h2><div style={{ color: "#64748b", marginTop: 4 }}>{rows.find((x) => x.key === historyKey)?.name}</div></div><button className="btn btn-secondary" onClick={() => setHistoryKey(null)}><X size={17} /></button></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}><thead><tr>{['תאריך','סטטוס','נקלטו','חדשות','עודכנו','הושבתו','דוח'].map((x) => <th key={x} style={{ padding: 10, textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>{x}</th>)}</tr></thead>
            <tbody>{history.length === 0 ? <tr><td colSpan={7} style={{ padding: 20, textAlign: "center" }}>אין עדיין הרצות</td></tr> : history.map((run) => <tr key={run.id}>
              <td style={cellStyle}>{formatDate(run.startedAt)}</td><td style={cellStyle}>{statusLabel(run.status)}</td><td style={cellStyle}>{run.recordsReceived}</td><td style={cellStyle}>{run.recordsInserted}</td><td style={cellStyle}>{run.recordsUpdated}</td><td style={cellStyle}>{run.recordsDeactivated}</td>
              <td style={cellStyle}><button className="btn btn-secondary" onClick={() => setSelectedRun(run)}>פתח</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </div> : null}

    {selectedRun ? <div style={backdropStyle} onClick={() => setSelectedRun(null)}>
      <div style={{ ...modalStyle, maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeaderStyle}><div><h2 style={{ margin: 0 }}>דוח הרצה</h2><div style={{ color: "#64748b", marginTop: 4 }}>{selectedRun.integrationName}</div></div><button className="btn btn-secondary" onClick={() => setSelectedRun(null)}><X size={17} /></button></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 16 }}>
          {[['סטטוס',statusLabel(selectedRun.status)],['התחלה',formatDate(selectedRun.startedAt)],['סיום',formatDate(selectedRun.finishedAt)],['נקלטו',selectedRun.recordsReceived],['חדשות',selectedRun.recordsInserted],['עודכנו',selectedRun.recordsUpdated],['הושבתו',selectedRun.recordsDeactivated]].map(([label,value]) => <div key={String(label)} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}><div style={{ color: "#64748b", fontSize: 12 }}>{label}</div><b>{value}</b></div>)}
        </div>
        {selectedRun.errorMessage ? <div className="notice notice-error" style={{ marginBottom: 14 }}>{selectedRun.errorMessage}</div> : null}
        <h3 style={{ marginBottom: 8 }}>פרטי מקור</h3>
        <pre style={{ direction: "ltr", textAlign: "left", background: "#f8fafc", padding: 12, borderRadius: 10, overflow: "auto", whiteSpace: "pre-wrap" }}>{JSON.stringify(selectedRun.details ?? {}, null, 2)}</pre>
      </div>
    </div> : null}
  </AppShell>;
}

const backdropStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const modalStyle: React.CSSProperties = { width: "min(950px, 96vw)", maxHeight: "88vh", overflow: "auto", background: "white", borderRadius: 16, padding: 20, boxShadow: "0 24px 70px rgba(15,23,42,.25)" };
const modalHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 };
const cellStyle: React.CSSProperties = { padding: 10, borderBottom: "1px solid #eef2f6", whiteSpace: "nowrap" };
