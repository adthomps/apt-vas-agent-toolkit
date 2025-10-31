import React, { useEffect, useState } from 'react';
// Import a bundled markdown file (raw) to render in-app (Vite supports ?raw import)
// This file is added to the UI source so the app can render the implementation docs in a modal.
// If your dev server doesn't support raw imports, fallback behavior simply shows the short link.
import type { Toast, Invoice, PayLink } from './types.ts';
import { colors, radii, fonts, shadow } from './theme.ts';
// framer-motion removed — use standard CSS transitions for hover/opacity

const CARD_BG = colors.surface;
const CARD_ALT = colors.background;
const HEADER_BG = colors.primary;
const HEADER_FONT_WEIGHT = 700;
const TABLE_FONT = `14px ${fonts.body}`;
const ROW_HOVER = colors.background;
const ROW_FONT_WEIGHT = 500;
// Use a CSS variable for input backgrounds so we can fine-tune tone in one place
const INPUT_BG = 'var(--input-bg)';
const SHADOW = shadow;
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];
import { Bot, Send, RefreshCw, FileText, Link as LinkIcon, Hash, DollarSign, User as UserIcon, Calendar, Zap, Copy, ExternalLink, Mail, Cog, Tag, Sun, Moon, Monitor, Trash2 } from 'lucide-react';
import { loadModule } from './loadModule.ts';

// --- Utility imports and UI constants ---
// apiBase: Returns API base URL from window-scoped override or relative default
const apiBase = () => {
  const w: any = typeof window !== 'undefined' ? window : undefined;
  const base = w?.VITE_API_BASE || w?.API_BASE || '';
  return typeof base === 'string' ? base : '';
};

// useFetch: Simple data fetching hook
function pickMessage(x:any): string | undefined {
  if (!x) return undefined;
  if (typeof x === 'string') return x;
  return (
    x.message || x.error?.message || x.error_description ||
    (Array.isArray(x.errors) && x.errors[0]?.message) || x.detail || x.title || undefined
  );
}
function humanizeHttp(status:number|undefined, body:any, fallback?:string): string {
  const prefix = status ? `HTTP ${status}` : 'Request failed';
  const msg = pickMessage(body) || fallback;
  return msg ? `${prefix}: ${msg}` : prefix;
}
function useFetch<T = any>(url: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ ok: boolean; status: number; rawText: string | null } | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = () => setNonce((n) => n + 1);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true); setError(null);
      try {
        const r = await fetch(url);
        const t = await r.text();
        let v:any = t; try { v = JSON.parse(t); } catch {}
        if (!cancelled) {
          setData(v);
          setMeta({ ok: r.ok, status: r.status, rawText: t });
          if (!r.ok) setError(humanizeHttp(r.status, v, typeof t === 'string' ? t : undefined));
        }
      }
      catch (e:any) {
        if (!cancelled) {
          setError(String(e?.message || e));
          setMeta({ ok: false, status: 0, rawText: String(e) });
        }
      }
      finally { if (!cancelled) setLoading(false); }
    }
    if (url) run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce, ...deps]);
  return { data, loading, error, refresh, meta } as const;
}

// --- Agent Panel (restored) ---
type AgentStage = 'input' | 'extract' | 'prompt' | 'confirm' | 'submit' | 'done'
const TOOL_OPTIONS = [
  { value: 'auto', label: 'Auto (AI decides)' },
  { value: 'create-invoice', label: 'Create Invoice' },
    // Update actions intentionally removed from the canned AI surface to
    // simplify the agent prompts and avoid offering high-risk automatic
    // update actions in examples.
  { value: 'list-invoices', label: 'List Invoices' },
  { value: 'send-invoice', label: 'Send Invoice' },
  { value: 'create-pay-link', label: 'Create Pay Link' },
  { value: 'list-pay-links', label: 'List Pay Links' },
]

function daysBetweenToday(isoDate?: string): number | undefined {
  if (!isoDate) return undefined;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return undefined;
  const today = new Date();
  const ms = d.setHours(0,0,0,0) - today.setHours(0,0,0,0);
  return Math.max(0, Math.round(ms / (24*60*60*1000)));
}

