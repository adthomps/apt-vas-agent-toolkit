"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const theme_1 = require("./theme");
// framer-motion removed — use standard CSS transitions for hover/opacity
const CARD_BG = theme_1.colors.surface;
const CARD_ALT = theme_1.colors.background;
const HEADER_BG = theme_1.colors.primary;
const HEADER_FONT_WEIGHT = 700;
const TABLE_FONT = `14px ${theme_1.fonts.body}`;
const ROW_HOVER = theme_1.colors.background;
const ROW_FONT_WEIGHT = 500;
// Use a CSS variable for input backgrounds so we can fine-tune tone in one place
const INPUT_BG = 'var(--input-bg)';
const SHADOW = theme_1.shadow;
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
const lucide_react_1 = require("lucide-react");
const loadModule_1 = require("./loadModule");
// --- Utility imports and UI constants ---
// apiBase: Returns API base URL from window-scoped override or relative default
const apiBase = () => {
    const w = typeof window !== 'undefined' ? window : undefined;
    const base = w?.VITE_API_BASE || w?.API_BASE || '';
    return typeof base === 'string' ? base : '';
};
// useFetch: Simple data fetching hook
function pickMessage(x) {
    if (!x)
        return undefined;
    if (typeof x === 'string')
        return x;
    return (x.message || x.error?.message || x.error_description ||
        (Array.isArray(x.errors) && x.errors[0]?.message) || x.detail || x.title || undefined);
}
function humanizeHttp(status, body, fallback) {
    const prefix = status ? `HTTP ${status}` : 'Request failed';
    const msg = pickMessage(body) || fallback;
    return msg ? `${prefix}: ${msg}` : prefix;
}
function useFetch(url, deps = []) {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [meta, setMeta] = (0, react_1.useState)(null);
    const [nonce, setNonce] = (0, react_1.useState)(0);
    const refresh = () => setNonce((n) => n + 1);
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        async function run() {
            setLoading(true);
            setError(null);
            try {
                const r = await fetch(url);
                const t = await r.text();
                let v = t;
                try {
                    v = JSON.parse(t);
                }
                catch { }
                if (!cancelled) {
                    setData(v);
                    setMeta({ ok: r.ok, status: r.status, rawText: t });
                    if (!r.ok)
                        setError(humanizeHttp(r.status, v, typeof t === 'string' ? t : undefined));
                }
            }
            catch (e) {
                if (!cancelled) {
                    setError(String(e?.message || e));
                    setMeta({ ok: false, status: 0, rawText: String(e) });
                }
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        }
        if (url)
            run();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, nonce, ...deps]);
    return { data, loading, error, refresh, meta };
}
const TOOL_OPTIONS = [
    { value: 'auto', label: 'Auto (AI decides)' },
    { value: 'create-invoice', label: 'Create Invoice' },
    { value: 'update-invoice', label: 'Update Invoice' },
    { value: 'list-invoices', label: 'List Invoices' },
    { value: 'send-invoice', label: 'Send Invoice' },
    { value: 'create-pay-link', label: 'Create Pay Link' },
    { value: 'list-pay-links', label: 'List Pay Links' },
];
function daysBetweenToday(isoDate) {
    if (!isoDate)
        return undefined;
    const d = new Date(isoDate);
    if (isNaN(d.getTime()))
        return undefined;
    const today = new Date();
    const ms = d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}