function AgentPanel({ toast }: { toast: (m:string, t?: Toast['type'])=>void }) {
  const [stage, setStage] = useState<AgentStage>('input');
  const [action, setAction] = useState<string>('auto');
  const [input, setInput] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const [errorRaw, setErrorRaw] = useState<string | null>(null);
  const [showErrorRaw, setShowErrorRaw] = useState<boolean>(false);
  const [extracted, setExtracted] = useState<any>({});
  const [missing, setMissing] = useState<Record<string,string | null> | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  // Inline edit state for confirmation step
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editDraft, setEditDraft] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [resultRaw, setResultRaw] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<number | null>(null);
  const [detectedAction, setDetectedAction] = useState<string | null>(null);
  const samples = [
    // Invoice examples include amount, currency, recipient/email, and due date or explicit date
    'Create an invoice for $450.00 USD to billing@acme.example for ACME Corp, due in 15 days. Memo: Website redesign.',
    'Find all unpaid invoices over $500 USD',
    // 'Update' sample removed intentionally (update actions not offered in the canned prompts)
    // Pay-by-link examples: include amount/currency or min/max for donations, and a product description
    'Create a pay link for $25.00 USD for "Sticker Pack" with memo "Sticker Pack" (purchase).',
    'Create a donation link with min amount 1.00 USD and max amount 500.00 USD, memo "Charity Drive" (donation).'
  ];

  // Add a list-pay-links sample to demonstrate listing pay links via the agent
  samples.push('List pay links created in the last 30 days');

  const handleAssist = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    setBusy(true); setError(null); setStage('extract'); setResult(null);
    try {
      const r = await fetch(`${apiBase()}/api/assist`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ prompt: input, action }) });
      const t = await r.text(); let j: any; try { j = JSON.parse(t); } catch { j = { error: true, message: t } }
      if (!r.ok) { setErrorRaw(t); throw new Error(humanizeHttp(r.status, j, t)); }
      // If the server returns a direct result for list actions, render immediately
      if (j?.type === 'result') {
        if (j?.action && j.action !== action) setDetectedAction(j.action);
        setResult(j.result);
        setResultRaw(typeof j.result === 'string' ? j.result : JSON.stringify(j.result));
        setResultStatus(200);
        setStage('done');
        toast('Result ready', 'success');
        return;
      }
      // Otherwise, enter confirmation with extracted fields
      if (j?.type === 'confirmation') {
        const serverExtracted = j.fields || {};
        // eslint-disable-next-line no-console
        console.info('Assist confirmation fields:', serverExtracted);
        setExtracted(serverExtracted);
        const missingKeys: string[] = Array.isArray(j.missing) ? j.missing : [];
        setMissing(missingKeys.reduce((acc:Record<string,string|null>, k:string)=>{ acc[k]=k; return acc; }, {}));
        if (j.action && j.action !== action) setDetectedAction(j.action);
        setFieldValues(serverExtracted);
        setEditMode(!!(missingKeys && missingKeys.length));
        setEditDraft({});
        setStage('confirm');
        toast('Review and confirm', 'success');
        return;
      }
      // Fallback: treat as extraction payload (back-compat)
      const serverExtracted = j.extracted || {};
      setExtracted(serverExtracted);
      setFieldValues(serverExtracted);
      setMissing(null);
      setStage('confirm');
    } catch (e:any) {
      setError(e); setShowErrorRaw(false); setStage('input'); toast('Extraction failed', 'error');
    } finally { setBusy(false); }
  };

  const handleMissingChange = (key: string, value: any) => {
    setFieldValues(s => ({ ...s, [key]: value }));
  };

  function buildAssistPreview(): { method: 'POST'; url: string; body: any } | null {
    const eff = (detectedAction || action);
    const body = { prompt: input, action: eff, confirm: false, overrides: canonical };
    return { method: 'POST', url: `${apiBase()}/api/assist`, body };
  }

  const handleConfirm = async () => {
    const eff = (detectedAction || action);
    const body = { prompt: input, action: eff, confirm: true, overrides: canonical };
    setBusy(true); setStage('submit'); setError(null); setResult(null);
    try {
      const r = await fetch(`${apiBase()}/api/assist`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      const t = await r.text(); let j:any; try { j = JSON.parse(t); } catch { j = t; }
      const payload = j?.type === 'result' ? j.result : j;
      setResult(payload); setResultRaw(typeof payload === 'string' ? payload : JSON.stringify(payload)); setResultStatus(r.status || null);
      setStage('done');
      toast(r.ok ? 'Agent flow complete' : 'Request failed', r.ok ? 'success' : 'error');
    } catch (e:any) {
      const msg = String(e);
      setResult({ error: true, message: msg }); setResultRaw(msg); setResultStatus(null);
      setStage('done'); toast('Request error', 'error');
    } finally { setBusy(false); }
  };

  const handleRestart = () => {
    setStage('input'); setInput(''); setExtracted({}); setMissing(null); setFieldValues({}); setEditMode(false); setEditDraft({}); setResult(null); setError(null); setDetectedAction(null);
  };

  // Compute canonical, de-duplicated fields for confirmation display/edit
  const effectiveAction = detectedAction || action;
  const canonical = React.useMemo(() => {
    const v = fieldValues || {};
    const canon: Record<string, any> = {};
    // Prefer canonical keys and fold synonyms
    // Email
    canon.email = v.email || v.customerEmail || v.recipient || '';
    // Customer name
    canon.customerName = v.customerName || v.name || '';
    // Amount/currency
    canon.amount = v.amount ?? '';
    canon.currency = (v.currency ? String(v.currency).toUpperCase() : '');
    // Memo/description
    canon.memo = v.memo || v.description || '';
    // Dates
    canon.dueDate = v.dueDate || '';
    // Invoice identifiers
    canon.invoiceId = v.invoiceId || v.id || '';
    // Status (for list filters)
    canon.status = v.status || '';
    // Pay link specifics
    let lt = v.linkType || v.link_type || '';
    let ltUpper = lt ? String(lt).toUpperCase() : '';
    if (!ltUpper && (effectiveAction === 'create-pay-link' || effectiveAction === 'create_payment_link')) {
      ltUpper = 'PURCHASE';
    }
    canon.linkType = ltUpper;
    canon.minAmount = v.minAmount ?? '';
    canon.maxAmount = v.maxAmount ?? '';
    return canon;
  }, [fieldValues, detectedAction, action, effectiveAction]);

  // Determine required fields per action and current values
  const requiredKeysForAction = (act: string | null, values: Record<string, any>): string[] => {
    const a = act || 'auto';
    const req = new Set<string>();
    if (a === 'create-invoice' || a === 'create_invoice') {
      req.add('email'); req.add('amount'); req.add('currency');
    } else if (a === 'update-invoice' || a === 'update_invoice') {
      req.add('invoiceId');
    } else if (a === 'send-invoice' || a === 'send_invoice') {
      req.add('invoiceId');
    } else if (a === 'create-pay-link' || a === 'create_payment_link') {
      // Always require currency; require amount for PURCHASE; minAmount for DONATION.
      req.add('currency');
      const lt = String(values.linkType || '').toUpperCase() || 'PURCHASE';
      if (lt === 'DONATION') req.add('minAmount'); else req.add('amount');
    }
    // list-* and auto: no required fields here
    return Array.from(req);
  };
  const requiredKeys = React.useMemo(() => requiredKeysForAction(effectiveAction, canonical), [effectiveAction, canonical]);
  const missingRequired = React.useMemo(() => requiredKeys.filter(k => {
    const v = (canonical as any)[k];
    return v === undefined || v === null || String(v).trim() === '';
  }), [requiredKeys, canonical]);
  const canSubmit = missingRequired.length === 0;

  // Initialize edit draft when entering edit mode
  const beginEdit = () => {
    setEditDraft(canonical);
    setEditMode(true);
  };
  const cancelEdit = () => {
    setEditMode(false);
    setEditDraft({});
  };
  const saveEdit = () => {
    // Persist draft into fieldValues using canonical keys as source of truth
    const d = editDraft || {};
    setFieldValues((prev) => {
      const next = { ...prev } as Record<string, any>;
      // Core fields
      if (d.email !== undefined) next.email = d.email;
      if (d.customerName !== undefined) next.customerName = d.customerName;
      if (d.amount !== undefined) next.amount = d.amount;
      if (d.currency !== undefined) next.currency = (d.currency ? String(d.currency).toUpperCase() : d.currency);
      if (d.memo !== undefined) next.memo = d.memo;
      if (d.dueDate !== undefined) next.dueDate = d.dueDate;
      // IDs / status
      if (d.invoiceId !== undefined) { next.invoiceId = d.invoiceId; next.id = next.id || d.invoiceId; }
      if (d.status !== undefined) next.status = d.status;
      // Pay link fields
      if (d.linkType !== undefined) next.linkType = (d.linkType ? String(d.linkType).toUpperCase() : d.linkType);
      if (d.minAmount !== undefined) next.minAmount = d.minAmount;
      if (d.maxAmount !== undefined) next.maxAmount = d.maxAmount;
      // Clean incompatible fields based on linkType
      const eff = detectedAction || action;
      const isCreatePL = eff === 'create-pay-link' || eff === 'create_payment_link';
      if (isCreatePL) {
        const lt = next.linkType || '';
        const isDonation = String(lt).toUpperCase() === 'DONATION';
        if (isDonation) { delete next.amount; }
        else { delete next.minAmount; delete next.maxAmount; }
      }
      return next;
    });
    setEditMode(false);
    setEditDraft({});
  };

  // Field render helpers for confirmation/edit
  const labelFor = (k: string) => ({
    email: 'Customer Email',
    customerName: 'Customer Name',
    amount: 'Amount',
    currency: 'Currency',
    memo: 'Memo / Description',
    dueDate: 'Due Date',
    invoiceId: 'Invoice ID',
    status: 'Status',
    linkType: 'Link Type',
    minAmount: 'Min Amount',
    maxAmount: 'Max Amount',
  } as Record<string,string>)[k] || k;

  const orderForAction = (act: string | null) => {
    const a = act || 'auto';
    if (a === 'create-invoice' || a === 'create_invoice') return ['email','customerName','amount','currency','memo','dueDate'];
    if (a === 'update-invoice' || a === 'update_invoice') return ['invoiceId','amount','currency','memo','dueDate'];
    if (a === 'send-invoice' || a === 'send_invoice') return ['invoiceId'];
    if (a === 'list-invoices' || a === 'list_invoices') return ['status'];
    if (a === 'create-pay-link' || a === 'create_payment_link') return ['linkType','amount','minAmount','maxAmount','currency','memo'];
    if (a === 'list-pay-links' || a === 'list_pay_links') return ['status'];
    // auto / unknown: show a sensible subset
    return ['email','customerName','amount','currency','memo','dueDate','linkType','minAmount','maxAmount','invoiceId','status'];
  };

  return (
    <div
      className="card"
      style={{
        padding: 24,
        borderRadius: radii.card,
        background: CARD_BG,
        boxShadow: SHADOW,
        fontFamily: fonts.body,
        color: colors.textPrimary,
        marginBottom: 32,
        transition: 'transform 160ms ease, box-shadow 160ms ease, opacity 200ms ease',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        fontWeight: 700,
        color: colors.textPrimary,
      }}>
        <Bot size={20} />
        <div style={{ fontSize: 18, fontFamily: fonts.heading }}>AI Agent Assistant</div>
        {action === 'auto' && detectedAction && (
          <span className="status-badge primary" style={{marginLeft:8, background: colors.secondary, color: colors.textPrimary, borderRadius: radii.button, padding: '2px 8px', fontWeight: 600}}>
            Detected: {detectedAction}
          </span>
        )}
      </div>

      {stage === 'input' && (
        <form onSubmit={handleAssist}>
          <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={'e.g., "Create invoice for $100 to Acme"'}
            style={{
              width: '100%',
              minHeight: 96,
              padding: '16px 18px',
              borderRadius: radii.input,
              border: 'none',
              background: INPUT_BG,
              color: 'var(--color-text-primary)',
              marginBottom: 16,
              resize: 'vertical',
              fontFamily: fonts.body,
              fontSize: 15,
              lineHeight: 1.45,
              boxSizing: 'border-box',
            }}
          />
          <div style={{fontWeight:600, marginBottom:8, color:'var(--color-text-secondary)'}}>Action</div>
          <select className="input" value={action} onChange={e=>setAction(e.target.value)} disabled={busy}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: radii.input,
              border: 'none',
              background: INPUT_BG,
              color: 'var(--color-text-primary)',
              marginBottom: 14,
              fontFamily: fonts.body,
              boxSizing: 'border-box',
            }}>
            {TOOL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{display:'flex', flexWrap:'wrap', gap:8, marginBottom:12}}>
            {samples.map((s, i) => (
              <button key={i} type="button" className="btn secondary mini" onClick={()=>setInput(s)}
                style={{
                  padding: '6px 10px',
                  borderRadius: radii.button,
                  background: 'var(--color-secondary)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 500,
                  fontFamily: fonts.body,
                  border: 'none',
                  cursor: 'pointer',
                }}
                title="Click to use this prompt"
              >
                Use: {s.length > 42 ? s.slice(0, 41) + '…' : s}
              </button>
            ))}
          </div>
          <button className="btn" aria-label="Submit Request" type="submit" disabled={busy || !input.trim()}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: radii.button,
              fontWeight: 800,
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontFamily: fonts.body,
              fontSize: 15,
              border: 'none',
              boxShadow: shadow,
              cursor: 'pointer',
            }}
          >
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: radii.button,
              background: 'var(--overlay)'
            }}><Send size={16} /></span>
            <span style={{fontSize:15}}>Submit Request</span>
          </button>
          {error && (
            <div className="muted" style={{marginTop:8, color:'var(--color-error)'}}>
              <div style={{fontWeight:600}}>Something went wrong.</div>
              <div>{typeof error === 'string' ? error : String(error?.message || 'An error occurred.')}</div>
              {errorRaw ? (
                <div style={{marginTop:6}}>
                  <button type="button" className="btn secondary mini" onClick={()=>setShowErrorRaw(v=>!v)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: radii.button,
                      background: 'var(--color-error)',
                      color: 'var(--color-text-primary)',
                      fontWeight: 500,
                      fontFamily: fonts.body,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {showErrorRaw ? 'Hide raw response' : 'Show raw response'}
                  </button>
                  {showErrorRaw && (
                    <pre style={{
                      marginTop: 6,
                      padding: 8,
                      borderRadius: radii.input,
                      background: 'var(--background)',
                      color: 'var(--color-text-primary)',
                      maxHeight: 200,
                      overflow: 'auto',
                      fontSize: 12,
                      fontFamily: fonts.mono,
                    }}>{errorRaw}</pre>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </form>
      )}

      {stage === 'extract' && (
        <div style={{margin:'24px 0', textAlign:'center', color:colors.textSecondary}}>Extracting fields…</div>
      )}

      {stage === 'prompt' && (
        <form onSubmit={(e)=>{ e.preventDefault(); setStage('confirm'); }}>
          <div style={{marginBottom:10, color:'var(--color-text-secondary)'}}>Please provide the following details:</div>
          {Object.entries(missing || {}).map(([key]) => (
            <div key={key} style={{marginBottom:10}}>
              <label style={{fontWeight:600, color:'var(--color-text-secondary)'}}>{key}</label>
              <input className="input" type="text" value={fieldValues[key] || ''} onChange={e=>handleMissingChange(key, e.target.value)} required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: radii.input,
                  border: 'none',
                  background: INPUT_BG,
                  color: 'var(--color-text-primary)',
                  marginTop: 4,
                  fontFamily: fonts.body,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
          <button className="btn" type="submit"
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: radii.button,
              fontWeight: 800,
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              marginTop: 8,
              fontFamily: fonts.body,
              border: 'none',
              boxShadow: shadow,
              cursor: 'pointer',
            }}
          >Continue</button>
        </form>
      )}

      {stage === 'confirm' && (
        <div>
          {missingRequired.length > 0 && (
            <div style={{
              marginBottom: 10,
              padding: '8px 10px',
              borderRadius: radii.input,
              background: 'var(--color-error-bg)',
              border: '1px solid var(--color-error)',
              color: 'var(--color-error)'
            }}>
              <div style={{fontWeight: 700}}>Missing required fields</div>
              <div style={{fontSize: 13}}>Please provide: {missingRequired.map(labelFor).join(', ')}. Click Edit to fill these in.</div>
            </div>
          )}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
            <div style={{color:colors.textSecondary}}>Confirm details:</div>
            {!editMode ? (
              <button className="btn secondary mini" onClick={beginEdit} style={{padding:'6px 10px', borderRadius:8}}>Edit</button>
            ) : (
              <div style={{display:'inline-flex', gap:8}}>
                <button className="btn secondary mini" onClick={cancelEdit} style={{padding:'6px 10px', borderRadius:8}}>Cancel</button>
                <button className="btn mini" onClick={saveEdit} style={{padding:'6px 10px', borderRadius:8}}>Save</button>
              </div>
            )}
          </div>
          {(() => { const p = buildAssistPreview(); if (!p) return null; const hasBody = p.body !== undefined; return (
            <div style={{
              marginBottom: 12,
              padding: '8px 10px',
              border: `1px solid var(--color-secondary)`,
              borderRadius: radii.input,
              background: 'var(--card)',
            }}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom: hasBody ? 6 : 0}}>
                <span className="status-badge primary" style={{
                  fontFamily: fonts.mono,
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  borderRadius: radii.button,
                  padding: '2px 8px',
                  fontWeight: 600,
                }}>{p.method}</span>
                <code style={{
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: colors.textSecondary,
                }}>{p.url.replace(location.origin, '')}</code>
              </div>
              {hasBody && (
                <pre style={{
                  margin: 0,
                  padding: 8,
                  background: 'var(--background)',
                  color: 'var(--color-text-primary)',
                  borderRadius: radii.input,
                  maxHeight: 160,
                  overflow: 'auto',
                  fontSize: 12,
                  fontFamily: fonts.mono,
                }}>{JSON.stringify(p.body, null, 2)}</pre>
              )}
            </div>
          ); })()}
          {!editMode ? (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14,
              background: 'transparent',
              marginBottom: 12,
              fontFamily: fonts.body,
            }}>
              <tbody>
                {orderForAction(effectiveAction).filter((k)=>{
                  // hide donation-specific when purchase and vice-versa
                  if (k === 'minAmount' || k === 'maxAmount') return (canonical.linkType || '').toUpperCase() === 'DONATION';
                  if (k === 'amount') return (canonical.linkType || '').toUpperCase() !== 'DONATION';
                  return true;
                }).filter((k)=> canonical[k] !== '' && canonical[k] !== undefined).map((k) => (
                  <tr key={k}>
                    <td style={{padding:'6px 8px', fontWeight:600, color:colors.textSecondary}}>
                      <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                        <span>{labelFor(k)}</span>
                        {missingRequired.includes(k) && (
                          <span className="status-badge destructive" style={{padding:'2px 6px', fontSize:11}}>Missing</span>
                        )}
                      </span>
                    </td>
                    <td style={{padding:'6px 8px', color:colors.textPrimary}}>{String(canonical[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16}}>
              {orderForAction(effectiveAction).map((k) => {
                // Conditional visibility matching view mode
                if ((k === 'minAmount' || k === 'maxAmount') && String(editDraft.linkType || canonical.linkType || '').toUpperCase() !== 'DONATION') return null;
                if (k === 'amount' && String(editDraft.linkType || canonical.linkType || '').toUpperCase() === 'DONATION') return null;
                const label = labelFor(k);
                const val = (editDraft[k] ?? canonical[k]) ?? '';
                if (k === 'currency') {
                  return (
                    <div key={k}>
                      <div style={{fontWeight:600, marginBottom:8, color:'var(--color-text-secondary)'}}>{label}</div>
                      <select className="input" value={val} onChange={(e)=>setEditDraft(d=>({ ...d, currency: e.target.value }))} style={{width:'100%', padding:'12px 14px', borderRadius:12, border:'none', background: 'var(--input-bg)', color:'var(--color-text-primary)'}}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                      </select>
                    </div>
                  );
                }
                if (k === 'linkType') {
                  return (
                    <div key={k}>
                      <div style={{fontWeight:600, marginBottom:8, color:'var(--color-text-secondary)'}}>{label}</div>
                      <select className="input" value={val || 'PURCHASE'} onChange={(e)=>setEditDraft(d=>({ ...d, linkType: String(e.target.value).toUpperCase() }))} style={{width:'100%', padding:'12px 14px', borderRadius:12, border:'none', background: 'var(--input-bg)', color:'var(--color-text-primary)'}}>
                        <option value="PURCHASE">Purchase</option>
                        <option value="DONATION">Donation</option>
                      </select>
                    </div>
                  );
                }
                if (k === 'memo') {
                  return (
                    <div key={k} style={{gridColumn:'1 / -1'}}>
                      <div style={{fontWeight:600, marginBottom:8, color:'var(--color-text-secondary)'}}>{label}</div>
                      <textarea className="input" value={val} onChange={(e)=>setEditDraft(d=>({ ...d, memo: e.target.value }))} style={{width:'100%', padding:'12px 14px', borderRadius:12, border:'none', minHeight:96, background: 'var(--input-bg)', color:'var(--color-text-primary)'}} />
                    </div>
                  );
                }
                if (k === 'dueDate') {
                  return (
                    <div key={k}>
                      <div style={{fontWeight:600, marginBottom:8, color:'var(--color-text-secondary)'}}>{label}</div>
                      <input className="input" type="date" value={val} onChange={(e)=>setEditDraft(d=>({ ...d, dueDate: e.target.value }))} style={{width:'100%', padding:'12px 14px', borderRadius:12, border:'none', background: 'var(--input-bg)', color:'var(--color-text-primary)'}} />
                    </div>
                  );
                }
                return (
                  <div key={k}>
                    <div style={{fontWeight:600, marginBottom:8, color:'var(--color-text-secondary)'}}>{label}</div>
                    <input className="input" value={val} onChange={(e)=>setEditDraft(d=>({ ...d, [k]: e.target.value }))} style={{width:'100%', padding:'12px 14px', borderRadius:12, border:'none', background: 'var(--input-bg)', color:'var(--color-text-primary)'}} />
                  </div>
                );
              })}
            </div>
          )}
          <button className="btn" onClick={handleConfirm} disabled={!canSubmit}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: radii.button,
              fontWeight: 800,
              background: colors.success,
              color: colors.textPrimary,
              fontFamily: fonts.body,
              border: 'none',
              boxShadow: shadow,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              marginTop: 4,
            }}
            title={canSubmit ? undefined : `Please fill required: ${missingRequired.map(labelFor).join(', ')}`}
          >Submit</button>
          {!canSubmit && (
            <div style={{marginTop:6, fontSize:12, color:'var(--color-text-secondary)'}}>
              Why is Submit disabled? Missing: {missingRequired.map(labelFor).join(', ')}
            </div>
          )}
        </div>
      )}

      {stage === 'submit' && (
        <div style={{margin:'24px 0', textAlign:'center', color:'var(--color-text-primary)'}}>Submitting…</div>
      )}


      {stage === 'done' && (
        <div>
          <div style={{marginBottom:10, color:'var(--color-text-primary)'}}>Result:</div>
          {resultStatus !== null && (
            <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
              <span className={`status-badge ${result && !result.error ? 'success' : 'destructive'}`}>{(result && !result.error) ? 'OK' : 'ERR'}</span>
              <span className="mono">{`HTTP ${resultStatus}`}</span>
              {resultRaw ? (
                <button className="btn secondary mini" onClick={()=>setShowErrorRaw(v=>!v)} style={{marginLeft:'auto', padding:'6px 10px', borderRadius:8}}>
                  {showErrorRaw ? 'Hide raw' : 'Show raw'}
                </button>
              ) : null}
            </div>
          )}
          {/* If the AI returned invoices or payment links, render them using the same table UI */}
          {(() => {
            // Normalized payload detection
            const body = result;
            if (!body) return <pre style={{margin:0, padding:12, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace', fontSize:13, whiteSpace:'pre-wrap', wordBreak:'break-word', background:'var(--background)', color:'var(--color-text-primary)', borderRadius:8}}>{JSON.stringify(result, null, 2)}</pre>;
            const act = (detectedAction || action) as string | null;
            const preferPaylinks = act === 'list-pay-links' || act === 'list_pay_links';
            const preferInvoices = act === 'list-invoices' || act === 'list_invoices';

            // Heuristics to detect single-object create results
            const looksLikeInvoice = (o:any) => !!o && typeof o === 'object' && o.id && (o.orderInformation?.amountDetails || o.invoiceInformation || o.customerInformation);
            const looksLikePaylink = (o:any) => !!o && typeof o === 'object' && o.id && (o.paymentLink || o.paymentLinkUrl || o.paymentPageUrl || o.amount || o.minAmount || o.maxAmount || o.linkType || o.LinkType || o.currency);

            // payment-links list (robust extraction: support nested shapes)
            const paylinks =
              (Array.isArray(body?.paymentLinks) ? body.paymentLinks : null)
              || (Array.isArray(body?.links) ? body.links : null)
              || (Array.isArray(body?.items) ? body.items : null)
              || (Array.isArray(body?.data?.paymentLinks) ? body.data.paymentLinks : null)
              || (Array.isArray(body?.data?.items) ? body.data.items : null)
              || (Array.isArray(body?.paymentLinks?.paymentLinks) ? body.paymentLinks.paymentLinks : null)
              || (Array.isArray(body?.paymentLinks?.items) ? body.paymentLinks.items : null)
              || (Array.isArray(body) ? body : null)
              || (body?.paymentLink ? [body.paymentLink] : []);
            const hasPLKey = !!(body?.paymentLinks || body?.links || body?.data?.paymentLinks || body?.paymentLinks?.paymentLinks || body?.paymentLink);
            const singlePaylink = looksLikePaylink(body) && !Array.isArray(body) ? [body] : null;

            // invoices list
            const invoices = body.invoices || (preferInvoices ? (body.items || []) : (undefined)) || (Array.isArray(body) && body) || (body?.invoice ? [body.invoice] : []);
            const hasInvKey = !!(body?.invoices || body?.invoice);
            const singleInvoice = looksLikeInvoice(body) && !Array.isArray(body) ? [body] : null;

            // Prefer rendering based on detected action or present keys (support single-object create results)
            if (preferPaylinks || hasPLKey || (Array.isArray(singlePaylink) && singlePaylink.length > 0) || (Array.isArray(paylinks) && paylinks.length > 0)) {
              const maxRows = 5;
              const displayPaylinks: (any|null)[] = (() => {
                const source = (singlePaylink || paylinks) as any[] | null;
                const s = Array.isArray(source) ? source.slice(0, maxRows) : [];
                if (s.length < maxRows) return s.concat(Array.from({ length: maxRows - s.length }, () => null));
                return s;
              })();
              return (
                <div style={{marginTop:8}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:8}}>
                    <div style={{fontWeight:800, fontSize:16}}>AI — Payment Links</div>
                    <div style={{display:'flex', gap:12, alignItems:'center'}}>
                      <div style={{display:'inline-flex', alignItems:'center', gap:8}}>
                        <span style={{background: colors.success, color: '#fff', padding: '4px 8px', borderRadius: 8, fontWeight: 800, fontSize: 12}}>PURCHASE</span>
                        <span style={{color: colors.textSecondary, fontSize: 13}}>One-time purchase</span>
                      </div>
                      <div style={{display:'inline-flex', alignItems:'center', gap:8}}>
                        <span style={{background: colors.secondary, color: '#fff', padding: '4px 8px', borderRadius: 8, fontWeight: 800, fontSize: 12}}>DONATION</span>
                        <span style={{color: colors.textSecondary, fontSize: 13}}>Donation (min/max)</span>
                      </div>
                    </div>
                  </div>
                  <table style={{width:'100%', borderCollapse: 'collapse', marginTop:8, background: CARD_BG, borderRadius:8, overflow:'hidden', boxShadow: 'var(--shadow-strong)', fontFamily: TABLE_FONT}}>
                    <thead>
                      <tr style={{background: HEADER_BG}}>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>ID</th>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Created</th>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Type</th>
                        <th style={{textAlign:'right', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, minWidth:140}}>Amount</th>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Product Name</th>
                        <th style={{textAlign:'center', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayPaylinks.map((pl:any|null, i:number) => {
                        if (!pl) {
                          return (
                            <tr key={`ai-pl-pad-${i}`} style={{borderBottom:`1px solid var(--divider-faint)`, background: CARD_BG}}>
                              <td className="mono" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:.45}}>—</td>
                              <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:.45}}>—</td>
                              <td style={{padding:'14px 16px'}}>
                                <span style={{display:'inline-flex', alignItems:'center', gap:8}}>
                                  <span style={{background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '4px 8px', borderRadius: 8, fontWeight: 800, fontSize: 12, lineHeight: '1', opacity:.3}}>—</span>
                                </span>
                              </td>
                              <td style={{padding:'14px 16px', textAlign:'right', fontFamily: TABLE_FONT, fontWeight: 700, fontSize:18, minWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:.45}}>— <span style={{opacity:0.5, fontSize:12, marginLeft:8}}>—</span></td>
                              <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', maxWidth:420, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.2em', maxHeight: '2.4em', wordBreak: 'break-word', opacity:.45}}>—</td>
                              <td style={{padding:'14px 16px', textAlign:'center'}}>
                                <div style={{display:'inline-flex', justifyContent:'center'}}>
                                  <button className="btn icon" disabled style={{width:40, height:40, borderRadius:10, opacity:.3}}>···</button>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        // Normalize fields
                        // ID: support normalized and provider-specific keys
                        const id = pl.id || pl.paymentLinkId || pl.reference || pl.referenceId || pl.transactionId || pl._id || pl.linkId || '';
                        // Created: broaden fallbacks to match ListPanel logic
                        const createdRaw = pl.createdDate || pl.created_date || pl.created || pl.createdAt || pl.submitTimeUtc || pl.clientReferenceInformation?.transactionTimestamp || '';
                        const created = typeof createdRaw === 'string' ? (createdRaw.includes('T') ? createdRaw.split('T')[0] : createdRaw) : (createdRaw?.toString?.() || '');
                        const amountDetails = pl.orderInformation?.amountDetails || {};
                        // Amount/Currency: handle both normalized and provider fields
                        const amount = amountDetails.totalAmount || amountDetails.amount || pl.amount || pl.transactionAmount || '';
                        const currency = amountDetails.currency || pl.currency || pl.transactionCurrency || '';
                        const lineItems = pl.orderInformation?.lineItems || [];
                        let product = Array.isArray(lineItems) && lineItems.length > 0 ? (lineItems[0].productName || lineItems[0].productDescription || lineItems[0].description || '') : '';
                        if (!product) {
                          product = pl.paymentInformation?.description
                            || pl.purchaseInformation?.description
                            || pl.orderInformation?.invoiceDetails?.invoiceDescription
                            || pl.invoiceInformation?.description
                            || pl.product
                            || pl.memo
                            || pl.description
                            || '';
                        }
                        // Determine type with API-provided value preferred
                        const rawType = (pl.linkType || pl.LinkType || pl.link_type || pl.purchaseInformation?.linkType || pl.purchaseInformation?.link_type || pl.purchaseInformation?.purchaseType || pl.paymentInformation?.paymentType || pl.orderInformation?.purchaseType || '') || '';
                        const normType = String(rawType).toUpperCase();
                        const inferredType = normType.includes('DONATION') ? 'DONATION' : (normType.includes('PURCHASE') ? 'PURCHASE' : ((pl.minAmount || pl.maxAmount || pl.purchaseInformation?.minAmount || pl.purchaseInformation?.maxAmount) ? 'DONATION' : (amount ? 'PURCHASE' : '')));
                        const badgeColor = inferredType === 'DONATION' ? colors.secondary : (inferredType === 'PURCHASE' ? colors.success : 'rgba(255,255,255,0.06)');
                        const paymentLink = pl.purchaseInformation?.paymentLink || pl.paymentLink || pl.paymentLinkUrl || pl.paymentPageUrl || pl.hostedUrl || pl.paymentLinkInformation?.url || '';
                        const handleCopy = async () => { try { await navigator.clipboard?.writeText(paymentLink || ''); toast('Link copied', 'success'); } catch { toast('Copy failed', 'error'); } };
                        const handleOpen = () => { if (paymentLink) window.open(paymentLink, '_blank'); };
                        return (
                          <tr key={id || i} style={{borderBottom:`1px solid var(--divider-faint)`, background: CARD_BG}} onMouseOver={e=>(e.currentTarget.style.background = ROW_HOVER)} onMouseOut={e=>(e.currentTarget.style.background = CARD_BG)}>
                            <td className="mono" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{id}</td>
                            <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{created}</td>
                            <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                              <span style={{display:'inline-flex', alignItems:'center', gap:8}}>
                                <span style={{background: badgeColor, color: '#fff', padding: '4px 8px', borderRadius: 8, fontWeight: 800, fontSize: 12, lineHeight: '1'}}>{inferredType}</span>
                              </span>
                            </td>
                            <td style={{padding:'14px 16px', textAlign:'right', fontFamily: TABLE_FONT, fontWeight: 700, fontSize:18, minWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{amount || '-'} <span style={{opacity:0.7, fontSize:12, marginLeft:8}}>{currency || ''}</span></td>
                            <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', maxWidth:420, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.2em', maxHeight: '2.4em', wordBreak: 'break-word'}} title={product}>{product}</td>
                            <td style={{padding:'14px 16px', textAlign:'center', position:'relative'}}>
                              {paymentLink ? (
                                <div style={{display:'inline-flex', justifyContent:'center'}}>
                                  <ActionsMenu items={[
                                    { key: 'copy', label: 'Copy Link', onClick: handleCopy, icon: <Copy size={14} /> },
                                    { key: 'open', label: 'Open Link', onClick: handleOpen, icon: <ExternalLink size={14} /> },
                                  ]} />
                                </div>
                              ) : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            }
            if (preferInvoices || hasInvKey || (Array.isArray(singleInvoice) && singleInvoice.length > 0) || (Array.isArray(invoices) && invoices.length > 0)) {
              const maxRows = 5;
              const displayInvoices: (any|null)[] = (() => {
                const source = (singleInvoice || invoices) as any[] | null;
                const s = Array.isArray(source) ? source.slice(0, maxRows) : [];
                if (s.length < maxRows) return s.concat(Array.from({ length: maxRows - s.length }, () => null));
                return s;
              })();
              return (
                <div style={{marginTop:8}}>
                  <div style={{fontWeight:800, fontSize:16, marginBottom:8}}>AI — Invoices</div>
                  <table style={{width:'100%', borderCollapse: 'collapse', marginTop:8, background: CARD_BG, borderRadius:8, overflow:'visible', boxShadow: 'var(--shadow-strong)', fontFamily: TABLE_FONT}}>
                    <thead>
                      <tr style={{background: HEADER_BG}}>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>ID</th>
                        <th style={{textAlign:'right', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, minWidth:140}}>Amount</th>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Customer</th>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Status</th>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Due Date</th>
                        <th style={{textAlign:'center', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayInvoices.map((it:any|null, i:number) => (
                        it ? (
                          <InvoiceTableRow key={it?.id || i} inv={it} toast={toast} onChanged={()=>{}} />
                        ) : (
                          <tr key={`ai-pad-${i}`} style={{borderBottom:`1px solid var(--divider-faint)`, background: CARD_BG}}>
                            <td className="mono" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, opacity:.45}}>—</td>
                            <td className="hide-sm" style={{padding:'14px 16px', textAlign:'right', fontFamily: TABLE_FONT, fontWeight: 700, fontSize:18, minWidth:140, opacity:.45}}>— <span style={{opacity:0.5, fontSize:12, marginLeft:8}}>—</span></td>
                            <td className="hide-sm" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, opacity:.45}}>—</td>
                            <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, opacity:.45}}>—</td>
                            <td className="hide-sm" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, opacity:.45}}>—</td>
                            <td style={{padding:'14px 16px', textAlign:'center'}}>
                              <div style={{display:'inline-flex', justifyContent:'center'}}>
                                <button className="btn icon" disabled style={{width:40, height:40, borderRadius:10, opacity:.3}}>···</button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            // fallback: show raw JSON
            return <pre style={{margin:0, padding:12, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace', fontSize:13, whiteSpace:'pre-wrap', wordBreak:'break-word', background:'var(--background)', color:'var(--color-text-primary)', borderRadius:8}}>{JSON.stringify(result, null, 2)}</pre>;
          })()}
          {showErrorRaw && resultRaw && (
                    <pre style={{marginTop:8, padding:12, background:'var(--background)', color:'var(--color-text-primary)', borderRadius:8, maxHeight:220, overflow:'auto', fontSize:12}}>{resultRaw}</pre>
          )}
          <button className="btn secondary" onClick={handleRestart} style={{width:'100%', padding:'10px 0', borderRadius:12, fontWeight:800, background:'var(--card)', color:'var(--color-text-primary)', marginTop:12}}>Start Over</button>
        </div>
      )}
    </div>
  );
}

function App() {
  const [toasts, setToasts] = useState<Array<{ message: string; type: Toast['type'] }>>([]);
  const toast = (message: string, type: Toast['type'] = 'info') => {
    setToasts((ts) => [...ts, { message, type }]);
    setTimeout(() => setToasts((ts) => ts.slice(1)), 3000);
  };

  const GITHUB_DOC_URL = (typeof window !== 'undefined' && (window as any).REPO_DOCS_URL) || 'https://github.com/<OWNER>/<REPO>/blob/main/docs/visa-acceptance-agent-toolkit.md';

  // Try to surface logo/hero images if present in /assets or root. Graceful fallback to the existing circle.
  const useImage = (src?: string) => {
    const [ok, setOk] = useState(false);
    useEffect(() => {
      if (!src) return;
      if (typeof window === 'undefined') return;
      const img = new Image();
      img.onload = () => setOk(true);
      img.onerror = () => setOk(false);
      img.src = src;
    }, [src]);
    return ok;
  };

  function LogoOrFallback() {
    const candidates = ['/assets/apt-logo.png', '/assets/logo.png', '/logo.png', '/apt-logo.png'];
    const [src, setSrc] = useState<string | null>(null);
    useEffect(() => {
      let mounted = true;
      (async () => {
        for (const c of candidates) {
          try {
            await new Promise<void>((res, rej) => {
              const img = new Image();
              img.onload = () => res();
              img.onerror = () => rej();
              img.src = c;
            });
            if (mounted) { setSrc(c); break; }
          } catch {}
        }
      })();
      return () => { mounted = false; };
    }, []);
    if (src) return <img src={src} alt="APT logo" style={{width:48, height:48, borderRadius:12}} />;
    return <div style={{width:40, height:40, borderRadius:10, background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, display:'flex', alignItems:'center', justifyContent:'center', color: colors.textPrimary, fontWeight:800}}>APT</div>;
  }

  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <LogoOrFallback />
          <div>
            <div style={{fontSize:16, fontWeight:800}}>{'APT Acceptance Agent'}</div>
            <div style={{fontSize:12, color: colors.textSecondary}}>Adaptive Intelligence for Payments</div>
          </div>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          {/* Open in-app docs modal */}
          <button type="button" onClick={() => { window.open(GITHUB_DOC_URL, '_blank'); }} className="btn secondary mini" style={{borderRadius:10, padding:'6px 10px', background: 'transparent', color: 'var(--color-text-secondary)', display:'inline-flex', alignItems:'center', gap:8}} title="Open implementation docs on GitHub">
            <ExternalLink size={14} />
            <span style={{marginLeft:4, fontWeight:700}}>Docs</span>
          </button>
          {/* Theme toggle: toggles data-theme on document.documentElement */}
          <ThemeToggle />
        </div>
      </header>
      <AgentPanel toast={toast} />
      {/* Docs are opened on GitHub to keep the UI lightweight and ensure users see the canonical rendered documentation. */}
      <div style={{display:'grid', gap:16, gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))'}}>
        <CreateInvoiceCard toast={toast} />
        <CreatePayLinkCard toast={toast} />
      </div>
      <div style={{display:'grid', gap:16, gridTemplateColumns:'repeat(auto-fit, minmax(420px, 1fr))'}}>
        <div className="card" style={{padding:16, borderRadius:12, background: CARD_BG, boxShadow: SHADOW}}>
          <ListPanel title="Invoices" resource="invoices" toast={toast} />
        </div>
        <div className="card" style={{padding:16, borderRadius:12, background: CARD_BG, boxShadow: SHADOW}}>
          <ListPanel title="Pay Links" resource="payment-links" toast={toast} />
        </div>
      </div>
      <DiagnosticsCard toast={toast} onHealth={()=>{}} />

      {/* Toasts */}
      <div style={{position:'fixed', right:16, bottom:16, display:'flex', flexDirection:'column', gap:8}}>
        {toasts.map((t, i) => (
          <div key={i} className={`status-badge ${t.type}`} style={{padding:'8px 10px', borderRadius:8}}>{t.message}</div>
        ))}
      </div>
    </div>
  );
}

// Small theme toggle component used in the header
function ThemeToggle() {
  type ThemeChoice = 'dark' | 'light' | 'system';

  const getInitial = (): ThemeChoice => {
    if (typeof window === 'undefined') return 'system';
    try {
      const saved = localStorage.getItem('site-theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved as ThemeChoice;
    } catch {}
    return 'system';
  };

  const [choice, setChoice] = useState<ThemeChoice>(() => getInitial());
  const [menuOpen, setMenuOpen] = useState(false);

  // helper to compute effective theme (what we apply to document)
  const applyTheme = (c: ThemeChoice) => {
    if (typeof document === 'undefined') return;
    if (c === 'system') {
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      document.documentElement.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
      try { localStorage.setItem('site-theme', 'system'); } catch {}
      return;
    }
    document.documentElement.setAttribute('data-theme', c);
    try { localStorage.setItem('site-theme', c); } catch {}
  };

  // apply initial
  useEffect(() => { applyTheme(choice); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen to system changes only when choice === 'system'
  useEffect(() => {
    if (choice !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in e ? e.matches : mq.matches;
      document.documentElement.setAttribute('data-theme', matches ? 'light' : 'dark');
    };
    try {
      if ((mq as any).addEventListener) (mq as any).addEventListener('change', handler);
      else if ((mq as any).addListener) (mq as any).addListener(handler as any);
    } catch {}
    return () => {
      try {
        if ((mq as any).removeEventListener) (mq as any).removeEventListener('change', handler);
        else if ((mq as any).removeListener) (mq as any).removeListener(handler as any);
      } catch {}
    };
  }, [choice]);

  // update when user explicitly chooses
  useEffect(() => { applyTheme(choice); }, [choice]);

  const effective = () => {
    if (choice === 'system') {
      if (typeof window === 'undefined') return 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return choice;
  };

  const iconFor = (c: ThemeChoice) => {
    if (c === 'light') return <Sun size={16} />;
    if (c === 'dark') return <Moon size={16} />;
    return <Monitor size={16} />;
  };

  return (
    <div style={{position:'relative', display:'flex', alignItems:'center'}}>
      <button aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)} className="btn icon" style={{width:40, height:40, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:10, background:'var(--card)', boxShadow:'var(--shadow-xs)'}} title="Theme">
        {effective() === 'light' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      {menuOpen && (
        <div role="menu" onMouseLeave={() => setMenuOpen(false)} style={{position:'absolute', right:0, top:54, background:'var(--card)', border:'1px solid hsl(var(--border))', borderRadius:12, padding:12, boxShadow:'var(--shadow-strong)', minWidth:160, marginTop:6}}>
          <button role="menuitem" onClick={() => { setChoice('light'); setMenuOpen(false); }} style={{display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px', borderRadius:8, background:'transparent', border:'none', color:'var(--color-text-primary)', cursor:'pointer', textAlign:'left'}}>
            <span style={{width:28, height:28, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'var(--overlay-weak)'}}>{iconFor('light')}</span>
            <div>
              <div style={{fontWeight:700}}>Light</div>
              <div style={{fontSize:12, color:'var(--color-text-secondary)'}}>Use light colors</div>
            </div>
          </button>
          <button role="menuitem" onClick={() => { setChoice('dark'); setMenuOpen(false); }} style={{display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px', borderRadius:8, background:'transparent', border:'none', color:'var(--color-text-primary)', cursor:'pointer', textAlign:'left'}}>
            <span style={{width:28, height:28, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'var(--overlay-weak)'}}>{iconFor('dark')}</span>
            <div>
              <div style={{fontWeight:700}}>Dark</div>
              <div style={{fontSize:12, color:'var(--color-text-secondary)'}}>Use dark colors</div>
            </div>
          </button>
          <button role="menuitem" onClick={() => { setChoice('system'); setMenuOpen(false); }} style={{display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px', borderRadius:8, background:'transparent', border:'none', color:'var(--color-text-primary)', cursor:'pointer', textAlign:'left'}}>
            <span style={{width:28, height:28, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'var(--overlay-weak)'}}>{iconFor('system')}</span>
            <div>
              <div style={{fontWeight:700}}>System</div>
              <div style={{fontSize:12, color:'var(--color-text-secondary)'}}>Follow OS preference</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function CreateInvoiceCard({ toast }: { toast?: (m:string, t?: Toast['type'])=>void }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [email, setEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [memo, setMemo] = useState('');
  const [dueDays, setDueDays] = useState('30');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [errRaw, setErrRaw] = useState<string | null>(null);
  const [showErrRaw, setShowErrRaw] = useState(false);
  const [showCreatedRaw, setShowCreatedRaw] = useState(false);
  const dueOptions = [ { value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }, { value: '', label: 'No due date' } ];

  const create = async () => {
    setBusy(true); setResult(null); setErrMsg(null); setErrRaw(null); setShowErrRaw(false);
    try {
      const body = { amount, currency, email, customerName, memo, dueDays: dueDays || undefined };
      // Log outgoing request for troubleshooting
      // eslint-disable-next-line no-console
      console.info('Create invoice request', { url: `${apiBase()}/api/invoices`, body });
      const r = await fetch(`${apiBase()}/api/invoices`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const t = await r.text();
      let parsed: any = t; try { parsed = JSON.parse(t); } catch {}
      // Log response for troubleshooting
      // eslint-disable-next-line no-console
      console.info('Create invoice response', { status: r.status, parsed, raw: t });
      // Treat some 200 responses as failures if the payload indicates an error
      const parsedIndicatesError = (
        (typeof parsed === 'string' && /fail|error|failed/i.test(parsed)) ||
        (parsed && (parsed.error || parsed.success === false || (parsed.status && Number(parsed.status) >= 400)))
      );
      if (!r.ok || parsedIndicatesError) {
        setResult(parsed);
        setErrMsg(humanizeHttp(r.status, parsed, t));
        setErrRaw(t);
        toast?.('Create invoice failed', 'error');
      } else {
        setResult(parsed);
        toast?.('Invoice created', 'success');
      }
    } catch (e:any) {
      const raw = e?.stack || e?.message || String(e);
      setResult('Error: ' + String(e));
      setErrMsg(String(e));
      setErrRaw && setErrRaw(String(raw));
      // eslint-disable-next-line no-console
      console.error('Create invoice error', e);
      toast?.('Error creating invoice', 'error');
    }
    finally { setBusy(false); }
  };

  return (
    <div className="card" style={{padding:24, borderRadius:18, background: CARD_BG, boxShadow: SHADOW}}>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12, fontWeight:700, color:colors.textPrimary}}>
        <FileText size={20} />
        <div style={{fontSize:18}}>Create Invoice</div>
      </div>

      <div style={{display:'flex', gap:16, marginBottom:14, alignItems:'stretch'}}>
        <div style={{flex:1, paddingRight:18}}>
          <div style={{fontWeight:600, marginBottom:6, color:'var(--color-text-secondary)'}}>Amount <span style={{color:'var(--color-error)'}}>*</span></div>
          <input className="input" value={amount} onChange={e=>setAmount(e.target.value)} disabled={busy} placeholder="0.00" style={{width:'100%', padding:'12px 18px', borderRadius:14, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', boxSizing:'border-box'}} />
        </div>
        <div style={{width:1, background:'var(--divider-faint)', borderRadius:2, margin:'6px 0'}} />
        <div style={{flex:1, paddingLeft:18}}>
          <div style={{fontWeight:600, marginBottom:6, color:'var(--color-text-secondary)'}}>Currency</div>
          <select className="input" value={currency} onChange={e=>setCurrency(e.target.value)} disabled={busy} style={{width:'100%', padding:'12px 16px', borderRadius:14, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', boxSizing:'border-box'}}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{fontWeight:600, marginBottom:8, color:'var(--color-text-secondary)'}}>Customer Email <span style={{color:'var(--color-error)'}}>*</span></div>
      <input className="input" value={email} onChange={e=>setEmail(e.target.value)} disabled={busy} placeholder="customer@example.com" style={{width:'100%', padding:'14px 18px', borderRadius:14, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', marginBottom:14, boxSizing:'border-box'}} />

      <div style={{fontWeight:600, marginBottom:8, color:'var(--color-text-secondary)'}}>Customer Name</div>
      <input className="input" value={customerName} onChange={e=>setCustomerName(e.target.value)} disabled={busy} placeholder="John Doe (optional)" style={{width:'100%', padding:'14px 18px', borderRadius:14, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', marginBottom:14, boxSizing:'border-box'}} />

      <div style={{fontWeight:600, marginBottom:8, color:'var(--color-text-secondary)'}}>Memo</div>
      <textarea className="input" value={memo} onChange={e=>setMemo(e.target.value)} disabled={busy} placeholder="Description..." style={{width:'100%', padding:'16px 18px', minHeight:100, borderRadius:14, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', marginBottom:14, resize:'vertical', overflow:'auto', boxSizing:'border-box'}} />

      <div style={{fontWeight:600, marginBottom:6, color:'var(--color-text-secondary)'}}>Due Days</div>
      <select value={dueDays} onChange={e=>setDueDays(e.target.value)} disabled={busy} style={{width:'100%', padding:'12px 16px', borderRadius:14, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', marginBottom:12, boxSizing:'border-box'}}>
        {dueOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <button className="btn" aria-label="Create Invoice" onClick={create} disabled={busy || !amount.trim() || !email.trim()} style={{width:'100%', padding:'14px 0', borderRadius:14, fontWeight:800, background:'var(--primary)', color:'var(--primary-foreground)', display:'flex', alignItems:'center', justifyContent:'center', gap:10}}>
        <span style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.06)'}}><FileText size={18} /></span>
        <span style={{fontSize:15}}>Create Invoice</span>
      </button>

      {errMsg && (
        <div style={{marginTop:10, padding:10, borderRadius:8, background:'var(--color-error-bg)', border:'1px solid var(--color-error)', color:'var(--color-error)'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div style={{fontWeight:700}}>{errMsg}</div>
            {errRaw ? (
              <button className="btn secondary mini" onClick={()=>setShowErrRaw(v=>!v)} style={{padding:'6px 10px', borderRadius:8}}>
                {showErrRaw ? 'Hide raw' : 'Show raw'}
              </button>
            ) : null}
          </div>
          {showErrRaw && errRaw ? (
            <pre style={{marginTop:8, padding:8, borderRadius:6, background:'var(--background)', color:'var(--color-text-primary)', maxHeight:200, overflow:'auto', fontSize:12}}>{errRaw}</pre>
          ) : null}
        </div>
      )}
      {result && (
        <div style={{marginTop:12}}>
          {/* Try to normalize the response into an invoice-like object for a compact preview */}
          {(() => {
            const r = result as any;
            const invoiceObj = r?.invoice || (r?.data && r.data.invoice) || (r?.invoiceInformation || r?.orderInformation || r?.id ? r : null);
            if (invoiceObj) {
              return (
                <div>
                  <div style={{fontWeight:800, marginBottom:8}}>Created Invoice</div>
                  <table style={{width:'100%', borderCollapse: 'collapse', marginTop:8, background: CARD_BG, borderRadius:8, overflow:'hidden', boxShadow: 'var(--shadow-strong)', fontFamily: TABLE_FONT}}>
                    <thead>
                      <tr style={{background: HEADER_BG}}>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>ID</th>
                        <th style={{textAlign:'right', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, minWidth:140}}>Amount</th>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Customer</th>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Status</th>
                        <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Due Date</th>
                        <th style={{textAlign:'center', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <InvoiceTableRow key={invoiceObj?.id || 'created'} inv={invoiceObj as any} toast={toast!} onChanged={() => { /* no-op for created preview */ }} />
                    </tbody>
                  </table>
                </div>
              );
            }
            return <div style={{fontStyle:'italic', color:'var(--color-text-secondary)'}}>Created — response returned.</div>;
          })()}

          <div style={{marginTop:10}}>
            <button className="btn secondary mini" onClick={() => setShowCreatedRaw((v:boolean) => !v)} style={{padding:'6px 10px', borderRadius:8}}>
              {showCreatedRaw ? 'Hide raw response' : 'Show raw response'}
            </button>
            {showCreatedRaw && (
              <pre style={{marginTop:8, padding:12, borderRadius:8, background:'var(--background)', color:'var(--color-text-primary)', maxHeight:300, overflow:'auto'}}>{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePayLinkCard({ toast }: { toast: (m:string, t?: Toast['type'])=>void }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [linkType, setLinkType] = useState<'PURCHASE'|'DONATION'>('PURCHASE');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showDonationHelp, setShowDonationHelp] = useState(false);
  const [minMaxError, setMinMaxError] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [errRaw, setErrRaw] = useState<string | null>(null);
  const [showErrRaw, setShowErrRaw] = useState(false);
  const create = async () => {
    setBusy(true); setResult(null); setErrMsg(null); setErrRaw(null); setShowErrRaw(false);
    try {
      // Validation: donations must include a minimum amount
      if (linkType === 'DONATION' && !minAmount.trim()) {
        setErrMsg('Donation links require a minimum amount');
        toast('Donation links require a minimum amount', 'error');
        setBusy(false);
        return;
      }
      if (minAmount && maxAmount && Number(minAmount) > Number(maxAmount)) {
        setMinMaxError('Minimum cannot be greater than maximum');
        toast('Donation min must be <= max', 'error');
        setBusy(false);
        return;
      }
      // Build payload supporting both PURCHASE and DONATION link types
      const body: any = { currency, memo, linkType };
      if (linkType === 'PURCHASE') {
        body.amount = amount;
      } else {
        if (minAmount) body.minAmount = minAmount;
        if (maxAmount) body.maxAmount = maxAmount;
      }
      // Log outgoing request for troubleshooting
      // eslint-disable-next-line no-console
      console.info('Create paylink request', { url: `${apiBase()}/api/payment-links`, body });
      const r = await fetch(`${apiBase()}/api/payment-links`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const t = await r.text();
      let parsed:any = t; try { parsed = JSON.parse(t); } catch {}
      // Log response
      // eslint-disable-next-line no-console
      console.info('Create paylink response', { status: r.status, parsed, raw: t });
      const parsedIndicatesErrorPL = (
        (typeof parsed === 'string' && /fail|error|failed/i.test(parsed)) ||
        (parsed && (parsed.error || parsed.success === false || (parsed.status && Number(parsed.status) >= 400)))
      );
      if (!r.ok || parsedIndicatesErrorPL) {
        setResult(parsed);
        setErrMsg(humanizeHttp(r.status, parsed, t));
        setErrRaw(t);
        toast('Error creating pay link', 'error');
      } else {
        setResult(parsed);
        toast('Pay link created', 'success');
      }
    } catch (e:any) {
      const raw = e?.stack || e?.message || String(e);
      setResult('Error: ' + String(e));
      setErrMsg(String(e));
      setErrRaw && setErrRaw(String(raw));
      // eslint-disable-next-line no-console
      console.error('Create paylink error', e);
      toast('Error creating pay link', 'error');
    }
    finally { setBusy(false); }
  };

  return (
    <div className="card" style={{padding:24, borderRadius:18, background: CARD_BG, boxShadow: SHADOW}}>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12, fontWeight:700, color:colors.textPrimary}}>
        <LinkIcon size={20} />
        <div style={{fontSize:18}}>Create Pay-by-Link</div>
      </div>

      {/* Link Type: moved to top to match mocks */}
      <div style={{marginBottom:12}}>
        <div style={{fontWeight:600, marginBottom:6, color:'var(--color-text-secondary)'}}>Link Type</div>
        <select value={linkType} onChange={e=>setLinkType(e.target.value as 'PURCHASE'|'DONATION')} disabled={busy} style={{width:'100%', padding:'12px 16px', borderRadius:14, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', boxSizing:'border-box'}}>
          <option value="PURCHASE">Purchase</option>
          <option value="DONATION">Donation</option>
        </select>
      </div>

      <div style={{display:'flex', gap:16, marginBottom:14, alignItems:'stretch'}}>
        <div style={{flex:1, paddingRight:18}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6}}>
            <div style={{fontWeight:600, color:'var(--color-text-secondary)'}}>Amount <span style={{color:'var(--color-error)'}}>*</span></div>
            <div style={{fontSize:12, color:'var(--color-text-secondary)'}}>Enter whole or decimal amounts</div>
          </div>
          {linkType === 'PURCHASE' ? (
            <input className="input" value={amount} onChange={e=>setAmount(e.target.value)} disabled={busy} placeholder="e.g. 25.00" style={{width:'100%', padding:'12px 14px', borderRadius:12, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', boxSizing:'border-box'}} />
          ) : (
            <div>
              <div style={{display:'flex', gap:12, marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600, marginBottom:8, color:'var(--color-text-secondary)', fontSize:13}}>Min amount</div>
                  <input className="input" value={minAmount} onChange={e=>{
                    const v = e.target.value.trim();
                    setMinAmount(v);
                    // live validation
                    setMinMaxError(null);
                    const numV = v === '' ? NaN : Number(v);
                    const numMax = maxAmount.trim() === '' ? NaN : Number(maxAmount);
                    if (v !== '' && Number.isNaN(numV)) {
                      setMinMaxError('Invalid amount');
                    } else if (!Number.isNaN(numV) && !Number.isNaN(numMax) && numV > numMax) {
                      setMinMaxError('Minimum cannot be greater than maximum');
                    }
                  }} disabled={busy} placeholder="e.g. 1.00" aria-invalid={!!minMaxError} aria-describedby={minMaxError ? 'min-max-error' : undefined} style={{width:'100%', padding:'12px 14px', borderRadius:12, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', boxSizing:'border-box'}} />
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600, marginBottom:8, color:'var(--color-text-secondary)', fontSize:13}}>Max amount</div>
                  <input className="input" value={maxAmount} onChange={e=>{
                    const v = e.target.value.trim();
                    setMaxAmount(v);
                    // live validation
                    setMinMaxError(null);
                    const numMin = minAmount.trim() === '' ? NaN : Number(minAmount);
                    const numV = v === '' ? NaN : Number(v);
                    if (v !== '' && Number.isNaN(numV)) {
                      setMinMaxError('Invalid amount');
                    } else if (!Number.isNaN(numMin) && !Number.isNaN(numV) && numMin > numV) {
                      setMinMaxError('Minimum cannot be greater than maximum');
                    }
                  }} disabled={busy} placeholder="optional" aria-invalid={!!minMaxError} aria-describedby={minMaxError ? 'min-max-error' : undefined} style={{width:'100%', padding:'12px 14px', borderRadius:12, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', boxSizing:'border-box'}} />
                </div>
              </div>
              {minMaxError ? <div id="min-max-error" role="alert" style={{color:'var(--color-error)', fontSize:13, marginBottom:8}}>{minMaxError}</div> : null}
              <div style={{fontSize:12, color:'var(--color-text-secondary)', marginTop:8}}>
                Customers can donate any amount within this range.
              </div>
            </div>
          )}
        </div>
        <div style={{width:1, background:'var(--divider-faint)', borderRadius:2, margin:'6px 0'}} />
        <div style={{flex:1, paddingLeft:18}}>
          <div style={{fontWeight:600, marginBottom:6, color:'var(--color-text-secondary)'}}>Currency</div>
          <select value={currency} onChange={e=>setCurrency(e.target.value)} disabled={busy} style={{width:'100%', padding:'12px 16px', borderRadius:14, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', boxSizing:'border-box'}}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
          </select>
        </div>
      </div>

      

      {/* Memo row (moved below Amount/Currency to match mock) */}
      <div style={{marginBottom:14}}>
        <div style={{fontWeight:700, marginBottom:6, color:'var(--color-text-secondary)'}}>Memo / Product (optional)</div>
        <textarea value={memo} onChange={e=>setMemo(e.target.value)} disabled={busy} placeholder="e.g., 'Sticker Pack'" style={{width:'100%', padding:'14px 16px', minHeight:104, borderRadius:14, border:'none', background: INPUT_BG, color:'var(--color-text-primary)', marginBottom:0, resize:'vertical', overflow:'auto', boxSizing:'border-box'}} />
      </div>

      <div>
        <button className="btn" aria-label="Create Pay Link" onClick={create} disabled={
          busy ||
          (linkType === 'PURCHASE' ? !amount.trim() : !minAmount.trim())
        } title={busy ? 'Busy' : (linkType === 'PURCHASE' ? (amount.trim() ? '' : 'Amount required') : (minAmount.trim() ? '' : 'Min amount required'))} style={{width:'100%', padding:'16px 0', minHeight:52, borderRadius:12, fontWeight:800, background: 'linear-gradient(180deg, rgba(24,136,115,1) 0%, rgba(20,120,102,1) 100%)', color:'var(--primary-foreground)', display:'flex', alignItems:'center', justifyContent:'center', gap:12, boxShadow: busy ? 'none' : '0 8px 26px rgba(0,0,0,0.22)'}}>
          <span style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:10, background:'var(--overlay-weak)'}}><LinkIcon size={18} /></span>
          <span style={{fontSize:16}}>Create Pay Link</span>
        </button>
      </div>

      {errMsg && (
        <div style={{marginTop:10, padding:10, borderRadius:8, background:'var(--color-error-bg)', border:'1px solid var(--color-error)', color:'var(--color-error)'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div style={{fontWeight:700}}>{errMsg}</div>
            {errRaw ? (
              <button className="btn secondary mini" onClick={()=>setShowErrRaw(v=>!v)} style={{padding:'6px 10px', borderRadius:8}}>
                {showErrRaw ? 'Hide raw' : 'Show raw'}
              </button>
            ) : null}
          </div>
          {showErrRaw && errRaw ? (
            <pre style={{marginTop:8, padding:8, borderRadius:6, background:'var(--background)', color:'var(--color-text-secondary)', maxHeight:200, overflow:'auto', fontSize:12}}>{errRaw}</pre>
          ) : null}
        </div>
      )}
      {result && <pre style={{marginTop:12, padding:12, borderRadius:8, background:'var(--background)', color:'var(--color-text-secondary)', maxHeight:220, overflow:'auto'}}>{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}

function ListPanel<T>({ title, resource, toast }: { title: string; resource: 'invoices'|'payment-links'; toast: (m:string, t?: Toast['type'])=>void }) {
  const [showRaw, setShowRaw] = useState(false);
  const [showErrorRaw, setShowErrorRaw] = useState(false);
  const { data, loading, error, refresh, meta } = useFetch<any>(`${apiBase()}/api/${resource}?limit=5&offset=0`, [resource]);
  // DEBUG: show raw API response in console for pay-by-link
  React.useEffect(() => {
    if (resource === 'payment-links' && data) {
      // eslint-disable-next-line no-console
      console.log('PayLink API raw response:', data);
    }
  }, [resource, data]);
  let items: any[] = [];
  let total = 0;
  try {
    const body = typeof data === 'string' ? JSON.parse(data) : data;
    if (body?.invoices && Array.isArray(body.invoices)) { items = body.invoices; total = body.total || items.length; }
    else if (body?.paymentLinks && Array.isArray(body.paymentLinks)) { items = body.paymentLinks; total = body.total || items.length; }
    else if (body?.links && Array.isArray(body.links)) { items = body.links; total = body.totalLinks || items.length; }
    else if (body?.items && Array.isArray(body.items)) { items = body.items; total = body.total || items.length; }
    else if (body?.data && Array.isArray(body.data)) { items = body.data; total = body.total || items.length; }
    else if (Array.isArray(body)) { items = body; total = items.length; }
  } catch {}
  const isInvoices = resource === 'invoices';
  const isPayLinks = resource === 'payment-links';
  // Always display up to 5 rows for a consistent layout; pad with nulls if fewer
  const maxRows = 5;
  const displayItems: (any|null)[] = (() => {
    const s = Array.isArray(items) ? items.slice(0, maxRows) : [];
    if (s.length < maxRows) {
      return s.concat(Array.from({ length: maxRows - s.length }, () => null));
    }
    return s;
  })();
  return (
    <div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:8}}>
        <div style={{fontWeight:800, fontSize:16, display:'flex', alignItems:'center', gap:8, color:'var(--color-text-primary)'}}>
          {isInvoices ? <FileText size={18} /> : <LinkIcon size={18} />}
          {isInvoices ? `Recent Invoices (Last 5 of ${total})` : `Recent Pay-by-Links (Last 5 of ${total})`}
        </div>
        <button onClick={refresh} aria-label={isInvoices ? 'Refresh invoices' : 'Refresh pay-by-links'} className="btn secondary" style={{borderRadius:10, padding:'6px 12px', background: CARD_ALT, color:'var(--color-text-secondary)', display:'inline-flex', alignItems:'center', gap:8}}>
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? <div className="muted">Loading…</div> : null}
      {error ? (
        <div className="card" style={{padding:12, borderRadius:10, background:'var(--color-error-bg)', border:'1px solid var(--color-error)', color:'var(--color-error)', marginTop:6}}>
          <div style={{display:'flex', alignItems:'center', gap:8, justifyContent:'space-between'}}>
            <div style={{fontWeight:700}}>{error}</div>
            <div style={{display:'inline-flex', gap:8}}>
              {meta?.status ? <span className="mono" title="HTTP status">HTTP {meta.status}</span> : null}
              {meta?.rawText ? (
                <button className="btn secondary mini" onClick={()=>setShowErrorRaw(v=>!v)} style={{padding:'6px 10px', borderRadius:8}}>
                  {showErrorRaw ? 'Hide raw' : 'Show raw'}
                </button>
              ) : null}
            </div>
          </div>
          {showErrorRaw && meta?.rawText ? (
            <pre style={{marginTop:8, padding:8, borderRadius:8, background:'var(--background)', color:'var(--color-text-secondary)', maxHeight:200, overflow:'auto', fontSize:12}}>{meta.rawText}</pre>
          ) : null}
        </div>
      ) : null}


      {items.length === 0 && !loading ? (
        <div className="card muted">No {isInvoices ? 'invoices' : 'pay-by-links'} found. Create one above.</div>
      ) : (
        <div>
          {isInvoices ? (
            <table style={{width:'100%', borderCollapse: 'collapse', marginTop:8, background: CARD_BG, borderRadius:8, overflow:'visible', boxShadow: 'var(--shadow-strong)', fontFamily: TABLE_FONT}}>
              <thead>
                        <tr style={{background: HEADER_BG}}>
                          <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT}}>
                            <span style={{display:'inline-flex', alignItems:'center', gap:6}}><Hash size={14} /> ID</span>
                          </th>
                          <th className="hide-sm" style={{textAlign:'right', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT, minWidth:140}}>
                            <span style={{display:'inline-flex', alignItems:'center', gap:6, justifyContent:'flex-end'}}><DollarSign size={14} /> Amount</span>
                          </th>
                          <th className="hide-sm" style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT}}>
                            <span style={{display:'inline-flex', alignItems:'center', gap:6}}><UserIcon size={14} /> Customer</span>
                          </th>
                          <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT}}>
                            <span style={{display:'inline-flex', alignItems:'center', gap:6}}><Tag size={14} /> Status</span>
                          </th>
                          <th className="hide-sm" style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT}}>
                            <span style={{display:'inline-flex', alignItems:'center', gap:6}}><Calendar size={14} /> Due Date</span>
                          </th>
                          <th style={{textAlign:'center', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT}}>
                            <span style={{display:'inline-flex', alignItems:'center', gap:6, justifyContent:'center'}}><Zap size={14} /> Actions</span>
                          </th>
                        </tr>
                      </thead>
              <tbody>
                {displayItems.map((it:Invoice|null, i:number) => (
                  it ? (
                    <InvoiceTableRow key={it?.id || i} inv={it} toast={toast} onChanged={refresh} />
                  ) : (
                    <tr key={`pad-${i}`} style={{borderBottom:`1px solid var(--divider-faint)`, background: CARD_BG}}>
                      <td className="mono" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, opacity: .45}}>—</td>
                      <td className="hide-sm" style={{padding:'14px 16px', textAlign:'right', fontFamily: TABLE_FONT, fontWeight: 700, fontSize:18, minWidth:140, opacity: .45}}>— <span style={{opacity:0.5, fontSize:12, marginLeft:8}}>—</span></td>
                      <td className="hide-sm" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, opacity: .45}}>—</td>
                      <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, opacity: .45}}>—</td>
                      <td className="hide-sm" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, opacity: .45}}>—</td>
                      <td style={{padding:'14px 16px', textAlign:'center'}}>
                        <div style={{display:'inline-flex', justifyContent:'center'}}>
                          <button className="btn icon" disabled style={{width:40, height:40, borderRadius:10, opacity:.3}}>···</button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{width:'100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginTop:8, background: CARD_BG, borderRadius:8, overflow:'visible', boxShadow: 'var(--shadow-strong)', fontFamily: TABLE_FONT}}>
              <thead>
                <tr style={{background: HEADER_BG}}>
                  <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT, width: '16%'}}>
                    <span style={{display:'inline-flex', alignItems:'center', gap:6}}><Hash size={14} /> ID</span>
                  </th>
                  <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT, width: '18%'}}>
                    <span style={{display:'inline-flex', alignItems:'center', gap:6}}><Calendar size={14} /> Created</span>
                  </th>
                    <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT, minWidth:120, width: '12%'}}>
                      <span style={{display:'inline-flex', alignItems:'center', gap:6}}>Type</span>
                    </th>
                  <th style={{textAlign:'right', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT, width: '12%'}}>
                    <span style={{display:'inline-flex', alignItems:'center', gap:6, justifyContent:'flex-end'}}><DollarSign size={14} /> Amount</span>
                  </th>
                  <th style={{textAlign:'left', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT, width: '30%'}}>
                    <span style={{display:'inline-flex', alignItems:'center', gap:6}}><FileText size={14} /> Product</span>
                  </th>
                  <th style={{textAlign:'center', padding:'14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize:15, fontFamily: TABLE_FONT, width: '12%'}}>
                    <span style={{display:'inline-flex', alignItems:'center', gap:6, justifyContent:'center'}}><Zap size={14} /> Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((pl: any|null, i: number) => {
                  if (!pl) {
                    return (
                      <tr key={`pad-${i}`} style={{borderBottom:`1px solid var(--divider-faint)`, background: CARD_BG}}>
                        <td className="mono" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:.45}}>—</td>
                        <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:.45}}>—</td>
                        <td style={{padding:'14px 16px'}}>
                          <span style={{display:'inline-flex', alignItems:'center', gap:8}}>
                            <span style={{background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '4px 8px', borderRadius: 8, fontWeight: 800, fontSize: 12, lineHeight: '1', opacity:.3}}>—</span>
                          </span>
                        </td>
                        <td style={{padding:'14px 16px', textAlign:'right', fontFamily: TABLE_FONT, fontWeight: 700, fontSize:18, minWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:.45}}>— <span style={{opacity:0.5, fontSize:12, marginLeft:8}}>—</span></td>
                        <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', maxWidth:420, lineHeight: '1.2em', maxHeight: '2.4em', opacity:.45}}>—</td>
                        <td style={{padding:'14px 16px', textAlign:'center'}}>
                          <div style={{display:'inline-flex', justifyContent:'center'}}>
                            <button className="btn icon" disabled style={{width:40, height:40, borderRadius:10, opacity:.3}}>···</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  // Defensive: support both direct and nested fields from different providers
                  const id = pl.id || pl.paymentLinkId || pl.reference || pl._id || pl.linkId || '';
                  // Created date fallbacks (prefer ISO strings; display YYYY-MM-DD if possible)
                  const createdRaw = pl.createdDate
                    || pl.created_date
                    || pl.created
                    || pl.createdAt
                    || pl.submitTimeUtc
                    || pl.clientReferenceInformation?.transactionTimestamp
                    || '';
                  const created = typeof createdRaw === 'string'
                    ? (createdRaw.includes('T') ? createdRaw.split('T')[0] : createdRaw)
                    : (createdRaw && createdRaw.toString ? createdRaw.toString() : '');
                  // Extract payment link from common locations
                  const paymentLink = pl.purchaseInformation?.paymentLink
                    || pl.paymentLink
                    || pl.paymentLinkUrl
                    || pl.paymentPageUrl
                    || pl.hostedUrl
                    || pl.paymentLinkInformation?.url
                    || '';
                  // Extract amount and currency with sensible fallbacks
                  const amountDetails = pl.orderInformation?.amountDetails || {};
                  const amount = amountDetails.totalAmount
                    || amountDetails.amount
                    || pl.amount
                    || pl.transactionAmount
                    || '';
                  const currency = amountDetails.currency
                    || pl.currency
                    || pl.transactionCurrency
                    || '';
                  // Extract product/description
                  const lineItems = pl.orderInformation?.lineItems || [];
                  let product = Array.isArray(lineItems) && lineItems.length > 0
                    ? (lineItems[0].productName || lineItems[0].productDescription || lineItems[0].description || '')
                    : '';
                  if (!product) {
                    product = pl.paymentInformation?.description
                      || pl.purchaseInformation?.description
                      || pl.orderInformation?.invoiceDetails?.invoiceDescription
                      || pl.invoiceInformation?.description
                      || pl.product
                      || pl.memo
                      || pl.description
                      || '';
                  }
                      return (
                    <tr key={id || i} style={{borderBottom:`1px solid var(--divider-faint)`, background: CARD_BG}} onMouseOver={e=>(e.currentTarget.style.background = ROW_HOVER)} onMouseOut={e=>(e.currentTarget.style.background = CARD_BG)}>
                      <td className="mono" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{id}</td>
                      <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{created}</td>
                      {/* Normalize linkType to PURCHASE or DONATION when possible */}
                      {(() => {
                        // Prefer explicit API-provided link type (support both camelCase and snake_case)
                        const raw = (pl.linkType || pl.LinkType || pl.link_type || pl.purchaseInformation?.linkType || pl.purchaseInformation?.link_type || pl.purchaseInformation?.purchaseType || pl.paymentInformation?.paymentType || pl.orderInformation?.purchaseType || '') || '';
                        const normalized = String(raw).toUpperCase();
                        // If API returned something, prefer it (uppercased). Otherwise fall back to inference.
                        const shown = normalized.includes('DONATION') ? 'DONATION' : (normalized.includes('PURCHASE') ? 'PURCHASE' : (raw ? String(raw).toUpperCase() : ''));
                        // If we don't have an explicit linkType text, infer from payload: presence of amount => PURCHASE, min/max => DONATION
                        const amtPresent = pl.amount || pl.orderInformation?.amountDetails?.totalAmount || pl.transactionAmount;
                        const minMaxPresent = pl.minAmount || pl.maxAmount || pl.purchaseInformation?.minAmount || pl.purchaseInformation?.maxAmount;
                        const inferredType = shown || (minMaxPresent ? 'DONATION' : (amtPresent ? 'PURCHASE' : '—'));
                        const badgeColor = inferredType === 'DONATION' ? colors.secondary : (inferredType === 'PURCHASE' ? colors.success : 'rgba(255,255,255,0.06)');
                        return (
                          <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            <span style={{display:'inline-flex', alignItems:'center', gap:8}}>
                              <span style={{background: badgeColor, color: '#fff', padding: '4px 8px', borderRadius: 8, fontWeight: 800, fontSize: 12, lineHeight: '1'}}>{inferredType === '—' ? '' : inferredType}</span>
                            </span>
                          </td>
                        );
                      })()}
                      <td style={{padding:'14px 16px', textAlign:'right', fontFamily: TABLE_FONT, fontWeight: 700, fontSize:18, minWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{amount || '-'} <span style={{opacity:0.7, fontSize:12, marginLeft:8}}>{currency || ''}</span></td>
                      <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow:'hidden', textOverflow:'ellipsis', maxWidth:420, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.2em', maxHeight: '2.4em', wordBreak: 'break-word'}} title={product}>{product}</td>
                      <td style={{padding:'14px 16px', textAlign:'center', position:'relative'}}>
                        {paymentLink ? (
                          <div style={{display:'inline-flex', justifyContent:'center'}}>
                            <ActionsMenu items={[
                              { key: 'copy', label: 'Copy Link', onClick: async ()=>{ try { await navigator.clipboard?.writeText(paymentLink); toast('Link copied', 'success'); } catch { toast('Copy failed', 'error'); } }, icon: <Copy size={14} /> },
                              { key: 'open', label: 'Open Link', onClick: () => window.open(paymentLink, '_blank'), icon: <ExternalLink size={14} /> },
                            ]} />
                          </div>
                        ) : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
      {items.length > 0 && (
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:8}}>
          <button className="btn secondary mini" onClick={() => setShowRaw(v=>!v)} style={{borderRadius:8, padding:'6px 10px'}}>View raw JSON</button>
        </div>
      )}
      {items.length > 0 && showRaw && (
        <pre style={{marginTop:8, padding:8, borderRadius:8, background:'var(--background)', color:'var(--color-text-secondary)', maxHeight:300, overflow:'auto', fontSize:12}}>{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}

function InvoiceTableRow({ inv, toast, onChanged }: { inv: Invoice, toast: (m:string, t?: Toast['type'])=>void, onChanged: ()=>void }) {
  const amt = inv.orderInformation?.amountDetails?.totalAmount;
  const cur = inv.orderInformation?.amountDetails?.currency;
  const id = inv.id;
  const name = inv.customerInformation?.name || '(no name)';
  const status = inv.status || '';
  const statusLower = status.toLowerCase();
  const statusClass = statusLower.includes('paid')
    ? 'success'
    : statusLower.includes('draft')
    ? 'warning'
    : statusLower.includes('sent')
    ? 'primary'
    : statusLower.includes('cancel')
    ? 'muted'
    : 'primary';
  const isCanceled = statusLower.includes('cancel');
  const isPaid = statusLower.includes('paid') || statusLower.includes('settled');
  // Only allow cancel for draft, sent, or pending
  const canCancel = !isCanceled && !isPaid && (
    statusLower.includes('draft') ||
    statusLower.includes('sent') ||
    statusLower.includes('pending')
  );
  const dueDate = inv.invoiceInformation?.dueDate ? (inv.invoiceInformation.dueDate.includes('T') ? inv.invoiceInformation.dueDate.split('T')[0] : inv.invoiceInformation.dueDate) : '';
  const handleSend = async () => { try { const r = await fetch(`${apiBase()}/api/invoices/${encodeURIComponent(id||'')}/send`, { method:'POST' }); if (r.ok) { toast('Invoice sent', 'success'); onChanged(); } else toast('Failed to send invoice', 'error'); } catch (e) { toast('Error sending invoice', 'error'); } };
  const handleCancel = async () => {
    if (!id) { toast('Missing invoice id', 'error'); return; }
    const ok = window.confirm('Cancel this invoice?');
    if (!ok) return;
      try {
      const r = await fetch(`${apiBase()}/api/invoices/${encodeURIComponent(id)}/cancel`, { method:'POST' });
      if (r.ok) { toast('Invoice canceled', 'success'); onChanged(); }
      else { toast('Failed to cancel invoice', 'error'); }
    } catch (e:any) { toast('Error canceling invoice', 'error'); }
  };
  const payUrl = (inv as any)?.invoiceInformation?.paymentLink
    || (inv as any)?.invoiceInformation?.paymentPageUrl
    || (inv as any)?.invoiceInformation?.invoiceUrl
    || (inv as any)?.paymentLink
    || (inv as any)?.paymentPageUrl
    || (inv as any)?.hostedUrl
    || (inv as any)?.hostedPaymentPageUrl
    || null;
  const ensurePayUrl = async (): Promise<string | null> => {
    if (typeof payUrl === 'string' && payUrl) return payUrl;
    if (!id) return null;
    try {
      const r = await fetch(`${apiBase()}/api/invoices/${encodeURIComponent(id)}`);
      const t = await r.text();
      let j:any = t; try { j = JSON.parse(t); } catch {}
      const fetchedUrl = j?.invoiceInformation?.paymentLink
        || j?.invoiceInformation?.paymentPageUrl
        || j?.invoiceInformation?.invoiceUrl
        || j?.paymentLink
        || j?.paymentPageUrl
        || j?.hostedUrl
        || j?.hostedPaymentPageUrl
        || null;
      return (typeof fetchedUrl === 'string' && fetchedUrl) ? fetchedUrl : null;
    } catch {
      return null;
    }
  };
  const handleOpen = async () => {
    const url = await ensurePayUrl();
    if (url) { window.open(url, '_blank'); }
    else { toast('Payment page not available for this invoice', 'error'); }
  };
  const handleCopy = async () => {
    const url = await ensurePayUrl();
    if (url) {
      try { await navigator.clipboard?.writeText(url); toast('Link copied', 'success'); }
      catch { toast('Copy failed', 'error'); }
    } else {
      toast('Payment page not available for this invoice', 'error');
    }
  };
  return (
    <tr style={{borderBottom:`1px solid var(--divider-faint)`, background: CARD_BG, transition: 'background 160ms ease'}} onMouseOver={e=>(e.currentTarget.style.background = ROW_HOVER)} onMouseOut={e=>(e.currentTarget.style.background = CARD_BG)}>
    <td className="mono" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT}}>{id || '(no id)'}</td>
    <td className="hide-sm" style={{padding:'14px 16px', textAlign:'right', fontFamily: TABLE_FONT, fontWeight: 700, fontSize:18, minWidth:140}}>{amt || '-'} <span style={{opacity:0.7, fontSize:12, marginLeft:8}}>{cur || ''}</span></td>
      <td className="hide-sm" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT}}>{name}</td>
      <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT}}>
        <span className={`status-badge ${statusClass}`}>{status || 'Unknown'}</span>
      </td>
      <td className="hide-sm" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT}}>{dueDate}</td>
      <td style={{padding:'14px 16px', textAlign:'center', position:'relative'}}>
        <div style={{display:'inline-flex', justifyContent:'center'}}>
          <ActionsMenu items={[
            { key: 'copy', label: 'Copy Link', onClick: handleCopy, icon: <Copy size={14} /> },
            { key: 'open', label: 'Open Link', onClick: handleOpen, icon: <ExternalLink size={14} /> },
            !isPaid ? { key: 'send', label: 'Send', onClick: handleSend, icon: <Mail size={14} /> } : null,
            canCancel ? { key: 'cancel', label: 'Cancel', onClick: handleCancel, destructive: true, icon: <Trash2 size={14} /> } : null,
          ].filter(Boolean) as any} />
        </div>
      </td>
    </tr>
  );
}

function PayLinkTableRow({ pl, toast }: { pl: PayLink, toast: (m:string, t?: Toast['type'])=>void }) {
  const id = pl.id;
  const amt = pl.amount;
  const cur = pl.currency;
  const memo = pl.memo || '';
  const created = pl.created || (pl as any).createdAt || (pl as any).created_at || '';
  const handleCopy = async () => { try { const url = `${window.location.origin}/paylink/${id}`; await (navigator.clipboard?.writeText(url)); toast('Pay link copied', 'success'); } catch { toast('Copy failed', 'error'); } };
  const handleOpen = () => { if (!id) return; window.open(`/paylink/${id}`, '_blank'); };
  return (
    <tr style={{borderBottom:`1px solid var(--divider-faint)`, background: CARD_BG}} onMouseOver={e=>(e.currentTarget.style.background = ROW_HOVER)} onMouseOut={e=>(e.currentTarget.style.background = CARD_BG)}>
      <td className="mono" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT}}>{id || '(no id)'}</td>
      <td className="hide-sm" style={{padding:'14px 16px', textAlign:'right', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT}}>{amt || '-'} <span style={{opacity:.85, fontSize:12}}>{cur || ''}</span></td>
      <td style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, color:'var(--color-text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:260}} title={memo}>{memo}</td>
      <td className="hide-sm" style={{padding:'14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT}}>{created}</td>
      <td style={{padding:'14px 16px', textAlign:'center', position:'relative'}}>
        <div style={{display:'inline-flex', justifyContent:'center'}}>
          <ActionsMenu items={[
            { key: 'copy', label: 'Copy', onClick: handleCopy, icon: <Copy size={14} /> },
            { key: 'open', label: 'Open', onClick: handleOpen, icon: <ExternalLink size={14} /> },
          ]} />
        </div>
      </td>
    </tr>
  );
}

// Compact actions menu component used in table rows to save horizontal space
function ActionsMenu({ items }: { items: Array<{ key: string; label: string; onClick: () => void; icon?: React.ReactNode; destructive?: boolean; }> }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);
  return (
    <div ref={ref} style={{position:'relative', display:'inline-block'}}>
      <button aria-haspopup="menu" aria-expanded={open} onClick={(e)=>{ e.stopPropagation(); setOpen(v=>!v); }} className="btn icon" style={{width:40, height:40, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:10, background:'var(--card)', border:'1px solid hsl(var(--border))', boxShadow:'var(--shadow-xs)'}} title="Actions">···</button>
      {open && (
        <div role="menu" style={{position:'absolute', right:0, top:44, background:'var(--card)', border:'1px solid hsl(var(--border))', borderRadius:12, padding:8, boxShadow:'var(--shadow-strong)', minWidth:200, zIndex:9999, marginTop:6, pointerEvents:'auto'}}>
          {items.map((it) => (
            <button key={it.key} role="menuitem" onClick={() => { setOpen(false); it.onClick(); }} style={{display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px', borderRadius:8, background:'transparent', border:'none', color: it.destructive ? 'var(--color-error)' : 'var(--color-text-primary)', textAlign:'left', cursor:'pointer'}}>
              {it.icon ? <span style={{width:28, height:28, display:'inline-flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'var(--overlay-weak)'}}>{it.icon}</span> : null}
              <span style={{fontWeight:700, fontSize:15}}>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DiagnosticsCard({ toast, onHealth }: { toast: (m:string, t?:Toast['type'])=>void; onHealth?: (h:any)=>void }) {
  return (
      <div className="card" style={{padding:24, borderRadius:12, background: CARD_BG, boxShadow: SHADOW}}>
      <div style={{fontWeight:700, marginBottom:6, color:'var(--color-text-primary)', fontSize:14, display:'flex', alignItems:'center', gap:8}}>
        <Cog size={16} />
        <span>Diagnostics</span>
      </div>
      <SmokeButton toast={toast} onHealth={onHealth} />
    </div>
  );
}

function SmokeButton({ toast, onHealth }: { toast: (m:string, t?:Toast['type'])=>void; onHealth?: (h:any)=>void }) {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toggle = (i:number) => setExpanded(s => ({ ...s, [i]: !s[i] }));
  const run = async () => {
    setBusy(true);
    const results: any = { steps: [] };
    try {
      const rh = await fetch(`${apiBase()}/api/health`);
      const th = await rh.text(); const jh = JSON.parse(th);
      results.steps.push({ step: 'health', ok: rh.ok, status: rh.status, body: jh }); onHealth?.(jh); toast(`Health: ok=${jh.ok} envReady=${jh.envReady}`, jh.ok ? 'success' : 'error');
      const rl = await fetch(`${apiBase()}/api/invoices?limit=3&offset=0`); const tl = await rl.text(); let jl:any; try { jl = JSON.parse(tl); } catch { jl = tl; }
      results.steps.push({ step: 'list', ok: rl.ok, status: rl.status, body: jl }); toast(`List invoices → ${rl.status}`, rl.ok ? 'success' : 'error');
      const rc = await fetch(`${apiBase()}/api/invoices`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ amount: '1.00', currency:'USD', memo:'Smoke test', dueDays: 14 })}); const tc = await rc.text(); let jc:any; try { jc = JSON.parse(tc); } catch { jc = tc; }
      results.steps.push({ step: 'create', ok: rc.ok, status: rc.status, body: jc }); toast(`Create invoice → ${rc.status}`, rc.ok ? 'success' : 'error');
      const invId = jc?.id || jc?.invoiceInformation?.invoiceNumber || jc?.invoice_id || null;
      if (invId) { const rg = await fetch(`${apiBase()}/api/invoices/${encodeURIComponent(invId)}`); const tg = await rg.text(); let jg:any; try { jg = JSON.parse(tg); } catch { jg = tg; } results.steps.push({ step: 'get_invoice', ok: rg.ok, status: rg.status, id: invId, body: jg }); toast(`Get invoice(${invId}) → ${rg.status}`, rg.ok ? 'success' : 'error'); }
      const rpl = await fetch(`${apiBase()}/api/payment-links`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ amount: '1.23', currency:'USD', memo:'Smoke paylink' })}); const tpl = await rpl.text(); let jpl:any; try { jpl = JSON.parse(tpl); } catch { jpl = tpl; }
      results.steps.push({ step: 'create_payment_link', ok: rpl.ok, status: rpl.status, body: jpl }); toast(`Create pay link → ${rpl.status}`, rpl.ok ? 'success' : 'error');
      const plId = jpl?.id || jpl?.paymentLinkId || null; if (plId) { const rplg = await fetch(`${apiBase()}/api/payment-links/${encodeURIComponent(plId)}`); const tplg = await rplg.text(); let jplg:any; try { jplg = JSON.parse(tplg); } catch { jplg = tplg; } results.steps.push({ step: 'get_payment_link', ok: rplg.ok, status: rplg.status, id: plId, body: jplg }); toast(`Get pay link(${plId}) → ${rplg.status}`, rplg.ok ? 'success' : 'error'); }
      const prompt = `Create invoice for $2.50 USD to test-smoke@example.com due in 7 days with \"Smoke Test\"}`;
      const rai = await fetch(`${apiBase()}/api/ai`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt })}); const tai = await rai.text(); let jai:any; try { jai = JSON.parse(tai); } catch { jai = tai; }
      results.steps.push({ step: 'ai_create_invoice', ok: rai.ok, status: rai.status, body: jai, prompt }); toast(`AI create invoice → ${rai.status}`, rai.ok ? 'success' : 'error'); setLast(results);
    } catch (e:any) { toast('Smoke test error: ' + String(e), 'error'); setLast({ error:true, message: String(e) }); } finally { setBusy(false); }
  };
  return (
    <div>
      <button className="btn" aria-label="Run Smoke Test" onClick={run} disabled={busy} style={{padding:'8px 10px', borderRadius:10, fontSize:13}}>{busy ? 'Running…' : 'Run Smoke Test'}</button>
      {Array.isArray(last?.steps) && last.steps.length > 0 ? (
        <div style={{marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
          {last.steps.map((s:any, i:number) => {
            const ok = !!s.ok;
            const badgeClass = ok ? 'success' : 'destructive';
            return (
              <div key={i} style={{display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:10, alignItems:'center', padding:'10px 12px', border:'1px solid hsl(var(--border))', borderRadius:10, background:'hsl(var(--background))'}}>
                <span className={`status-badge ${badgeClass}`}>{ok ? 'OK' : 'ERR'}</span>
                <div style={{fontWeight:700}}>{s.step}</div>
                <div className="mono">HTTP {s.status ?? '-'}</div>
                <div style={{display:'inline-flex', gap:8, justifyContent:'flex-end'}}>
                  {s.id ? <span className="mono" title="Resource ID">{s.id}</span> : null}
                  <button className="btn secondary mini" onClick={() => toggle(i)} aria-label={`Toggle details for ${s.step}`} style={{padding:'6px 10px', borderRadius:8}}>Details</button>
                </div>
                {expanded[i] && (
                  <div style={{gridColumn:'1 / -1'}}>
                    <pre style={{marginTop:8, padding:8, borderRadius:8, background:'hsl(var(--accent))', color:'hsl(var(--foreground))', maxHeight:220, overflow:'auto', fontSize:12}}>{typeof s.body === 'string' ? s.body : JSON.stringify(s.body, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : last ? (
        <pre style={{marginTop:8, padding:8, borderRadius:8, background:'hsl(var(--accent))', color:'hsl(var(--foreground))', maxHeight:300, overflow:'auto', fontSize:12}}>{JSON.stringify(last, null, 2)}</pre>
      ) : null}
    </div>
  );
}


// Global style for font, variables and dark theme
const globalStyle = `
  /* Import fonts */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');

  :root {
    --gutter: 16px;
    --card-padding: 24px;
    --color-primary: ${colors.primary};
    --color-secondary: ${colors.secondary};
    --color-background: ${colors.background};
    --color-surface: ${colors.surface};
    --color-text-primary: ${colors.textPrimary};
    --color-text-secondary: ${colors.textSecondary};
    --color-success: ${colors.success};
    --color-warning: ${colors.warning};
    --color-error: ${colors.error};
    --color-error-bg: rgba(255,78,66,0.06);
    /* Overlay / small opacity helpers */
    --overlay: rgba(255,255,255,0.06);
    /* Slightly darker weak overlay for icon/backplate contrast */
    --overlay-weak: rgba(255,255,255,0.02);
    /* Input background: darker inset used for form controls */
    --input-bg: rgba(6,8,10,0.55);
    --divider-faint: rgba(255,255,255,0.03);
    /* Shadows */
    --shadow-xs: 0 1px 1px rgba(0,0,0,0.04);
    --shadow-soft: 0 6px 16px rgba(0,0,0,0.12);
    --shadow-strong: 0 6px 16px rgba(0,0,0,0.35);
    --shadow-hover: 0 12px 40px rgba(0,0,0,0.18);
    /* Badge borders */
    --badge-border-dark: rgba(255,255,255,0.02);
    --badge-border-light: rgba(0,0,0,0.04);
    --radius-card: ${radii.card};
    --radius-button: ${radii.button};
    --radius-input: ${radii.input};
    --shadow-elevation: ${shadow};
  }

  html, body, #root {
    height: 100%;
  }

  body {
    background: var(--color-background);
    color: var(--color-text-primary);
    font-family: ${fonts.body};
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Utility tokens used by existing styles */
  :root {
    --primary: var(--color-primary);
    --primary-foreground: var(--color-text-primary);
    --background: var(--color-background);
    --card: var(--color-surface);
    --foreground: var(--color-text-primary);
    --accent: rgba(10,14,30,0.2);
    --border: 220 14% 10%; /* hsl placeholders when used with hsl(var(--border)) */
  }

  /* Light theme overrides (toggle by setting data-theme="light" on <html> or <body>) */
  [data-theme="light"] {
    --color-background: #ffffff;
    --color-surface: #f8fafc;
    --color-text-primary: #0f172a;
    --color-text-secondary: #475569;
    --primary-foreground: #ffffff;
    --accent: rgba(10,14,30,0.04);
    --border: 220 14% 94%;
    --background: var(--color-background);
    --card: var(--color-surface);
  }

  .card { background: var(--card); border-radius: var(--radius-card); box-shadow: var(--shadow-elevation); }
  .btn { border-radius: var(--radius-button); }
  .mono { font-family: ${fonts.mono}; }
  .status-badge { padding: 6px 8px; border-radius: 8px; font-weight: 700; }
  .status-badge.primary { background: var(--primary); color: var(--primary-foreground); }
  .status-badge.success { background: var(--color-success); color: var(--primary-foreground); }
  .status-badge.destructive { background: var(--color-error); color: var(--primary-foreground); }

  /* Toast container and badge polish (no gradients, no JS motion) */
  .toasts {
    position: fixed;
    right: 16px;
    bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 9999;
  }
  .status-badge { padding: 8px 10px; border-radius: 8px; box-shadow: var(--shadow-soft); }
  .status-badge.primary { border: 1px solid var(--badge-border-dark); }
  .status-badge.success { border: 1px solid var(--badge-border-light); }
  .status-badge.destructive { border: 1px solid var(--badge-border-light); }

  /* Remove motion on hover: no translate or shadow transitions */
  .status-badge { padding: 8px 10px; border-radius: 8px; box-shadow: none; }
  .status-badge.primary { border: 1px solid var(--badge-border-dark); }
  .status-badge.success { border: 1px solid var(--badge-border-light); }
  .status-badge.destructive { border: 1px solid var(--badge-border-light); }

  /* Card hover: subtle static highlight only (no motion) */
  .card { background: var(--card); border-radius: var(--radius-card); box-shadow: var(--shadow-elevation); }
  .card:hover { background: color-mix(in srgb, var(--card) 92%, rgba(255,255,255,0.02)); }

  /* small helpers to keep layout consistent */
  select.input, input.input, textarea.input { background: var(--input-bg); color: var(--color-text-primary); }

  /* Focus styles for keyboard navigation: visible ring matching primary */
  select.input:focus, input.input:focus, textarea.input:focus {
    outline: none;
    box-shadow: 0 0 0 4px rgba(24,136,115,0.14);
    border-radius: 12px;
  }
  pre { font-family: ${fonts.mono}; }
`;

function AppWithBranding(props: any) {
  return <>
    <style>{globalStyle}</style>
    <App {...props} />
  </>;
}

export default AppWithBranding;