function AgentPanel({ toast }) {
    const [stage, setStage] = (0, react_1.useState)('input');
    const [action, setAction] = (0, react_1.useState)('auto');
    const [input, setInput] = (0, react_1.useState)('');
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [errorRaw, setErrorRaw] = (0, react_1.useState)(null);
    const [showErrorRaw, setShowErrorRaw] = (0, react_1.useState)(false);
    const [extracted, setExtracted] = (0, react_1.useState)({});
    const [missing, setMissing] = (0, react_1.useState)(null);
    const [fieldValues, setFieldValues] = (0, react_1.useState)({});
    const [result, setResult] = (0, react_1.useState)(null);
    const [resultRaw, setResultRaw] = (0, react_1.useState)(null);
    const [resultStatus, setResultStatus] = (0, react_1.useState)(null);
    const [detectedAction, setDetectedAction] = (0, react_1.useState)(null);
    const samples = [
        // Invoice examples include amount, currency, recipient/email, and due date or explicit date
        'Create an invoice for $450.00 USD to billing@acme.example for ACME Corp, due in 15 days. Memo: Website redesign.',
        'Find all unpaid invoices over $500 USD',
        'Update invoice #1034: set amount 600.00 EUR and due date 2026-06-01',
        // Pay-by-link examples: include amount/currency or min/max for donations, and a product description
        'Create a pay link for $25.00 USD for "Sticker Pack" with memo "Sticker Pack" (purchase).',
        'Create a donation link with min amount 1.00 USD and max amount 500.00 USD, memo "Charity Drive" (donation).'
    ];
    const handleExtract = async (e) => {
        e?.preventDefault();
        if (!input.trim())
            return;
        setBusy(true);
        setError(null);
        setStage('extract');
        setResult(null);
        try {
            const r = await fetch(`${apiBase()}/api/extract-fields`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input, action }) });
            const t = await r.text();
            let j;
            try {
                j = JSON.parse(t);
            }
            catch {
                j = { error: true, message: t };
            }
            if (!r.ok) {
                setErrorRaw(t);
                throw new Error(humanizeHttp(r.status, j, t));
            }
            // Received extraction result from server
            const serverExtracted = j.extracted || {};
            // Debug: log extraction payloads to help troubleshoot runtime issues in the browser
            // eslint-disable-next-line no-console
            console.info('Server extraction result:', serverExtracted);
            // Use the shared extractor module (improved heuristics)
            // Use the centralized loader to normalize CJS <-> ESM shapes and avoid raw `require` in the bundle
            // Ask loader to resolve extractor; loader will try .js/.mjs/index.js variants so dev server can resolve
            const extractorModule = await (0, loadModule_1.loadModule)('./extractor');
            // eslint-disable-next-line no-console
            console.info('Loaded extractor module:', Object.keys(extractorModule || {}));
            // Support both named export and CommonJS default (module.exports)
            const inferFromText = extractorModule?.inferFromText || extractorModule?.default?.inferFromText || extractorModule?.default || extractorModule;
            const inferred = (typeof inferFromText === 'function') ? inferFromText(input, serverExtracted) : {};
            // eslint-disable-next-line no-console
            console.info('Local inference result:', inferred);
            setExtracted(inferred);
            // Merge server "missing" with our inferred results: filter out items we were able to infer
            const serverMissing = Array.isArray(j.missing) ? j.missing : [];
            const filteredMissing = serverMissing.filter(k => !(inferred[k] !== undefined && inferred[k] !== ''));
            setMissing((filteredMissing || [])
                .reduce((acc, k) => { acc[k] = k; return acc; }, {}));
            if (j.action && j.action !== action)
                setDetectedAction(j.action);
            setFieldValues(j.extracted || {});
            setStage((j.missing && j.missing.length) ? 'prompt' : 'confirm');
            toast('Fields extracted', 'success');
        }
        catch (e) {
            setError(e);
            setShowErrorRaw(false);
            setStage('input');
            toast('Extraction failed', 'error');
        }
        finally {
            setBusy(false);
        }
    };
    const handleMissingChange = (key, value) => {
        setFieldValues(s => ({ ...s, [key]: value }));
    };
    function buildPendingCall() {
        const eff = (detectedAction || action);
        if (eff === 'create-invoice' || eff === 'create_invoice') {
            const dueDays = daysBetweenToday(fieldValues.dueDate) ?? 30;
            const body = {
                amount: fieldValues.amount,
                currency: String(fieldValues.currency || 'USD').toUpperCase(),
                email: fieldValues.email,
                customerName: fieldValues.customerName || fieldValues.name,
                memo: fieldValues.memo || fieldValues.description || 'Invoice',
                dueDays,
            };
            return { method: 'POST', url: `${apiBase()}/api/invoices`, body };
        }
        if (eff === 'update-invoice' || eff === 'update_invoice') {
            const id = fieldValues.invoiceId || fieldValues.id;
            if (!id)
                return null;
            const body = {
                amount: fieldValues.amount,
                currency: String(fieldValues.currency || 'USD').toUpperCase(),
                description: fieldValues.description || fieldValues.memo || undefined,
                dueDate: fieldValues.dueDate || undefined,
            };
            return { method: 'POST', url: `${apiBase()}/api/invoices/${encodeURIComponent(id)}/update`, body };
        }
        if (eff === 'send-invoice' || eff === 'send_invoice') {
            const id = fieldValues.invoiceId || fieldValues.id;
            if (!id)
                return null;
            return { method: 'POST', url: `${apiBase()}/api/invoices/${encodeURIComponent(id)}/send` };
        }
        if (eff === 'list-invoices' || eff === 'list_invoices') {
            const status = fieldValues.status ? `&status=${encodeURIComponent(fieldValues.status)}` : '';
            return { method: 'GET', url: `${apiBase()}/api/invoices?limit=5&offset=0${status}` };
        }
        if (eff === 'create-pay-link' || eff === 'create_payment_link') {
            const body = {
                currency: String(fieldValues.currency || 'USD').toUpperCase(),
                memo: fieldValues.memo || fieldValues.productDescription || 'Payment link',
                linkType: (fieldValues.linkType && String(fieldValues.linkType).toUpperCase() === 'DONATION') ? 'DONATION' : 'PURCHASE',
            };
            if (body.linkType === 'PURCHASE')
                body.amount = fieldValues.amount;
            else {
                if (fieldValues.minAmount)
                    body.minAmount = fieldValues.minAmount;
                if (fieldValues.maxAmount)
                    body.maxAmount = fieldValues.maxAmount;
            }
            // developerId/solutionId intentionally omitted from AI-created payloads for now
            return { method: 'POST', url: `${apiBase()}/api/payment-links`, body };
        }
        if (eff === 'list-pay-links' || eff === 'list_pay_links') {
            const status = fieldValues.status ? `&status=${encodeURIComponent(fieldValues.status)}` : '';
            return { method: 'GET', url: `${apiBase()}/api/payment-links?limit=5&offset=0${status}` };
        }
        if (eff === 'auto') {
            // Fallback: call /api/ai directly
            const body = { prompt: input, tool: 'auto' };
            return { method: 'POST', url: `${apiBase()}/api/ai`, body };
        }
        return null;
    }
    const handleConfirm = async () => {
        const pending = buildPendingCall();
        if (!pending) {
            toast('Missing or invalid fields', 'error');
            return;
        }
        setBusy(true);
        setStage('submit');
        setError(null);
        setResult(null);
        try {
            const r = await fetch(pending.url, { method: pending.method, headers: pending.body ? { 'Content-Type': 'application/json' } : undefined, body: pending.body ? JSON.stringify(pending.body) : undefined });
            const t = await r.text();
            let j;
            try {
                j = JSON.parse(t);
            }
            catch {
                j = t;
            }
            setResult(j);
            setResultRaw(t);
            setResultStatus(r.status || null);
            setStage('done');
            toast(r.ok ? 'Agent flow complete' : 'Request failed', r.ok ? 'success' : 'error');
        }
        catch (e) {
            const msg = String(e);
            setResult({ error: true, message: msg });
            setResultRaw(msg);
            setResultStatus(null);
            setStage('done');
            toast('Request error', 'error');
        }
        finally {
            setBusy(false);
        }
    };
    const handleRestart = () => {
        setStage('input');
        setInput('');
        setExtracted({});
        setMissing(null);
        setFieldValues({});
        setResult(null);
        setError(null);
        setDetectedAction(null);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "card", style: {
            padding: 24,
            borderRadius: theme_1.radii.card,
            background: CARD_BG,
            boxShadow: SHADOW,
            fontFamily: theme_1.fonts.body,
            color: theme_1.colors.textPrimary,
            marginBottom: 32,
            transition: 'transform 160ms ease, box-shadow 160ms ease, opacity 200ms ease',
        }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                    fontWeight: 700,
                    color: theme_1.colors.textPrimary,
                }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Bot, { size: 20 }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 18, fontFamily: theme_1.fonts.heading }, children: "AI Agent Assistant" }), action === 'auto' && detectedAction && ((0, jsx_runtime_1.jsxs)("span", { className: "status-badge primary", style: { marginLeft: 8, background: theme_1.colors.secondary, color: theme_1.colors.textPrimary, borderRadius: theme_1.radii.button, padding: '2px 8px', fontWeight: 600 }, children: ["Detected: ", detectedAction] }))] }), stage === 'input' && ((0, jsx_runtime_1.jsxs)("form", { onSubmit: handleExtract, children: [(0, jsx_runtime_1.jsx)("textarea", { value: input, onChange: e => setInput(e.target.value), placeholder: 'e.g., "Create invoice for $100 to Acme"', style: {
                            width: '100%',
                            minHeight: 96,
                            padding: '16px 18px',
                            borderRadius: theme_1.radii.input,
                            border: 'none',
                            background: INPUT_BG,
                            color: 'var(--color-text-primary)',
                            marginBottom: 16,
                            resize: 'vertical',
                            fontFamily: theme_1.fonts.body,
                            fontSize: 15,
                            lineHeight: 1.45,
                            boxSizing: 'border-box',
                        } }), (0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }, children: "Action" }), (0, jsx_runtime_1.jsx)("select", { className: "input", value: action, onChange: e => setAction(e.target.value), disabled: busy, style: {
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: theme_1.radii.input,
                            border: 'none',
                            background: INPUT_BG,
                            color: 'var(--color-text-primary)',
                            marginBottom: 14,
                            fontFamily: theme_1.fonts.body,
                            boxSizing: 'border-box',
                        }, children: TOOL_OPTIONS.map(o => (0, jsx_runtime_1.jsx)("option", { value: o.value, children: o.label }, o.value)) }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }, children: samples.map((s, i) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: "btn secondary mini", onClick: () => setInput(s), style: {
                                padding: '6px 10px',
                                borderRadius: theme_1.radii.button,
                                background: 'var(--color-secondary)',
                                color: 'var(--color-text-primary)',
                                fontWeight: 500,
                                fontFamily: theme_1.fonts.body,
                                border: 'none',
                                cursor: 'pointer',
                            }, title: "Click to use this prompt", children: ["Use: ", s.length > 42 ? s.slice(0, 41) + '…' : s] }, i))) }), (0, jsx_runtime_1.jsxs)("button", { className: "btn", "aria-label": "Submit Request", type: "submit", disabled: busy || !input.trim(), style: {
                            width: '100%',
                            padding: '10px 0',
                            borderRadius: theme_1.radii.button,
                            fontWeight: 800,
                            background: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            fontFamily: theme_1.fonts.body,
                            fontSize: 15,
                            border: 'none',
                            boxShadow: theme_1.shadow,
                            cursor: 'pointer',
                        }, children: [(0, jsx_runtime_1.jsx)("span", { style: {
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 28,
                                    height: 28,
                                    borderRadius: theme_1.radii.button,
                                    background: 'var(--overlay)'
                                }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Send, { size: 16 }) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 15 }, children: "Submit Request" })] }), error && ((0, jsx_runtime_1.jsxs)("div", { className: "muted", style: { marginTop: 8, color: 'var(--color-error)' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600 }, children: "Something went wrong." }), (0, jsx_runtime_1.jsx)("div", { children: typeof error === 'string' ? error : String(error?.message || 'An error occurred.') }), errorRaw ? ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 6 }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "btn secondary mini", onClick: () => setShowErrorRaw(v => !v), style: {
                                            padding: '6px 10px',
                                            borderRadius: theme_1.radii.button,
                                            background: 'var(--color-error)',
                                            color: 'var(--color-text-primary)',
                                            fontWeight: 500,
                                            fontFamily: theme_1.fonts.body,
                                            border: 'none',
                                            cursor: 'pointer',
                                        }, children: showErrorRaw ? 'Hide raw response' : 'Show raw response' }), showErrorRaw && ((0, jsx_runtime_1.jsx)("pre", { style: {
                                            marginTop: 6,
                                            padding: 8,
                                            borderRadius: theme_1.radii.input,
                                            background: 'var(--background)',
                                            color: 'var(--color-text-primary)',
                                            maxHeight: 200,
                                            overflow: 'auto',
                                            fontSize: 12,
                                            fontFamily: theme_1.fonts.mono,
                                        }, children: errorRaw }))] })) : null] }))] })), stage === 'extract' && ((0, jsx_runtime_1.jsx)("div", { style: { margin: '24px 0', textAlign: 'center', color: theme_1.colors.textSecondary }, children: "Extracting fields\u2026" })), stage === 'prompt' && ((0, jsx_runtime_1.jsxs)("form", { onSubmit: (e) => { e.preventDefault(); setStage('confirm'); }, children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 10, color: 'var(--color-text-secondary)' }, children: "Please provide the following details:" }), Object.entries(missing || {}).map(([key]) => ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 10 }, children: [(0, jsx_runtime_1.jsx)("label", { style: { fontWeight: 600, color: 'var(--color-text-secondary)' }, children: key }), (0, jsx_runtime_1.jsx)("input", { className: "input", type: "text", value: fieldValues[key] || '', onChange: e => handleMissingChange(key, e.target.value), required: true, style: {
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: theme_1.radii.input,
                                    border: 'none',
                                    background: INPUT_BG,
                                    color: 'var(--color-text-primary)',
                                    marginTop: 4,
                                    fontFamily: theme_1.fonts.body,
                                    boxSizing: 'border-box',
                                } })] }, key))), (0, jsx_runtime_1.jsx)("button", { className: "btn", type: "submit", style: {
                            width: '100%',
                            padding: '10px 0',
                            borderRadius: theme_1.radii.button,
                            fontWeight: 800,
                            background: 'var(--primary)',
                            color: 'var(--primary-foreground)',
                            marginTop: 8,
                            fontFamily: theme_1.fonts.body,
                            border: 'none',
                            boxShadow: theme_1.shadow,
                            cursor: 'pointer',
                        }, children: "Continue" })] })), stage === 'confirm' && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 10, color: theme_1.colors.textSecondary }, children: "Confirm details:" }), (() => {
                        const p = buildPendingCall();
                        if (!p)
                            return null;
                        const hasBody = p.body !== undefined;
                        return ((0, jsx_runtime_1.jsxs)("div", { style: {
                                marginBottom: 12,
                                padding: '8px 10px',
                                border: `1px solid var(--color-secondary)`,
                                borderRadius: theme_1.radii.input,
                                background: 'var(--card)',
                            }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: hasBody ? 6 : 0 }, children: [(0, jsx_runtime_1.jsx)("span", { className: "status-badge primary", style: {
                                                fontFamily: theme_1.fonts.mono,
                                                background: 'var(--primary)',
                                                color: 'var(--primary-foreground)',
                                                borderRadius: theme_1.radii.button,
                                                padding: '2px 8px',
                                                fontWeight: 600,
                                            }, children: p.method }), (0, jsx_runtime_1.jsx)("code", { style: {
                                                fontFamily: theme_1.fonts.mono,
                                                fontSize: 12,
                                                color: theme_1.colors.textSecondary,
                                            }, children: p.url.replace(location.origin, '') })] }), hasBody && ((0, jsx_runtime_1.jsx)("pre", { style: {
                                        margin: 0,
                                        padding: 8,
                                        background: 'var(--background)',
                                        color: 'var(--color-text-primary)',
                                        borderRadius: theme_1.radii.input,
                                        maxHeight: 160,
                                        overflow: 'auto',
                                        fontSize: 12,
                                        fontFamily: theme_1.fonts.mono,
                                    }, children: JSON.stringify(p.body, null, 2) }))] }));
                    })(), (0, jsx_runtime_1.jsx)("table", { style: {
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: 14,
                            background: 'transparent',
                            marginBottom: 12,
                            fontFamily: theme_1.fonts.body,
                        }, children: (0, jsx_runtime_1.jsx)("tbody", { children: Object.entries(fieldValues).map(([k, v]) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '6px 8px', fontWeight: 600, color: theme_1.colors.textSecondary }, children: k }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '6px 8px', color: theme_1.colors.textPrimary }, children: String(v) })] }, k))) }) }), (0, jsx_runtime_1.jsx)("button", { className: "btn", onClick: handleConfirm, style: {
                            width: '100%',
                            padding: '10px 0',
                            borderRadius: theme_1.radii.button,
                            fontWeight: 800,
                            background: theme_1.colors.success,
                            color: theme_1.colors.textPrimary,
                            fontFamily: theme_1.fonts.body,
                            border: 'none',
                            boxShadow: theme_1.shadow,
                            cursor: 'pointer',
                        }, children: "Submit" })] })), stage === 'submit' && ((0, jsx_runtime_1.jsx)("div", { style: { margin: '24px 0', textAlign: 'center', color: 'var(--color-text-primary)' }, children: "Submitting\u2026" })), stage === 'done' && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 10, color: 'var(--color-text-primary)' }, children: "Result:" }), resultStatus !== null && ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("span", { className: `status-badge ${result && !result.error ? 'success' : 'destructive'}`, children: (result && !result.error) ? 'OK' : 'ERR' }), (0, jsx_runtime_1.jsx)("span", { className: "mono", children: `HTTP ${resultStatus}` }), resultRaw ? ((0, jsx_runtime_1.jsx)("button", { className: "btn secondary mini", onClick: () => setShowErrorRaw(v => !v), style: { marginLeft: 'auto', padding: '6px 10px', borderRadius: 8 }, children: showErrorRaw ? 'Hide raw' : 'Show raw' })) : null] })), (() => {
                        // Normalized payload detection
                        const body = result;
                        if (!body)
                            return (0, jsx_runtime_1.jsx)("pre", { style: { margin: 0, padding: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--background)', color: 'var(--color-text-primary)', borderRadius: 8 }, children: JSON.stringify(result, null, 2) });
                        // invoices list
                        const invoices = body.invoices || body.items || (Array.isArray(body) && body) || (body?.invoice ? [body.invoice] : null);
                        if (Array.isArray(invoices) && invoices.length && invoices[0] && (invoices[0].orderInformation || invoices[0].invoiceInformation || invoices[0].id)) {
                            return ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 8 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 800, fontSize: 16, marginBottom: 8 }, children: "AI \u2014 Invoices" }), (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', marginTop: 8, background: CARD_BG, borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-strong)', fontFamily: TABLE_FONT }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: HEADER_BG }, children: [(0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "ID" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'right', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, minWidth: 140 }, children: "Amount" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "Customer" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "Status" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "Due Date" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'center', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "Actions" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: invoices.map((it, i) => (0, jsx_runtime_1.jsx)(InvoiceTableRow, { inv: it, toast: toast, onChanged: () => { } }, it?.id || i)) })] })] }));
                        }
                        // payment-links list
                        const paylinks = body.paymentLinks || body.links || body.items || (Array.isArray(body) && body) || (body?.paymentLink ? [body.paymentLink] : null);
                        if (Array.isArray(paylinks) && paylinks.length && (paylinks[0]?.paymentLink || paylinks[0].id)) {
                            return ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 8 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 800, fontSize: 16 }, children: "AI \u2014 Payment Links" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 12, alignItems: 'center' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'inline-flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("span", { style: { background: theme_1.colors.success, color: '#fff', padding: '4px 8px', borderRadius: 8, fontWeight: 800, fontSize: 12 }, children: "PURCHASE" }), (0, jsx_runtime_1.jsx)("span", { style: { color: theme_1.colors.textSecondary, fontSize: 13 }, children: "One-time purchase" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'inline-flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("span", { style: { background: theme_1.colors.secondary, color: '#fff', padding: '4px 8px', borderRadius: 8, fontWeight: 800, fontSize: 12 }, children: "DONATION" }), (0, jsx_runtime_1.jsx)("span", { style: { color: theme_1.colors.textSecondary, fontSize: 13 }, children: "Donation (min/max)" })] })] })] }), (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', marginTop: 8, background: CARD_BG, borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-strong)', fontFamily: TABLE_FONT }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: HEADER_BG }, children: [(0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "ID" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "Created" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'right', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, minWidth: 140 }, children: "Amount" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "Product" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'center', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "Payment Link" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: paylinks.map((pl, i) => {
                                                    // massage into the shape PayLinkTableRow expects
                                                    // Preserve linkType if provided by the API (support camelCase and snake_case)
                                                    const linkTypeFromApi = pl.linkType || pl.link_type || pl.purchaseInformation?.linkType || pl.purchaseInformation?.link_type || pl.paymentInformation?.paymentType || pl.orderInformation?.purchaseType || undefined;
                                                    const normal = {
                                                        id: pl.id || pl.paymentLinkId || pl.reference || pl._id || pl.linkId || '',
                                                        amount: pl.amount || pl.orderInformation?.amountDetails?.totalAmount || '',
                                                        currency: pl.currency || pl.orderInformation?.amountDetails?.currency || '',
                                                        memo: pl.memo || pl.description || '',
                                                        created: pl.created || pl.createdAt || pl.submitTimeUtc || '',
                                                        // carry through linkType so PayLinkTableRow or other renderers can show it when present
                                                        linkType: typeof linkTypeFromApi === 'string' ? String(linkTypeFromApi).toUpperCase() : linkTypeFromApi
                                                    };
                                                    return (0, jsx_runtime_1.jsx)(PayLinkTableRow, { pl: normal, toast: toast }, normal.id || i);
                                                }) })] })] }));
                        }
                        // fallback: show raw JSON
                        return (0, jsx_runtime_1.jsx)("pre", { style: { margin: 0, padding: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--background)', color: 'var(--color-text-primary)', borderRadius: 8 }, children: JSON.stringify(result, null, 2) });
                    })(), showErrorRaw && resultRaw && ((0, jsx_runtime_1.jsx)("pre", { style: { marginTop: 8, padding: 12, background: 'var(--background)', color: 'var(--color-text-primary)', borderRadius: 8, maxHeight: 220, overflow: 'auto', fontSize: 12 }, children: resultRaw })), (0, jsx_runtime_1.jsx)("button", { className: "btn secondary", onClick: handleRestart, style: { width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 800, background: 'var(--card)', color: 'var(--color-text-primary)', marginTop: 12 }, children: "Start Over" })] }))] }));
}
function App() {
    const [toasts, setToasts] = (0, react_1.useState)([]);
    const toast = (message, type = 'info') => {
        setToasts((ts) => [...ts, { message, type }]);
        setTimeout(() => setToasts((ts) => ts.slice(1)), 3000);
    };
    const GITHUB_DOC_URL = (typeof window !== 'undefined' && window.REPO_DOCS_URL) || 'https://github.com/<OWNER>/<REPO>/blob/main/docs/visa-acceptance-agent-toolkit.md';
    // Try to surface logo/hero images if present in /assets or root. Graceful fallback to the existing circle.
    const useImage = (src) => {
        const [ok, setOk] = (0, react_1.useState)(false);
        (0, react_1.useEffect)(() => {
            if (!src)
                return;
            if (typeof window === 'undefined')
                return;
            const img = new Image();
            img.onload = () => setOk(true);
            img.onerror = () => setOk(false);
            img.src = src;
        }, [src]);
        return ok;
    };
    function LogoOrFallback() {
        const candidates = ['/assets/apt-logo.png', '/assets/logo.png', '/logo.png', '/apt-logo.png'];
        const [src, setSrc] = (0, react_1.useState)(null);
        (0, react_1.useEffect)(() => {
            let mounted = true;
            (async () => {
                for (const c of candidates) {
                    try {
                        await new Promise((res, rej) => {
                            const img = new Image();
                            img.onload = () => res();
                            img.onerror = () => rej();
                            img.src = c;
                        });
                        if (mounted) {
                            setSrc(c);
                            break;
                        }
                    }
                    catch { }
                }
            })();
            return () => { mounted = false; };
        }, []);
        if (src)
            return (0, jsx_runtime_1.jsx)("img", { src: src, alt: "APT logo", style: { width: 48, height: 48, borderRadius: 12 } });
        return (0, jsx_runtime_1.jsx)("div", { style: { width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${theme_1.colors.primary}, ${theme_1.colors.secondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme_1.colors.textPrimary, fontWeight: 800 }, children: "APT" });
    }
    return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: 24, display: 'grid', gap: 16 }, children: [(0, jsx_runtime_1.jsxs)("header", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [(0, jsx_runtime_1.jsx)(LogoOrFallback, {}), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 16, fontWeight: 800 }, children: 'APT Acceptance Agent' }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, color: theme_1.colors.textSecondary }, children: "Adaptive Intelligence for Payments" })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => { window.open(GITHUB_DOC_URL, '_blank'); }, className: "btn secondary mini", style: { borderRadius: 10, padding: '6px 10px', background: 'transparent', color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 8 }, title: "Open implementation docs on GitHub", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 14 }), (0, jsx_runtime_1.jsx)("span", { style: { marginLeft: 4, fontWeight: 700 }, children: "Docs" })] }), (0, jsx_runtime_1.jsx)(ThemeToggle, {})] })] }), (0, jsx_runtime_1.jsx)(AgentPanel, { toast: toast }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }, children: [(0, jsx_runtime_1.jsx)(CreateInvoiceCard, { toast: toast }), (0, jsx_runtime_1.jsx)(CreatePayLinkCard, { toast: toast })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }, children: [(0, jsx_runtime_1.jsx)("div", { className: "card", style: { padding: 16, borderRadius: 12, background: CARD_BG, boxShadow: SHADOW }, children: (0, jsx_runtime_1.jsx)(ListPanel, { title: "Invoices", resource: "invoices", toast: toast }) }), (0, jsx_runtime_1.jsx)("div", { className: "card", style: { padding: 16, borderRadius: 12, background: CARD_BG, boxShadow: SHADOW }, children: (0, jsx_runtime_1.jsx)(ListPanel, { title: "Pay Links", resource: "payment-links", toast: toast }) })] }), (0, jsx_runtime_1.jsx)(DiagnosticsCard, { toast: toast, onHealth: () => { } }), (0, jsx_runtime_1.jsx)("div", { style: { position: 'fixed', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }, children: toasts.map((t, i) => ((0, jsx_runtime_1.jsx)("div", { className: `status-badge ${t.type}`, style: { padding: '8px 10px', borderRadius: 8 }, children: t.message }, i))) })] }));
}
// Small theme toggle component used in the header
function ThemeToggle() {
    const getInitial = () => {
        if (typeof window === 'undefined')
            return 'system';
        try {
            const saved = localStorage.getItem('site-theme');
            if (saved === 'light' || saved === 'dark' || saved === 'system')
                return saved;
        }
        catch { }
        return 'system';
    };
    const [choice, setChoice] = (0, react_1.useState)(() => getInitial());
    const [menuOpen, setMenuOpen] = (0, react_1.useState)(false);
    // helper to compute effective theme (what we apply to document)
    const applyTheme = (c) => {
        if (typeof document === 'undefined')
            return;
        if (c === 'system') {
            const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
            document.documentElement.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
            try {
                localStorage.setItem('site-theme', 'system');
            }
            catch { }
            return;
        }
        document.documentElement.setAttribute('data-theme', c);
        try {
            localStorage.setItem('site-theme', c);
        }
        catch { }
    };
    // apply initial
    (0, react_1.useEffect)(() => { applyTheme(choice); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    // Listen to system changes only when choice === 'system'
    (0, react_1.useEffect)(() => {
        if (choice !== 'system' || typeof window === 'undefined' || !window.matchMedia)
            return;
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const handler = (e) => {
            const matches = 'matches' in e ? e.matches : mq.matches;
            document.documentElement.setAttribute('data-theme', matches ? 'light' : 'dark');
        };
        try {
            if (mq.addEventListener)
                mq.addEventListener('change', handler);
            else if (mq.addListener)
                mq.addListener(handler);
        }
        catch { }
        return () => {
            try {
                if (mq.removeEventListener)
                    mq.removeEventListener('change', handler);
                else if (mq.removeListener)
                    mq.removeListener(handler);
            }
            catch { }
        };
    }, [choice]);
    // update when user explicitly chooses
    (0, react_1.useEffect)(() => { applyTheme(choice); }, [choice]);
    const effective = () => {
        if (choice === 'system') {
            if (typeof window === 'undefined')
                return 'dark';
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        return choice;
    };
    const iconFor = (c) => {
        if (c === 'light')
            return (0, jsx_runtime_1.jsx)(lucide_react_1.Sun, { size: 16 });
        if (c === 'dark')
            return (0, jsx_runtime_1.jsx)(lucide_react_1.Moon, { size: 16 });
        return (0, jsx_runtime_1.jsx)(lucide_react_1.Monitor, { size: 16 });
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative', display: 'flex', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)("button", { "aria-haspopup": "true", "aria-expanded": menuOpen, onClick: () => setMenuOpen(v => !v), className: "btn icon", style: { width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'var(--card)', boxShadow: 'var(--shadow-xs)' }, title: "Theme", children: effective() === 'light' ? (0, jsx_runtime_1.jsx)(lucide_react_1.Sun, { size: 18 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Moon, { size: 18 }) }), menuOpen && ((0, jsx_runtime_1.jsxs)("div", { role: "menu", onMouseLeave: () => setMenuOpen(false), style: { position: 'absolute', right: 0, top: 54, background: 'var(--card)', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 12, boxShadow: 'var(--shadow-strong)', minWidth: 160, marginTop: 6 }, children: [(0, jsx_runtime_1.jsxs)("button", { role: "menuitem", onClick: () => { setChoice('light'); setMenuOpen(false); }, style: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', textAlign: 'left' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--overlay-weak)' }, children: iconFor('light') }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 700 }, children: "Light" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: "Use light colors" })] })] }), (0, jsx_runtime_1.jsxs)("button", { role: "menuitem", onClick: () => { setChoice('dark'); setMenuOpen(false); }, style: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', textAlign: 'left' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--overlay-weak)' }, children: iconFor('dark') }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 700 }, children: "Dark" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: "Use dark colors" })] })] }), (0, jsx_runtime_1.jsxs)("button", { role: "menuitem", onClick: () => { setChoice('system'); setMenuOpen(false); }, style: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', textAlign: 'left' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--overlay-weak)' }, children: iconFor('system') }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 700 }, children: "System" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: "Follow OS preference" })] })] })] }))] }));
}
function CreateInvoiceCard({ toast }) {
    const [amount, setAmount] = (0, react_1.useState)('');
    const [currency, setCurrency] = (0, react_1.useState)('USD');
    const [email, setEmail] = (0, react_1.useState)('');
    const [customerName, setCustomerName] = (0, react_1.useState)('');
    const [memo, setMemo] = (0, react_1.useState)('');
    const [dueDays, setDueDays] = (0, react_1.useState)('30');
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [result, setResult] = (0, react_1.useState)(null);
    const [errMsg, setErrMsg] = (0, react_1.useState)(null);
    const [errRaw, setErrRaw] = (0, react_1.useState)(null);
    const [showErrRaw, setShowErrRaw] = (0, react_1.useState)(false);
    const [showCreatedRaw, setShowCreatedRaw] = (0, react_1.useState)(false);
    const dueOptions = [{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }, { value: '', label: 'No due date' }];
    const create = async () => {
        setBusy(true);
        setResult(null);
        setErrMsg(null);
        setErrRaw(null);
        setShowErrRaw(false);
        try {
            const body = { amount, currency, email, customerName, memo, dueDays: dueDays || undefined };
            // Log outgoing request for troubleshooting
            // eslint-disable-next-line no-console
            console.info('Create invoice request', { url: `${apiBase()}/api/invoices`, body });
            const r = await fetch(`${apiBase()}/api/invoices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const t = await r.text();
            let parsed = t;
            try {
                parsed = JSON.parse(t);
            }
            catch { }
            // Log response for troubleshooting
            // eslint-disable-next-line no-console
            console.info('Create invoice response', { status: r.status, parsed, raw: t });
            // Treat some 200 responses as failures if the payload indicates an error
            const parsedIndicatesError = ((typeof parsed === 'string' && /fail|error|failed/i.test(parsed)) ||
                (parsed && (parsed.error || parsed.success === false || (parsed.status && Number(parsed.status) >= 400))));
            if (!r.ok || parsedIndicatesError) {
                setResult(parsed);
                setErrMsg(humanizeHttp(r.status, parsed, t));
                setErrRaw(t);
                toast?.('Create invoice failed', 'error');
            }
            else {
                setResult(parsed);
                toast?.('Invoice created', 'success');
            }
        }
        catch (e) {
            const raw = e?.stack || e?.message || String(e);
            setResult('Error: ' + String(e));
            setErrMsg(String(e));
            setErrRaw && setErrRaw(String(raw));
            // eslint-disable-next-line no-console
            console.error('Create invoice error', e);
            toast?.('Error creating invoice', 'error');
        }
        finally {
            setBusy(false);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "card", style: { padding: 24, borderRadius: 18, background: CARD_BG, boxShadow: SHADOW }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, color: theme_1.colors.textPrimary }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 20 }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 18 }, children: "Create Invoice" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 16, marginBottom: 14, alignItems: 'stretch' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, paddingRight: 18 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }, children: ["Amount ", (0, jsx_runtime_1.jsx)("span", { style: { color: 'var(--color-error)' }, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { className: "input", value: amount, onChange: e => setAmount(e.target.value), disabled: busy, placeholder: "0.00", style: { width: '100%', padding: '12px 18px', borderRadius: 14, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', boxSizing: 'border-box' } })] }), (0, jsx_runtime_1.jsx)("div", { style: { width: 1, background: 'var(--divider-faint)', borderRadius: 2, margin: '6px 0' } }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, paddingLeft: 18 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }, children: "Currency" }), (0, jsx_runtime_1.jsx)("select", { className: "input", value: currency, onChange: e => setCurrency(e.target.value), disabled: busy, style: { width: '100%', padding: '12px 16px', borderRadius: 14, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', boxSizing: 'border-box' }, children: CURRENCIES.map((c) => (0, jsx_runtime_1.jsxs)("option", { value: c.code, children: [c.code, " - ", c.name] }, c.code)) })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }, children: ["Customer Email ", (0, jsx_runtime_1.jsx)("span", { style: { color: 'var(--color-error)' }, children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { className: "input", value: email, onChange: e => setEmail(e.target.value), disabled: busy, placeholder: "customer@example.com", style: { width: '100%', padding: '14px 18px', borderRadius: 14, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', marginBottom: 14, boxSizing: 'border-box' } }), (0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }, children: "Customer Name" }), (0, jsx_runtime_1.jsx)("input", { className: "input", value: customerName, onChange: e => setCustomerName(e.target.value), disabled: busy, placeholder: "John Doe (optional)", style: { width: '100%', padding: '14px 18px', borderRadius: 14, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', marginBottom: 14, boxSizing: 'border-box' } }), (0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }, children: "Memo" }), (0, jsx_runtime_1.jsx)("textarea", { className: "input", value: memo, onChange: e => setMemo(e.target.value), disabled: busy, placeholder: "Description...", style: { width: '100%', padding: '16px 18px', minHeight: 100, borderRadius: 14, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', marginBottom: 14, resize: 'vertical', overflow: 'auto', boxSizing: 'border-box' } }), (0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }, children: "Due Days" }), (0, jsx_runtime_1.jsx)("select", { value: dueDays, onChange: e => setDueDays(e.target.value), disabled: busy, style: { width: '100%', padding: '12px 16px', borderRadius: 14, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', marginBottom: 12, boxSizing: 'border-box' }, children: dueOptions.map(o => (0, jsx_runtime_1.jsx)("option", { value: o.value, children: o.label }, o.value)) }), (0, jsx_runtime_1.jsxs)("button", { className: "btn", "aria-label": "Create Invoice", onClick: create, disabled: busy || !amount.trim() || !email.trim(), style: { width: '100%', padding: '14px 0', borderRadius: 14, fontWeight: 800, background: 'var(--primary)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }, children: [(0, jsx_runtime_1.jsx)("span", { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)' }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 18 }) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 15 }, children: "Create Invoice" })] }), errMsg && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 700 }, children: errMsg }), errRaw ? ((0, jsx_runtime_1.jsx)("button", { className: "btn secondary mini", onClick: () => setShowErrRaw(v => !v), style: { padding: '6px 10px', borderRadius: 8 }, children: showErrRaw ? 'Hide raw' : 'Show raw' })) : null] }), showErrRaw && errRaw ? ((0, jsx_runtime_1.jsx)("pre", { style: { marginTop: 8, padding: 8, borderRadius: 6, background: 'var(--background)', color: 'var(--color-text-primary)', maxHeight: 200, overflow: 'auto', fontSize: 12 }, children: errRaw })) : null] })), result && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 12 }, children: [(() => {
                        const r = result;
                        const invoiceObj = r?.invoice || (r?.data && r.data.invoice) || (r?.invoiceInformation || r?.orderInformation || r?.id ? r : null);
                        if (invoiceObj) {
                            return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 800, marginBottom: 8 }, children: "Created Invoice" }), (0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', marginTop: 8, background: CARD_BG, borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-strong)', fontFamily: TABLE_FONT }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: HEADER_BG }, children: [(0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "ID" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'right', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, minWidth: 140 }, children: "Amount" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "Customer" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "Status" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "Due Date" }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'center', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT }, children: "Actions" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: (0, jsx_runtime_1.jsx)(InvoiceTableRow, { inv: invoiceObj, toast: toast, onChanged: () => { } }, invoiceObj?.id || 'created') })] })] }));
                        }
                        return (0, jsx_runtime_1.jsx)("div", { style: { fontStyle: 'italic', color: 'var(--color-text-secondary)' }, children: "Created \u2014 response returned." });
                    })(), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 10 }, children: [(0, jsx_runtime_1.jsx)("button", { className: "btn secondary mini", onClick: () => setShowCreatedRaw((v) => !v), style: { padding: '6px 10px', borderRadius: 8 }, children: showCreatedRaw ? 'Hide raw response' : 'Show raw response' }), showCreatedRaw && ((0, jsx_runtime_1.jsx)("pre", { style: { marginTop: 8, padding: 12, borderRadius: 8, background: 'var(--background)', color: 'var(--color-text-primary)', maxHeight: 300, overflow: 'auto' }, children: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }))] })] }))] }));
}
function CreatePayLinkCard({ toast }) {
    const [amount, setAmount] = (0, react_1.useState)('');
    const [currency, setCurrency] = (0, react_1.useState)('USD');
    const [linkType, setLinkType] = (0, react_1.useState)('PURCHASE');
    const [minAmount, setMinAmount] = (0, react_1.useState)('');
    const [maxAmount, setMaxAmount] = (0, react_1.useState)('');
    const [showDonationHelp, setShowDonationHelp] = (0, react_1.useState)(false);
    const [minMaxError, setMinMaxError] = (0, react_1.useState)(null);
    const [memo, setMemo] = (0, react_1.useState)('');
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [result, setResult] = (0, react_1.useState)(null);
    const [errMsg, setErrMsg] = (0, react_1.useState)(null);
    const [errRaw, setErrRaw] = (0, react_1.useState)(null);
    const [showErrRaw, setShowErrRaw] = (0, react_1.useState)(false);
    const create = async () => {
        setBusy(true);
        setResult(null);
        setErrMsg(null);
        setErrRaw(null);
        setShowErrRaw(false);
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
            const body = { currency, memo, linkType };
            if (linkType === 'PURCHASE') {
                body.amount = amount;
            }
            else {
                if (minAmount)
                    body.minAmount = minAmount;
                if (maxAmount)
                    body.maxAmount = maxAmount;
            }
            // Log outgoing request for troubleshooting
            // eslint-disable-next-line no-console
            console.info('Create paylink request', { url: `${apiBase()}/api/payment-links`, body });
            const r = await fetch(`${apiBase()}/api/payment-links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const t = await r.text();
            let parsed = t;
            try {
                parsed = JSON.parse(t);
            }
            catch { }
            // Log response
            // eslint-disable-next-line no-console
            console.info('Create paylink response', { status: r.status, parsed, raw: t });
            const parsedIndicatesErrorPL = ((typeof parsed === 'string' && /fail|error|failed/i.test(parsed)) ||
                (parsed && (parsed.error || parsed.success === false || (parsed.status && Number(parsed.status) >= 400))));
            if (!r.ok || parsedIndicatesErrorPL) {
                setResult(parsed);
                setErrMsg(humanizeHttp(r.status, parsed, t));
                setErrRaw(t);
                toast('Error creating pay link', 'error');
            }
            else {
                setResult(parsed);
                toast('Pay link created', 'success');
            }
        }
        catch (e) {
            const raw = e?.stack || e?.message || String(e);
            setResult('Error: ' + String(e));
            setErrMsg(String(e));
            setErrRaw && setErrRaw(String(raw));
            // eslint-disable-next-line no-console
            console.error('Create paylink error', e);
            toast('Error creating pay link', 'error');
        }
        finally {
            setBusy(false);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "card", style: { padding: 24, borderRadius: 18, background: CARD_BG, boxShadow: SHADOW }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, color: theme_1.colors.textPrimary }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Link, { size: 20 }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 18 }, children: "Create Pay-by-Link" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }, children: "Link Type" }), (0, jsx_runtime_1.jsxs)("select", { value: linkType, onChange: e => setLinkType(e.target.value), disabled: busy, style: { width: '100%', padding: '12px 16px', borderRadius: 14, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', boxSizing: 'border-box' }, children: [(0, jsx_runtime_1.jsx)("option", { value: "PURCHASE", children: "Purchase" }), (0, jsx_runtime_1.jsx)("option", { value: "DONATION", children: "Donation" })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 16, marginBottom: 14, alignItems: 'stretch' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, paddingRight: 18 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { fontWeight: 600, color: 'var(--color-text-secondary)' }, children: ["Amount ", (0, jsx_runtime_1.jsx)("span", { style: { color: 'var(--color-error)' }, children: "*" })] }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)' }, children: "Enter whole or decimal amounts" })] }), linkType === 'PURCHASE' ? ((0, jsx_runtime_1.jsx)("input", { className: "input", value: amount, onChange: e => setAmount(e.target.value), disabled: busy, placeholder: "e.g. 25.00", style: { width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', boxSizing: 'border-box' } })) : ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8, marginBottom: 6 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { flex: 1 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)', fontSize: 13 }, children: "Min amount" }), (0, jsx_runtime_1.jsx)("input", { className: "input", value: minAmount, onChange: e => {
                                                            const v = e.target.value.trim();
                                                            setMinAmount(v);
                                                            // live validation
                                                            setMinMaxError(null);
                                                            const numV = v === '' ? NaN : Number(v);
                                                            const numMax = maxAmount.trim() === '' ? NaN : Number(maxAmount);
                                                            if (v !== '' && Number.isNaN(numV)) {
                                                                setMinMaxError('Invalid amount');
                                                            }
                                                            else if (!Number.isNaN(numV) && !Number.isNaN(numMax) && numV > numMax) {
                                                                setMinMaxError('Minimum cannot be greater than maximum');
                                                            }
                                                        }, disabled: busy, placeholder: "e.g. 1.00", "aria-invalid": !!minMaxError, "aria-describedby": minMaxError ? 'min-max-error' : undefined, style: { width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', boxSizing: 'border-box' } })] }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)', fontSize: 13 }, children: "Max amount" }), (0, jsx_runtime_1.jsx)("input", { className: "input", value: maxAmount, onChange: e => {
                                                            const v = e.target.value.trim();
                                                            setMaxAmount(v);
                                                            // live validation
                                                            setMinMaxError(null);
                                                            const numMin = minAmount.trim() === '' ? NaN : Number(minAmount);
                                                            const numV = v === '' ? NaN : Number(v);
                                                            if (v !== '' && Number.isNaN(numV)) {
                                                                setMinMaxError('Invalid amount');
                                                            }
                                                            else if (!Number.isNaN(numMin) && !Number.isNaN(numV) && numMin > numV) {
                                                                setMinMaxError('Minimum cannot be greater than maximum');
                                                            }
                                                        }, disabled: busy, placeholder: "optional", "aria-invalid": !!minMaxError, "aria-describedby": minMaxError ? 'min-max-error' : undefined, style: { width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', boxSizing: 'border-box' } })] })] }), minMaxError ? (0, jsx_runtime_1.jsx)("div", { id: "min-max-error", role: "alert", style: { color: 'var(--color-error)', fontSize: 13, marginBottom: 8 }, children: minMaxError }) : null, (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }, children: "Customers can donate any amount within this range." })] }))] }), (0, jsx_runtime_1.jsx)("div", { style: { width: 1, background: 'var(--divider-faint)', borderRadius: 2, margin: '6px 0' } }), (0, jsx_runtime_1.jsxs)("div", { style: { flex: 1, paddingLeft: 18 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, marginBottom: 6, color: 'var(--color-text-secondary)' }, children: "Currency" }), (0, jsx_runtime_1.jsx)("select", { value: currency, onChange: e => setCurrency(e.target.value), disabled: busy, style: { width: '100%', padding: '12px 16px', borderRadius: 14, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', boxSizing: 'border-box' }, children: CURRENCIES.map((c) => (0, jsx_runtime_1.jsxs)("option", { value: c.code, children: [c.code, " - ", c.name] }, c.code)) })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 14 }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 700, marginBottom: 6, color: 'var(--color-text-secondary)' }, children: "Memo / Product (optional)" }), (0, jsx_runtime_1.jsx)("textarea", { value: memo, onChange: e => setMemo(e.target.value), disabled: busy, placeholder: "e.g., 'Sticker Pack'", style: { width: '100%', padding: '14px 16px', minHeight: 100, borderRadius: 14, border: 'none', background: INPUT_BG, color: 'var(--color-text-primary)', marginBottom: 0, resize: 'vertical', overflow: 'auto', boxSizing: 'border-box' } })] }), (0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsxs)("button", { className: "btn", "aria-label": "Create Pay Link", onClick: create, disabled: busy ||
                        (linkType === 'PURCHASE' ? !amount.trim() : !minAmount.trim()), title: busy ? 'Busy' : (linkType === 'PURCHASE' ? (amount.trim() ? '' : 'Amount required') : (minAmount.trim() ? '' : 'Min amount required')), style: { width: '100%', padding: '16px 0', minHeight: 52, borderRadius: 12, fontWeight: 800, background: 'linear-gradient(180deg, rgba(24,136,115,1) 0%, rgba(20,120,102,1) 100%)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: busy ? 'none' : '0 8px 26px rgba(0,0,0,0.22)' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'var(--overlay-weak)' }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Link, { size: 18 }) }), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 16 }, children: "Create Pay Link" })] }) }), errMsg && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', color: 'var(--color-error)' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 700 }, children: errMsg }), errRaw ? ((0, jsx_runtime_1.jsx)("button", { className: "btn secondary mini", onClick: () => setShowErrRaw(v => !v), style: { padding: '6px 10px', borderRadius: 8 }, children: showErrRaw ? 'Hide raw' : 'Show raw' })) : null] }), showErrRaw && errRaw ? ((0, jsx_runtime_1.jsx)("pre", { style: { marginTop: 8, padding: 8, borderRadius: 6, background: 'var(--background)', color: 'var(--color-text-secondary)', maxHeight: 200, overflow: 'auto', fontSize: 12 }, children: errRaw })) : null] })), result && (0, jsx_runtime_1.jsx)("pre", { style: { marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--background)', color: 'var(--color-text-secondary)', maxHeight: 220, overflow: 'auto' }, children: typeof result === 'string' ? result : JSON.stringify(result, null, 2) })] }));
}
function ListPanel({ title, resource, toast }) {
    const [showRaw, setShowRaw] = (0, react_1.useState)(false);
    const [showErrorRaw, setShowErrorRaw] = (0, react_1.useState)(false);
    const { data, loading, error, refresh, meta } = useFetch(`${apiBase()}/api/${resource}?limit=5&offset=0`, [resource]);
    // DEBUG: show raw API response in console for pay-by-link
    react_1.default.useEffect(() => {
        if (resource === 'payment-links' && data) {
            // eslint-disable-next-line no-console
            console.log('PayLink API raw response:', data);
        }
    }, [resource, data]);
    let items = [];
    let total = 0;
    try {
        const body = typeof data === 'string' ? JSON.parse(data) : data;
        if (body?.invoices && Array.isArray(body.invoices)) {
            items = body.invoices;
            total = body.total || items.length;
        }
        else if (body?.paymentLinks && Array.isArray(body.paymentLinks)) {
            items = body.paymentLinks;
            total = body.total || items.length;
        }
        else if (body?.links && Array.isArray(body.links)) {
            items = body.links;
            total = body.totalLinks || items.length;
        }
        else if (body?.items && Array.isArray(body.items)) {
            items = body.items;
            total = body.total || items.length;
        }
        else if (body?.data && Array.isArray(body.data)) {
            items = body.data;
            total = body.total || items.length;
        }
        else if (Array.isArray(body)) {
            items = body;
            total = items.length;
        }
    }
    catch { }
    const isInvoices = resource === 'invoices';
    const isPayLinks = resource === 'payment-links';
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-primary)' }, children: [isInvoices ? (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 18 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Link, { size: 18 }), isInvoices ? `Recent Invoices (Last 5 of ${total})` : `Recent Pay-by-Links (Last 5 of ${total})`] }), (0, jsx_runtime_1.jsxs)("button", { onClick: refresh, "aria-label": isInvoices ? 'Refresh invoices' : 'Refresh pay-by-links', className: "btn secondary", style: { borderRadius: 10, padding: '6px 12px', background: CARD_ALT, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 16 }), (0, jsx_runtime_1.jsx)("span", { children: "Refresh" })] })] }), loading ? (0, jsx_runtime_1.jsx)("div", { className: "muted", children: "Loading\u2026" }) : null, error ? ((0, jsx_runtime_1.jsxs)("div", { className: "card", style: { padding: 12, borderRadius: 10, background: 'var(--color-error-bg)', border: '1px solid var(--color-error)', color: 'var(--color-error)', marginTop: 6 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 700 }, children: error }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'inline-flex', gap: 8 }, children: [meta?.status ? (0, jsx_runtime_1.jsxs)("span", { className: "mono", title: "HTTP status", children: ["HTTP ", meta.status] }) : null, meta?.rawText ? ((0, jsx_runtime_1.jsx)("button", { className: "btn secondary mini", onClick: () => setShowErrorRaw(v => !v), style: { padding: '6px 10px', borderRadius: 8 }, children: showErrorRaw ? 'Hide raw' : 'Show raw' })) : null] })] }), showErrorRaw && meta?.rawText ? ((0, jsx_runtime_1.jsx)("pre", { style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'var(--background)', color: 'var(--color-text-secondary)', maxHeight: 200, overflow: 'auto', fontSize: 12 }, children: meta.rawText })) : null] })) : null, items.length === 0 && !loading ? ((0, jsx_runtime_1.jsxs)("div", { className: "card muted", children: ["No ", isInvoices ? 'invoices' : 'pay-by-links', " found. Create one above."] })) : ((0, jsx_runtime_1.jsx)("div", { children: isInvoices ? ((0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', borderCollapse: 'collapse', marginTop: 8, background: CARD_BG, borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-strong)', fontFamily: TABLE_FONT }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: HEADER_BG }, children: [(0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT }, children: (0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Hash, { size: 14 }), " ID"] }) }), (0, jsx_runtime_1.jsx)("th", { className: "hide-sm", style: { textAlign: 'right', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT, minWidth: 140 }, children: (0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.DollarSign, { size: 14 }), " Amount"] }) }), (0, jsx_runtime_1.jsx)("th", { className: "hide-sm", style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT }, children: (0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.User, { size: 14 }), " Customer"] }) }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT }, children: (0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Tag, { size: 14 }), " Status"] }) }), (0, jsx_runtime_1.jsx)("th", { className: "hide-sm", style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT }, children: (0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Calendar, { size: 14 }), " Due Date"] }) }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'center', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT }, children: (0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Zap, { size: 14 }), " Actions"] }) })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: items.map((it, i) => (0, jsx_runtime_1.jsx)(InvoiceTableRow, { inv: it, toast: toast, onChanged: refresh }, it?.id || i)) })] })) : ((0, jsx_runtime_1.jsxs)("table", { style: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginTop: 8, background: CARD_BG, borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-strong)', fontFamily: TABLE_FONT }, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { style: { background: HEADER_BG }, children: [(0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT, width: '16%' }, children: (0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Hash, { size: 14 }), " ID"] }) }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT, width: '18%' }, children: (0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Calendar, { size: 14 }), " Created"] }) }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT, minWidth: 120, width: '12%' }, children: (0, jsx_runtime_1.jsx)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: "Type" }) }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'right', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT, width: '12%' }, children: (0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.DollarSign, { size: 14 }), " Amount"] }) }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'left', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT, width: '30%' }, children: (0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 14 }), " Product"] }) }), (0, jsx_runtime_1.jsx)("th", { style: { textAlign: 'center', padding: '14px 16px', fontWeight: HEADER_FONT_WEIGHT, fontSize: 15, fontFamily: TABLE_FONT, width: '12%' }, children: (0, jsx_runtime_1.jsxs)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 14 }), " Payment Link"] }) })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: items.map((pl, i) => {
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
                                return ((0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: `1px solid var(--divider-faint)`, background: CARD_BG }, onMouseOver: e => (e.currentTarget.style.background = ROW_HOVER), onMouseOut: e => (e.currentTarget.style.background = CARD_BG), children: [(0, jsx_runtime_1.jsx)("td", { className: "mono", style: { padding: '14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: id }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: created }), (() => {
                                            // Prefer explicit API-provided link type (support both camelCase and snake_case)
                                            const raw = (pl.linkType || pl.link_type || pl.purchaseInformation?.linkType || pl.purchaseInformation?.link_type || pl.purchaseInformation?.purchaseType || pl.paymentInformation?.paymentType || pl.orderInformation?.purchaseType || '') || '';
                                            const normalized = String(raw).toUpperCase();
                                            // If API returned something, prefer it (uppercased). Otherwise fall back to inference.
                                            const shown = normalized.includes('DONATION') ? 'DONATION' : (normalized.includes('PURCHASE') ? 'PURCHASE' : (raw ? String(raw).toUpperCase() : ''));
                                            // If we don't have an explicit linkType text, infer from payload: presence of amount => PURCHASE, min/max => DONATION
                                            const amtPresent = pl.amount || pl.orderInformation?.amountDetails?.totalAmount || pl.transactionAmount;
                                            const minMaxPresent = pl.minAmount || pl.maxAmount || pl.purchaseInformation?.minAmount || pl.purchaseInformation?.maxAmount;
                                            const inferredType = shown || (minMaxPresent ? 'DONATION' : (amtPresent ? 'PURCHASE' : '—'));
                                            const badgeColor = inferredType === 'DONATION' ? theme_1.colors.secondary : (inferredType === 'PURCHASE' ? theme_1.colors.success : 'rgba(255,255,255,0.06)');
                                            return ((0, jsx_runtime_1.jsx)("td", { style: { padding: '14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: (0, jsx_runtime_1.jsx)("span", { style: { display: 'inline-flex', alignItems: 'center', gap: 8 }, children: (0, jsx_runtime_1.jsx)("span", { style: { background: badgeColor, color: '#fff', padding: '4px 8px', borderRadius: 8, fontWeight: 800, fontSize: 12, lineHeight: '1' }, children: inferredType === '—' ? '' : inferredType }) }) }));
                                        })(), (0, jsx_runtime_1.jsxs)("td", { style: { padding: '14px 16px', textAlign: 'right', fontFamily: TABLE_FONT, fontWeight: 700, fontSize: 18, minWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: [amount || '-', " ", (0, jsx_runtime_1.jsx)("span", { style: { opacity: 0.7, fontSize: 12, marginLeft: 8 }, children: currency || '' })] }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 420, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.2em', maxHeight: '2.4em', wordBreak: 'break-word' }, title: product, children: product }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '14px 16px', textAlign: 'center' }, children: paymentLink ? ((0, jsx_runtime_1.jsxs)("button", { className: "btn mini", "aria-label": `View payment link ${id}`, onClick: () => window.open(paymentLink, '_blank'), style: { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: 10, padding: '8px 10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 14 }), (0, jsx_runtime_1.jsx)("span", { children: "View Link" })] })) : '' })] }, id || i));
                            }) })] })) })), items.length > 0 && ((0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 }, children: (0, jsx_runtime_1.jsx)("button", { className: "btn secondary mini", onClick: () => setShowRaw(v => !v), style: { borderRadius: 8, padding: '6px 10px' }, children: "View raw JSON" }) })), items.length > 0 && showRaw && ((0, jsx_runtime_1.jsx)("pre", { style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'var(--background)', color: 'var(--color-text-secondary)', maxHeight: 300, overflow: 'auto', fontSize: 12 }, children: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }))] }));
}
function InvoiceTableRow({ inv, toast, onChanged }) {
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
    const canCancel = !isCanceled && !isPaid && (statusLower.includes('draft') ||
        statusLower.includes('sent') ||
        statusLower.includes('pending'));
    const dueDate = inv.invoiceInformation?.dueDate ? (inv.invoiceInformation.dueDate.includes('T') ? inv.invoiceInformation.dueDate.split('T')[0] : inv.invoiceInformation.dueDate) : '';
    const handleSend = async () => { try {
        const r = await fetch(`${apiBase()}/api/invoices/${encodeURIComponent(id || '')}/send`, { method: 'POST' });
        if (r.ok) {
            toast('Invoice sent', 'success');
            onChanged();
        }
        else
            toast('Failed to send invoice', 'error');
    }
    catch (e) {
        toast('Error sending invoice', 'error');
    } };
    const handleCancel = async () => {
        if (!id) {
            toast('Missing invoice id', 'error');
            return;
        }
        const ok = window.confirm('Cancel this invoice?');
        if (!ok)
            return;
        try {
            const r = await fetch(`${apiBase()}/api/invoices/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
            if (r.ok) {
                toast('Invoice canceled', 'success');
                onChanged();
            }
            else {
                toast('Failed to cancel invoice', 'error');
            }
        }
        catch (e) {
            toast('Error canceling invoice', 'error');
        }
    };
    const payUrl = inv?.invoiceInformation?.paymentLink
        || inv?.invoiceInformation?.paymentPageUrl
        || inv?.invoiceInformation?.invoiceUrl
        || inv?.paymentLink
        || inv?.paymentPageUrl
        || inv?.hostedUrl
        || inv?.hostedPaymentPageUrl
        || null;
    const handleOpen = async () => {
        if (payUrl && typeof payUrl === 'string') {
            window.open(payUrl, '_blank');
            return;
        }
        if (!id) {
            toast('Missing invoice id', 'error');
            return;
        }
        try {
            const r = await fetch(`${apiBase()}/api/invoices/${encodeURIComponent(id)}`);
            const t = await r.text();
            let j = t;
            try {
                j = JSON.parse(t);
            }
            catch { }
            const fetchedUrl = j?.invoiceInformation?.paymentLink
                || j?.invoiceInformation?.paymentPageUrl
                || j?.invoiceInformation?.invoiceUrl
                || j?.paymentLink
                || j?.paymentPageUrl
                || j?.hostedUrl
                || j?.hostedPaymentPageUrl
                || null;
            if (typeof fetchedUrl === 'string' && fetchedUrl) {
                window.open(fetchedUrl, '_blank');
                return;
            }
            toast('Payment page not available for this invoice', 'error');
        }
        catch (e) {
            toast('Failed to fetch payment page: ' + String(e), 'error');
        }
    };
    return ((0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: `1px solid var(--divider-faint)`, background: CARD_BG, transition: 'background 160ms ease' }, onMouseOver: e => (e.currentTarget.style.background = ROW_HOVER), onMouseOut: e => (e.currentTarget.style.background = CARD_BG), children: [(0, jsx_runtime_1.jsx)("td", { className: "mono", style: { padding: '14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT }, children: id || '(no id)' }), (0, jsx_runtime_1.jsxs)("td", { className: "hide-sm", style: { padding: '14px 16px', textAlign: 'right', fontFamily: TABLE_FONT, fontWeight: 700, fontSize: 18, minWidth: 140 }, children: [amt || '-', " ", (0, jsx_runtime_1.jsx)("span", { style: { opacity: 0.7, fontSize: 12, marginLeft: 8 }, children: cur || '' })] }), (0, jsx_runtime_1.jsx)("td", { className: "hide-sm", style: { padding: '14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT }, children: name }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT }, children: (0, jsx_runtime_1.jsx)("span", { className: `status-badge ${statusClass}`, children: status || 'Unknown' }) }), (0, jsx_runtime_1.jsx)("td", { className: "hide-sm", style: { padding: '14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT }, children: dueDate }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '14px 16px', textAlign: 'center', position: 'relative' }, children: (0, jsx_runtime_1.jsx)("div", { style: { display: 'inline-flex', justifyContent: 'center' }, children: (0, jsx_runtime_1.jsx)(ActionsMenu, { items: [
                            !isPaid ? { key: 'send', label: 'Send', onClick: handleSend, icon: (0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { size: 14 }) } : null,
                            { key: 'view', label: 'View Payment Page', onClick: handleOpen, icon: (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 14 }) },
                            canCancel ? { key: 'cancel', label: 'Cancel', onClick: handleCancel, destructive: true, icon: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { size: 14 }) } : null,
                        ].filter(Boolean) }) }) })] }));
}
function PayLinkTableRow({ pl, toast }) {
    const id = pl.id;
    const amt = pl.amount;
    const cur = pl.currency;
    const memo = pl.memo || '';
    const created = pl.created || pl.createdAt || pl.created_at || '';
    const handleCopy = async () => { try {
        const url = `${window.location.origin}/paylink/${id}`;
        await (navigator.clipboard?.writeText(url));
        toast('Pay link copied', 'success');
    }
    catch {
        toast('Copy failed', 'error');
    } };
    const handleOpen = () => { if (!id)
        return; window.open(`/paylink/${id}`, '_blank'); };
    return ((0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: `1px solid var(--divider-faint)`, background: CARD_BG }, onMouseOver: e => (e.currentTarget.style.background = ROW_HOVER), onMouseOut: e => (e.currentTarget.style.background = CARD_BG), children: [(0, jsx_runtime_1.jsx)("td", { className: "mono", style: { padding: '14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT }, children: id || '(no id)' }), (0, jsx_runtime_1.jsxs)("td", { className: "hide-sm", style: { padding: '14px 16px', textAlign: 'right', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT }, children: [amt || '-', " ", (0, jsx_runtime_1.jsx)("span", { style: { opacity: .85, fontSize: 12 }, children: cur || '' })] }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }, title: memo, children: memo }), (0, jsx_runtime_1.jsx)("td", { className: "hide-sm", style: { padding: '14px 16px', fontFamily: TABLE_FONT, fontWeight: ROW_FONT_WEIGHT }, children: created }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '14px 16px', textAlign: 'center', position: 'relative' }, children: (0, jsx_runtime_1.jsx)("div", { style: { display: 'inline-flex', justifyContent: 'center' }, children: (0, jsx_runtime_1.jsx)(ActionsMenu, { items: [
                            { key: 'copy', label: 'Copy', onClick: handleCopy, icon: (0, jsx_runtime_1.jsx)(lucide_react_1.Copy, { size: 14 }) },
                            { key: 'open', label: 'Open', onClick: handleOpen, icon: (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { size: 14 }) },
                        ] }) }) })] }));
}
// Compact actions menu component used in table rows to save horizontal space
function ActionsMenu({ items }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const ref = react_1.default.useRef(null);
    (0, react_1.useEffect)(() => {
        const onDoc = (e) => {
            if (!ref.current)
                return;
            if (!ref.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener('click', onDoc);
        return () => document.removeEventListener('click', onDoc);
    }, []);
    return ((0, jsx_runtime_1.jsxs)("div", { ref: ref, style: { position: 'relative', display: 'inline-block' }, children: [(0, jsx_runtime_1.jsx)("button", { "aria-haspopup": "menu", "aria-expanded": open, onClick: (e) => { e.stopPropagation(); setOpen(v => !v); }, className: "btn icon", style: { width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'var(--card)', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-xs)' }, title: "Actions", children: "\u00B7\u00B7\u00B7" }), open && ((0, jsx_runtime_1.jsx)("div", { role: "menu", style: { position: 'absolute', right: 0, top: 52, background: 'var(--card)', border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 8, boxShadow: 'var(--shadow-strong)', minWidth: 200, zIndex: 40, marginTop: 6 }, children: items.map((it) => ((0, jsx_runtime_1.jsxs)("button", { role: "menuitem", onClick: () => { setOpen(false); it.onClick(); }, style: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px', borderRadius: 8, background: 'transparent', border: 'none', color: it.destructive ? 'var(--color-error)' : 'var(--color-text-primary)', textAlign: 'left', cursor: 'pointer' }, children: [it.icon ? (0, jsx_runtime_1.jsx)("span", { style: { width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--overlay-weak)' }, children: it.icon }) : null, (0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 700, fontSize: 15 }, children: it.label })] }, it.key))) }))] }));
}
function DiagnosticsCard({ toast, onHealth }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "card", style: { padding: 24, borderRadius: 12, background: CARD_BG, boxShadow: SHADOW }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { fontWeight: 700, marginBottom: 6, color: 'var(--color-text-primary)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Cog, { size: 16 }), (0, jsx_runtime_1.jsx)("span", { children: "Diagnostics" })] }), (0, jsx_runtime_1.jsx)(SmokeButton, { toast: toast, onHealth: onHealth })] }));
}
function SmokeButton({ toast, onHealth }) {
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [last, setLast] = (0, react_1.useState)(null);
    const [expanded, setExpanded] = (0, react_1.useState)({});
    const toggle = (i) => setExpanded(s => ({ ...s, [i]: !s[i] }));
    const run = async () => {
        setBusy(true);
        const results = { steps: [] };
        try {
            const rh = await fetch(`${apiBase()}/api/health`);
            const th = await rh.text();
            const jh = JSON.parse(th);
            results.steps.push({ step: 'health', ok: rh.ok, status: rh.status, body: jh });
            onHealth?.(jh);
            toast(`Health: ok=${jh.ok} envReady=${jh.envReady}`, jh.ok ? 'success' : 'error');
            const rl = await fetch(`${apiBase()}/api/invoices?limit=3&offset=0`);
            const tl = await rl.text();
            let jl;
            try {
                jl = JSON.parse(tl);
            }
            catch {
                jl = tl;
            }
            results.steps.push({ step: 'list', ok: rl.ok, status: rl.status, body: jl });
            toast(`List invoices → ${rl.status}`, rl.ok ? 'success' : 'error');
            const rc = await fetch(`${apiBase()}/api/invoices`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: '1.00', currency: 'USD', memo: 'Smoke test', dueDays: 14 }) });
            const tc = await rc.text();
            let jc;
            try {
                jc = JSON.parse(tc);
            }
            catch {
                jc = tc;
            }
            results.steps.push({ step: 'create', ok: rc.ok, status: rc.status, body: jc });
            toast(`Create invoice → ${rc.status}`, rc.ok ? 'success' : 'error');
            const invId = jc?.id || jc?.invoiceInformation?.invoiceNumber || jc?.invoice_id || null;
            if (invId) {
                const rg = await fetch(`${apiBase()}/api/invoices/${encodeURIComponent(invId)}`);
                const tg = await rg.text();
                let jg;
                try {
                    jg = JSON.parse(tg);
                }
                catch {
                    jg = tg;
                }
                results.steps.push({ step: 'get_invoice', ok: rg.ok, status: rg.status, id: invId, body: jg });
                toast(`Get invoice(${invId}) → ${rg.status}`, rg.ok ? 'success' : 'error');
            }
            const rpl = await fetch(`${apiBase()}/api/payment-links`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: '1.23', currency: 'USD', memo: 'Smoke paylink' }) });
            const tpl = await rpl.text();
            let jpl;
            try {
                jpl = JSON.parse(tpl);
            }
            catch {
                jpl = tpl;
            }
            results.steps.push({ step: 'create_payment_link', ok: rpl.ok, status: rpl.status, body: jpl });
            toast(`Create pay link → ${rpl.status}`, rpl.ok ? 'success' : 'error');
            const plId = jpl?.id || jpl?.paymentLinkId || null;
            if (plId) {
                const rplg = await fetch(`${apiBase()}/api/payment-links/${encodeURIComponent(plId)}`);
                const tplg = await rplg.text();
                let jplg;
                try {
                    jplg = JSON.parse(tplg);
                }
                catch {
                    jplg = tplg;
                }
                results.steps.push({ step: 'get_payment_link', ok: rplg.ok, status: rplg.status, id: plId, body: jplg });
                toast(`Get pay link(${plId}) → ${rplg.status}`, rplg.ok ? 'success' : 'error');
            }
            const prompt = `Create invoice for $2.50 USD to test-smoke@example.com due in 7 days with \"Smoke Test\"}`;
            const rai = await fetch(`${apiBase()}/api/ai`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
            const tai = await rai.text();
            let jai;
            try {
                jai = JSON.parse(tai);
            }
            catch {
                jai = tai;
            }
            results.steps.push({ step: 'ai_create_invoice', ok: rai.ok, status: rai.status, body: jai, prompt });
            toast(`AI create invoice → ${rai.status}`, rai.ok ? 'success' : 'error');
            setLast(results);
        }
        catch (e) {
            toast('Smoke test error: ' + String(e), 'error');
            setLast({ error: true, message: String(e) });
        }
        finally {
            setBusy(false);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("button", { className: "btn", "aria-label": "Run Smoke Test", onClick: run, disabled: busy, style: { padding: '8px 10px', borderRadius: 10, fontSize: 13 }, children: busy ? 'Running…' : 'Run Smoke Test' }), Array.isArray(last?.steps) && last.steps.length > 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }, children: last.steps.map((s, i) => {
                    const ok = !!s.ok;
                    const badgeClass = ok ? 'success' : 'destructive';
                    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 10, alignItems: 'center', padding: '10px 12px', border: '1px solid hsl(var(--border))', borderRadius: 10, background: 'hsl(var(--background))' }, children: [(0, jsx_runtime_1.jsx)("span", { className: `status-badge ${badgeClass}`, children: ok ? 'OK' : 'ERR' }), (0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 700 }, children: s.step }), (0, jsx_runtime_1.jsxs)("div", { className: "mono", children: ["HTTP ", s.status ?? '-'] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }, children: [s.id ? (0, jsx_runtime_1.jsx)("span", { className: "mono", title: "Resource ID", children: s.id }) : null, (0, jsx_runtime_1.jsx)("button", { className: "btn secondary mini", onClick: () => toggle(i), "aria-label": `Toggle details for ${s.step}`, style: { padding: '6px 10px', borderRadius: 8 }, children: "Details" })] }), expanded[i] && ((0, jsx_runtime_1.jsx)("div", { style: { gridColumn: '1 / -1' }, children: (0, jsx_runtime_1.jsx)("pre", { style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'hsl(var(--accent))', color: 'hsl(var(--foreground))', maxHeight: 220, overflow: 'auto', fontSize: 12 }, children: typeof s.body === 'string' ? s.body : JSON.stringify(s.body, null, 2) }) }))] }, i));
                }) })) : last ? ((0, jsx_runtime_1.jsx)("pre", { style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'hsl(var(--accent))', color: 'hsl(var(--foreground))', maxHeight: 300, overflow: 'auto', fontSize: 12 }, children: JSON.stringify(last, null, 2) })) : null] }));
}
// Global style for font, variables and dark theme
const globalStyle = `
  /* Import fonts */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');

  :root {
    --gutter: 16px;
    --card-padding: 24px;
    --color-primary: ${theme_1.colors.primary};
    --color-secondary: ${theme_1.colors.secondary};
    --color-background: ${theme_1.colors.background};
    --color-surface: ${theme_1.colors.surface};
    --color-text-primary: ${theme_1.colors.textPrimary};
    --color-text-secondary: ${theme_1.colors.textSecondary};
    --color-success: ${theme_1.colors.success};
    --color-warning: ${theme_1.colors.warning};
    --color-error: ${theme_1.colors.error};
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
    --radius-card: ${theme_1.radii.card};
    --radius-button: ${theme_1.radii.button};
    --radius-input: ${theme_1.radii.input};
    --shadow-elevation: ${theme_1.shadow};
  }

  html, body, #root {
    height: 100%;
  }

  body {
    background: var(--color-background);
    color: var(--color-text-primary);
    font-family: ${theme_1.fonts.body};
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
  .mono { font-family: ${theme_1.fonts.mono}; }
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
  pre { font-family: ${theme_1.fonts.mono}; }
`;
function AppWithBranding(props) {
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("style", { children: globalStyle }), (0, jsx_runtime_1.jsx)(App, { ...props })] });
}
exports.default = AppWithBranding;
