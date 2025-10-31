import dotenv from 'dotenv';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
// Optional SANDBOX passthrough: resolve SDK from package if installed, otherwise fall back to local source
// eslint-disable-next-line @typescript-eslint/no-var-requires
const req = typeof require !== 'undefined' ? require : undefined as any;
function safeRequire(id: string): any { try { return req ? req(id) : null; } catch { return null; } }
const pkg = safeRequire('@visaacceptance/agent-toolkit');
const local = safeRequire('../../../src/shared/api');
const VisaAcceptanceAPI = (pkg && (pkg.VisaAcceptanceAPI || pkg.default))
  || (local && (local.VisaAcceptanceAPI || local.default));

// Load env (base then local overrides)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('[VisaAcceptance] server/app.ts starting');
console.log('[VisaAcceptance] process.cwd():', process.cwd());
console.log('[VisaAcceptance] VISA_ACCEPTANCE_MERCHANT_ID:', process.env.VISA_ACCEPTANCE_MERCHANT_ID);
console.log('[VisaAcceptance] VISA_ACCEPTANCE_ENVIRONMENT:', process.env.VISA_ACCEPTANCE_ENVIRONMENT);
console.log('[VisaAcceptance] VISA_ACCEPTANCE_API_MOCK:', process.env.VISA_ACCEPTANCE_API_MOCK);

// Determine if we should use SANDBOX (product) instead of local mocks
const sandboxEnabled = (
  (process.env.VISA_ACCEPTANCE_ENVIRONMENT || '').toUpperCase() === 'SANDBOX'
  && !!process.env.VISA_ACCEPTANCE_MERCHANT_ID
  && !!process.env.VISA_ACCEPTANCE_API_KEY_ID
  && !!process.env.VISA_ACCEPTANCE_SECRET_KEY
  && String(process.env.VISA_ACCEPTANCE_API_MOCK || '').toLowerCase() !== 'true'
  && String(process.env.VISA_ACCEPTANCE_API_MOCK || '') !== '1'
);

let visaApi: any = null;
if (sandboxEnabled && typeof VisaAcceptanceAPI === 'function') {
  visaApi = new VisaAcceptanceAPI({
    merchantId: process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    apiKeyId: process.env.VISA_ACCEPTANCE_API_KEY_ID,
    secretKey: process.env.VISA_ACCEPTANCE_SECRET_KEY,
    environment: 'SANDBOX',
  });
  console.log('[VisaAcceptance] SANDBOX mode enabled in web-ui server (using real SDK).');
} else {
  console.log('[VisaAcceptance] Mock mode (local in-memory data) enabled in web-ui server.');
}

export const app = express();
app.use(cors());
app.use(express.json());

// Utility helpers
function twoDecimals(n: any): string {
  const num = typeof n === 'number' ? n : Number(String(n).replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2);
}

function futureDateFromDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.round(days)));
  return d.toISOString().split('T')[0];
}

// Normalization helper to make extraction consistent (email/name/dueDate/currency)
function normalizeExtractedFields(rawInput: string, extractedIn: any) {
  const out = { ...(extractedIn || {}) } as any;
  const isEmail = (s: any) => typeof s === 'string' && /^(?!.{255})[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(s.trim());
  const inputStr = String(rawInput || '');

  // recipient -> email/customerEmail or -> customerName
  if (out.recipient && isEmail(out.recipient)) {
    const rEmail = String(out.recipient).trim();
    out.email = rEmail;
    out.customerEmail = rEmail;
  } else if (out.recipient && !isEmail(out.recipient)) {
    if (!out.customerName && !out.name) {
      out.customerName = String(out.recipient).trim();
      out.name = out.customerName;
    }
  }
  // name -> customerName fallback
  if (out.name && !out.customerName) out.customerName = out.name;

  // email fallback from text
  if (!out.email && !out.customerEmail) {
    const em = (inputStr.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
    if (em) { out.email = em; out.customerEmail = em; }
  }
  // derive friendly name from email
  if ((!out.customerName && !out.name) && (out.email || out.customerEmail)) {
    const em = out.email || out.customerEmail;
    if (typeof em === 'string' && em.includes('@')) {
      const local = em.split('@')[0].replace(/[._\-+].*/, '').replace(/[._\-]/g, ' ');
      const words = local.split(/\s+/).filter(Boolean).map(w => w[0] ? w[0].toUpperCase() + w.slice(1) : w);
      if (words.length) { out.customerName = words.join(' '); out.name = out.customerName; }
    }
  }

  // dueDays -> dueDate if provided as number/string
  if (!out.dueDate && (typeof out.dueDays === 'number' || (typeof out.dueDays === 'string' && /^\d{1,3}$/.test(out.dueDays)))) {
    const dn = Number(out.dueDays); if (!Number.isNaN(dn) && dn > 0) out.dueDate = futureDateFromDays(Math.max(0, Math.round(dn)));
  }
  // infer dueDate from text
  if (!out.dueDate && !out.due_date && !out.due && inputStr) {
    const iso = (inputStr.match(/\b(\d{4}-\d{2}-\d{2})\b/) || [])[1];
    if (iso) out.dueDate = iso; else {
      const inDays = inputStr.match(/(?:\bdue\s+in\b|\bin\b)\s+(\d{1,3})\s*(day|days|week|weeks)?/i);
      if (inDays) {
        let num = Number(inDays[1]);
        const unit = (inDays[2] || '').toLowerCase();
        if (!Number.isNaN(num)) { if (unit && unit.startsWith('week')) num = num * 7; out.dueDate = futureDateFromDays(Math.max(0, Math.round(num))); }
      } else {
        const standalone = inputStr.match(/(?<![$\d\.])\b(\d{1,3})\b(?!\s*(?:%|\.|,|\d))/);
        if (standalone) {
          const n = Number(standalone[1]);
          if (!Number.isNaN(n) && n > 0 && n <= 365) {
            const amt = (inputStr.match(/\$?\s*(\d+(?:\.\d{1,2})?)/) || [])[1];
            const amtVal = amt ? Number(amt) : NaN;
            if (Number.isNaN(amtVal) || Math.abs(amtVal - n) > 0.0001) out.dueDate = futureDateFromDays(n);
          }
        }
      }
    }
  }

  // Currency uppercasing
  if (typeof out.currency === 'string') out.currency = out.currency.trim().toUpperCase();
  return out;
}

// Shared extractor implementation (refactored so /api/extract-fields and /api/assist stay in sync)
async function runExtractFields(input: string, action: string | undefined) {
  const act = action || 'auto';
  const schemas: Record<string, string[]> = {
    'create-invoice': ['amount', 'currency', 'email', 'dueDate', 'customerName', 'memo'],
    'create_invoice': ['amount', 'currency', 'email', 'dueDate', 'customerName', 'memo'],
    'create-pay-link': ['amount', 'currency', 'productDescription'],
    'create_payment_link': ['amount', 'currency', 'productDescription'],
    'send-invoice': ['invoiceId', 'email'],
    'send_invoice': ['invoiceId', 'email'],
    'update-invoice': ['invoiceId', 'amount', 'currency'],
    'update_invoice': ['invoiceId', 'amount', 'currency'],
    'list-invoices': [],
    'list_invoices': [],
    'list-pay-links': [],
    'list_pay_links': [],
    'auto': [],
  };

  const today = new Date().toISOString().split('T')[0];
  let required: string[] = schemas[act] || [];
  let prompt = '';
  let actionUsed: string = act;

  if (act === 'create-invoice' || act === 'create_invoice') {
    prompt = `Extract the required fields from the user input. If a field is missing or ambiguous, return null for that field.\n\nRequired fields (for create-invoice):\n- amount (number, include decimals, e.g. 100.00)\n- currency (3-letter code, e.g. USD)\n- email (recipient email) or customerName (customer name)\n- dueDate (YYYY-MM-DD or relative like 'in 15 days' — prefer YYYY-MM-DD when possible)\nOptional fields:\n- memo (string)\n\nExamples (return strict JSON):\n{ "amount": 450.00, "currency": "USD", "email": "billing@acme.example", "dueDate": "2025-11-12", "memo": "Website redesign" }\n\nUser input: "${input}"\nReturn JSON:`;
  } else if (act === 'create-pay-link' || act === 'create_payment_link') {
    prompt = `Extract the required fields from the user input. If a field is missing or ambiguous, return null for that field.\n\nRequired fields (for create-pay-link):\n- currency (3-letter code, e.g. USD)\n- For PURCHASE links: amount (number, e.g. 25.00) and productDescription (string)\n- For DONATION links: minAmount and/or maxAmount (numbers) and productDescription (optional)\nOptional fields:\n- memo/description (string)\n\nExamples (return strict JSON):\nPURCHASE: { "amount": 25.00, "currency": "USD", "productDescription": "Sticker Pack", "memo": "Sticker Pack" }\nDONATION: { "minAmount": 1.00, "maxAmount": 500.00, "currency": "USD", "productDescription": "Charity Drive", "memo": "Charity Drive" }\n\nUser input: "${input}"\nReturn JSON:`;
  } else if (act === 'send-invoice' || act === 'send_invoice') {
    prompt = `Extract the following fields from the user input. If a field is missing or ambiguous, return null for that field.\nRequired fields (for send-invoice):\n- invoiceId (string)\n- email (recipient email, optional; if omitted, use existing invoice address)\n\nExample: { "invoiceId": "NL123456", "email": "customer@example.com" }\n\nUser input: "${input}"\nReturn JSON:`;
  } else if (act === 'update-invoice' || act === 'update_invoice') {
    prompt = `Extract the following fields for an invoice update. If a field is missing or ambiguous, return null for that field.\nToday is ${today}.\nRequired fields (for update-invoice):\n- invoiceId (string)\nOptional update fields:\n- amount (number, e.g. 100.00)\n- currency (3-letter code, e.g. USD)\n- description (string, optional)\n- dueDate (YYYY-MM-DD, optional)\n\nExample: { "invoiceId": "NL123456", "amount": 500.00, "currency": "EUR", "description": "Updated via NL", "dueDate": "2025-11-07" }\n\nUser input: "${input}"\nReturn JSON:`;
  } else if (act === 'list-invoices' || act === 'list_invoices') {
    const text = String(input || '').toLowerCase();
    const tokens = Array.from(text.matchAll(/\b(draft|created|new|sent|open|unpaid|pending|outstanding|overdue|partial|partially(?:[-\s])?paid|paid|canceled|cancelled|void)\b/g)).map(m => m[1]);
    const toCanonical = (t: string): string | undefined => {
      if (!t) return undefined;
      if (t === 'draft') return 'DRAFT';
      if (t === 'created' || t === 'new') return 'CREATED';
      if (t === 'sent' || t === 'open' || t === 'unpaid' || t === 'pending' || t === 'outstanding' || t === 'overdue') return 'SENT';
      if (t === 'partial' || t.startsWith('partially')) return 'PARTIAL';
      if (t === 'paid') return 'PAID';
      if (t === 'canceled' || t === 'cancelled' || t === 'void') return 'CANCELED';
      return undefined;
    };
    const priority = ['CANCELED','PAID','PARTIAL','SENT','CREATED','DRAFT'] as const;
    let mapped: string | undefined;
    for (const p of priority) { if (tokens.some(tok => toCanonical(tok) === p)) { mapped = p; break; } }
    let minAmount: number | undefined;
    let currency: string | undefined;
    const lower = text;
    const curMatch = lower.match(/\b(USD|EUR|GBP|JPY|CAD|AUD|INR|SGD|CHF|CNY)\b/i);
    if (curMatch) currency = curMatch[1].toUpperCase();
    const dollarMatch = lower.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
    const overMatch = lower.match(/\b(over|greater than|>=|at least)\b\s*(\d+(?:\.\d{1,2})?)/);
    if (dollarMatch) minAmount = Number(dollarMatch[1]);
    else if (overMatch) minAmount = Number(overMatch[2]);
    const extracted: any = {};
    if (mapped) extracted.status = mapped;
    if (typeof minAmount === 'number' && !Number.isNaN(minAmount)) extracted.minAmount = minAmount;
    if (currency) extracted.currency = currency;
    return { extracted, missing: [], action: 'list-invoices' };
  } else if (act === 'list-pay-links' || act === 'list_pay_links') {
    const text = String(input || '').toLowerCase();
    const tokens = Array.from(text.matchAll(/\b(active|inactive|enabled|disabled|deactivated|on|off)\b/g)).map(m => m[1]);
    const toPL = (t: string): 'ACTIVE'|'INACTIVE'|undefined => {
      if (!t) return undefined;
      if (t === 'active' || t === 'enabled' || t === 'on') return 'ACTIVE';
      if (t === 'inactive' || t === 'disabled' || t === 'deactivated' || t === 'off') return 'INACTIVE';
      return undefined;
    };
    const mapped = tokens.map(toPL).filter(Boolean).reduce<'ACTIVE'|'INACTIVE'|undefined>((acc, v) => {
      if (!acc) return v as any;
      if (v === 'INACTIVE') return 'INACTIVE';
      return acc;
    }, undefined);
    return { extracted: mapped ? { status: mapped } : {}, missing: [], action: 'list-pay-links' };
  } else if (act === 'auto') {
    try {
      const allowed = ['create-invoice','list-invoices','send-invoice','create-pay-link','list-pay-links','update-invoice'] as const;
      const hasAIKey = !!process.env.OPENAI_API_KEY;
      if (!hasAIKey) {
        // Heuristic fallback: basic keyword check
        const lower = String(input || '').toLowerCase();
        if (/pay\s?-?\s?link|payment\s?link/.test(lower)) {
          return runExtractFields(input, 'list-pay-links');
        }
        if (/invoice/.test(lower)) {
          if (/create|make|new/.test(lower)) return runExtractFields(input, 'create-invoice');
          return runExtractFields(input, 'list-invoices');
        }
        return { extracted: {}, missing: [], action: 'list-invoices' };
      }
      const { openai } = await import('@ai-sdk/openai');
      const { generateText } = await import('ai');
      const classify = await generateText({
        model: (openai('gpt-4o') as any),
        temperature: 0,
        maxTokens: 200,
        prompt: `You're an intent classifier. Choose the best matching action from this list: ${allowed.join(', ')}.\nThen extract any relevant fields for that action.\nIf action is list-invoices or list-pay-links, include optional "status" if present and MAP it to one of: DRAFT, CREATED, SENT, PARTIAL, PAID, CANCELED.\nUse these mappings: draft→DRAFT; created/new→CREATED; sent/open/unpaid/pending/outstanding/overdue→SENT; partially paid/partial→PARTIAL; paid→PAID; canceled/cancelled/void→CANCELED.\nIf action is update-invoice, include invoiceId, amount, currency, and optionally description and dueDate (YYYY-MM-DD).\nReturn strict JSON with shape: { "action": string, "extracted": object }.\nIf fields are unknown, set them to null.\nUser input: "${input}"\nReturn JSON only:`
      });
      let classifyText = classify.text.trim();
      if (classifyText.startsWith('```')) classifyText = classifyText.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
      let parsed: any;
      try { parsed = JSON.parse(classifyText); } catch (e) {
        return { error: true, message: 'Failed to parse LLM output (auto)', raw: classify.text } as any;
      }
      actionUsed = parsed?.action && typeof parsed.action === 'string' ? parsed.action : 'unknown';
      const extractedAutoRaw = parsed?.extracted && typeof parsed.extracted === 'object' ? parsed.extracted : {};
      const extractedAuto = normalizeExtractedFields(input, extractedAutoRaw);
      required = schemas[actionUsed] || [];
      const missingFields = required.filter(f => !extractedAuto[f]);
      return { extracted: extractedAuto, missing: missingFields, action: actionUsed };
    } catch (e) {
      return { error: true, message: 'Auto classification failed', detail: String((e as any)?.message || e) } as any;
    }
  }

  // For the non-auto extraction with LLMs
  const hasAIKey = !!process.env.OPENAI_API_KEY;
  if (!hasAIKey) {
    return { error: true, message: 'No OpenAI API key configured' } as any;
  }
  const { openai } = await import('@ai-sdk/openai');
  const { generateText } = await import('ai');
  const result = await generateText({ model: (openai('gpt-4o') as any), prompt, maxTokens: 256, temperature: 0 });
  let text = result.text.trim();
  if (text.startsWith('```')) text = text.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
  let extracted: any;
  try { extracted = JSON.parse(text); } catch (e) { return { error: true, message: 'Failed to parse LLM output', detail: String(e), raw: result.text } as any; }
  try { extracted = normalizeExtractedFields(input, extracted); } catch {}
  const missingFields = required.filter(f => !extracted[f]);
  return { extracted, missing: missingFields, action: actionUsed };
}

// Basic health for local dev
app.get('/health', (_req, res) => {
  const localsPort = (app as any).locals?.port;
  res.json({ ok: true, port: localsPort ?? null });
});

// LLM-powered extraction endpoint (kept minimal for type-safety and tests)
app.post('/api/extract-fields', async (req, res) => {
  try {
    const { input, action } = req.body || {};
    if (typeof input !== 'string' || input.trim().length < 3) {
      return res.status(400).json({ error: true, message: 'Provide a user input string' });
    }
    const result = await runExtractFields(input, action);
    if ((result as any)?.error) return res.status(500).json(result);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: true, message: 'Failed to extract fields', detail: String(err) });
  }
});

// Minimal stubs for endpoints referenced in UI (not used by Playwright tests served from dist)
app.get('/api/ai/tools', (_req, res) => {
  res.json({ tools: ['create_invoice', 'list_invoices', 'send_invoice', 'get_invoice', 'create_payment_link', 'list_payment_links'] });
});

// --- Mock data store for local/dev & tests ---
type InvoiceRec = {
  id: string;
  status: string;
  customerInformation?: { name?: string; email?: string };
  orderInformation?: { amountDetails?: { totalAmount?: string; currency?: string } };
  invoiceInformation?: { dueDate?: string; paymentLink?: string; description?: string };
};
type PayLinkRec = {
  id: string;
  amount?: string;
  minAmount?: string;
  maxAmount?: string;
  currency: string;
  memo?: string;
  created: string;
  linkType?: 'PURCHASE' | 'DONATION';
  paymentLink?: string;
};

const mock = {
  invoices: [] as InvoiceRec[],
  paylinks: [] as PayLinkRec[],
};

function genId(prefix: string) { return `${prefix}-${Math.random().toString(36).slice(2, 8)}`; }

// Seed a small sample so list endpoints have content even before creating
(() => {
  if (mock.invoices.length === 0) {
    mock.invoices.push({
      id: 'INV-SEED-1',
      status: 'draft',
      customerInformation: { name: 'Seed Customer', email: 'seed@example.com' },
      orderInformation: { amountDetails: { totalAmount: '42.00', currency: 'USD' } },
      invoiceInformation: { dueDate: futureDateFromDays(30), paymentLink: 'https://example.test/invoice/INV-SEED-1' },
    });
    // Add a SENT/unpaid invoice > $500 to support smoke tests
    mock.invoices.push({
      id: 'INV-SEED-2',
      status: 'sent',
      customerInformation: { name: 'High Value', email: 'hv@example.com' },
      orderInformation: { amountDetails: { totalAmount: '650.00', currency: 'USD' } },
      invoiceInformation: { dueDate: futureDateFromDays(14), paymentLink: 'https://example.test/invoice/INV-SEED-2' },
    });
  }
  if (mock.paylinks.length === 0) {
    mock.paylinks.push({ id: 'PL-SEED-1', amount: '12.34', currency: 'USD', memo: 'Seed Link', created: new Date().toISOString().split('T')[0], linkType: 'PURCHASE', paymentLink: 'https://example.test/pl/PL-SEED-1' });
  }
})();

// --- Mock API endpoints used by the UI ---
// Invoices list
app.get('/api/invoices', async (req, res) => {
  console.log('[API] GET /api/invoices', { sandboxEnabled });
  if (sandboxEnabled && visaApi) {
    try {
      const limit = Number(req.query.limit ?? 5);
      const offset = Number(req.query.offset ?? 0);
      const statusRaw = typeof req.query.status === 'string' ? String(req.query.status).toUpperCase() : undefined;
      const body = await visaApi.run('list_invoices', { limit, offset, status: statusRaw });
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      // Ensure normalized shape { invoices, total }
      if (parsed?.invoices && typeof parsed.total !== 'number') parsed.total = parsed.invoices.length;
      // Optional minAmount filter (server-side post-filtering)
      const minAmount = req.query.minAmount != null ? Number(req.query.minAmount) : undefined;
      if (parsed?.invoices && typeof minAmount === 'number' && !Number.isNaN(minAmount)) {
        parsed.invoices = parsed.invoices.filter((it:any) => {
          const amt = Number(it?.orderInformation?.amountDetails?.totalAmount ?? '0');
          return Number.isFinite(amt) && amt >= minAmount;
        });
      }
      if (parsed?.invoices && typeof parsed.total !== 'number') parsed.total = parsed.invoices.length;
      console.log('[API] GET /api/invoices OK (SANDBOX)', { total: parsed?.total });
      return res.json(parsed);
    } catch (e: any) {
      console.error('[API] GET /api/invoices FAIL (SANDBOX)', e?.response?.body || e);
      return res.status(502).json({ error: true, message: 'Failed to list invoices (SANDBOX)', detail: String(e?.message || e) });
    }
  }
  // Local mock fallback
  const limit = Number(req.query.limit ?? 5);
  const offset = Number(req.query.offset ?? 0);
  const statusRaw = typeof req.query.status === 'string' ? String(req.query.status).toLowerCase() : undefined;
  const minAmount = req.query.minAmount != null ? Number(req.query.minAmount) : undefined;
  let list = mock.invoices.slice();
  if (statusRaw) list = list.filter(i => i.status?.toLowerCase() === statusRaw);
  if (typeof minAmount === 'number' && !Number.isNaN(minAmount)) {
    list = list.filter(i => Number(i?.orderInformation?.amountDetails?.totalAmount ?? '0') >= minAmount);
  }
  const slice = list.slice(offset, offset + limit);
  res.json({ invoices: slice, total: list.length });
});
// Create invoice
app.post('/api/invoices', async (req, res) => {
  const { amount, currency, email, customerName, memo, dueDays } = req.body || {};
  if (!amount || !currency) return res.status(400).json({ error: true, message: 'amount and currency required' });

  if (sandboxEnabled && visaApi) {
    try {
      const dueDate = dueDays ? futureDateFromDays(Number(dueDays)) : undefined;
      const payload = {
        invoice_number: genId('NL').replace(/[^A-Za-z0-9]/g, '').slice(0, 18),
        totalAmount: twoDecimals(amount),
        currency: String(currency).toUpperCase(),
        customerName: customerName || undefined,
        customerEmail: email || undefined,
        invoiceInformation: {
          description: (memo || 'Created via Web UI').toString().slice(0, 50),
          dueDate: dueDate || futureDateFromDays(30),
          sendImmediately: true,
          deliveryMode: 'email',
        },
      };
      const body = await visaApi.run('create_invoice', payload);
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      console.log('[API] POST /api/invoices OK (SANDBOX)', { id: parsed?.id || parsed?.invoiceId });
      return res.json(parsed);
    } catch (e: any) {
      console.error('[API] POST /api/invoices FAIL (SANDBOX)', e?.response?.body || e);
      return res.status(502).json({ error: true, message: 'Failed to create invoice (SANDBOX)', detail: String(e?.message || e), response: e?.response?.body || e?.response?.text });
    }
  }

  // Local mock fallback
  const id = genId('INV');
  const inv: InvoiceRec = {
    id,
    status: 'draft',
    customerInformation: { name: customerName || undefined, email: email || undefined },
    orderInformation: { amountDetails: { totalAmount: twoDecimals(amount), currency: String(currency).toUpperCase() } },
    invoiceInformation: { dueDate: dueDays ? futureDateFromDays(Number(dueDays)) : undefined, paymentLink: `https://example.test/invoice/${id}` },
  };
  mock.invoices.unshift(inv);
  res.json(inv);
});
// Get invoice by id
app.get('/api/invoices/:id', async (req, res) => {
  const id = req.params.id;
  if (sandboxEnabled && visaApi) {
    try {
      const body = await visaApi.run('get_invoice', { id });
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      console.log('[API] GET /api/invoices/:id OK (SANDBOX)', { id });
      return res.json(parsed);
    } catch (e: any) {
      console.error('[API] GET /api/invoices/:id FAIL (SANDBOX)', e?.response?.body || e);
      return res.status(502).json({ error: true, message: 'Failed to get invoice (SANDBOX)', detail: String(e?.message || e) });
    }
  }
  const inv = mock.invoices.find(i => i.id === id);
  if (!inv) return res.status(404).json({ error: true, message: 'Invoice not found' });
  res.json(inv);
});
// Send invoice
app.post('/api/invoices/:id/send', async (req, res) => {
  const id = req.params.id;
  if (sandboxEnabled && visaApi) {
    try {
      const body = await visaApi.run('send_invoice', { invoice_id: id });
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      console.log('[API] POST /api/invoices/:id/send OK (SANDBOX)', { id });
      return res.json(parsed);
    } catch (e: any) {
      console.error('[API] POST /api/invoices/:id/send FAIL (SANDBOX)', e?.response?.body || e);
      return res.status(502).json({ error: true, message: 'Failed to send invoice (SANDBOX)', detail: String(e?.message || e) });
    }
  }
  const inv = mock.invoices.find(i => i.id === id);
  if (!inv) return res.status(404).json({ error: true, message: 'Invoice not found' });
  inv.status = 'sent';
  res.json({ ok: true, id });
});
// Cancel invoice
app.post('/api/invoices/:id/cancel', async (req, res) => {
  const id = req.params.id;
  if (sandboxEnabled && visaApi) {
    try {
      const body = await visaApi.run('cancel_invoice', { invoice_id: id });
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      console.log('[API] POST /api/invoices/:id/cancel OK (SANDBOX)', { id });
      return res.json(parsed);
    } catch (e: any) {
      console.error('[API] POST /api/invoices/:id/cancel FAIL (SANDBOX)', e?.response?.body || e);
      return res.status(502).json({ error: true, message: 'Failed to cancel invoice (SANDBOX)', detail: String(e?.message || e) });
    }
  }
  const inv = mock.invoices.find(i => i.id === id);
  if (!inv) return res.status(404).json({ error: true, message: 'Invoice not found' });
  inv.status = 'canceled';
  res.json({ ok: true, id });
});

// Pay links list
app.get('/api/payment-links', async (req, res) => {
  console.log('[API] GET /api/payment-links', { sandboxEnabled });
  if (sandboxEnabled && visaApi) {
    try {
      // Prevent cache-related 304s confusing the UI
      res.setHeader('Cache-Control', 'no-store');
      const limit = Number(req.query.limit ?? 5);
      const offset = Number(req.query.offset ?? 0);
      const statusRaw = typeof req.query.status === 'string' && req.query.status ? String(req.query.status).toUpperCase() : undefined;
      const status = (statusRaw === 'ACTIVE' || statusRaw === 'INACTIVE') ? statusRaw : undefined;
      const body = await visaApi.run('list_payment_links', { limit, offset, status });
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      const debug = String(req.query.debug || '') === '1';
      if (debug) {
        try {
          const keys = parsed && typeof parsed === 'object' ? Object.keys(parsed) : [];
          console.log('[API][DEBUG] payment-links parsed keys:', keys);
          const sample = Array.isArray(parsed?.paymentLinks) && parsed.paymentLinks[0] ? parsed.paymentLinks[0] : null;
          console.log('[API][DEBUG] payment-links total/sample:', parsed?.total, sample ? Object.keys(sample) : null);
        } catch {}
      }
      if (!parsed?.paymentLinks || parsed.paymentLinks.length === 0) {
        console.warn('[API] GET /api/payment-links SANDBOX returned empty list', { limit, offset, status, rawType: typeof body });
      }
      if (parsed?.paymentLinks && typeof parsed.total !== 'number') parsed.total = parsed.paymentLinks.length;

      // Enrich missing fields (created/paymentLink) via per-item fetch when affordable (limit <= 5)
      if (Array.isArray(parsed?.paymentLinks) && parsed.paymentLinks.length > 0 && limit <= 5) {
        const needsEnrich = parsed.paymentLinks
          .map((pl: any, idx: number) => ({ idx, pl }))
          .filter(({ pl }: { pl: any }) => !pl?.created || !pl?.paymentLink);
        if (needsEnrich.length > 0) {
          const tasks = needsEnrich.map(({ idx, pl }: { idx: number; pl: any }) => (async () => {
            const id = pl?.id || pl?.paymentLinkId || pl?.reference || pl?.referenceId || pl?.transactionId;
            if (!id) return null;
            try {
              const detailBody = await visaApi.run('get_payment_link', { id });
              const detail = typeof detailBody === 'string' ? JSON.parse(detailBody) : detailBody;
              // Merge created
              const created = (
                detail?.creationTime || detail?.createDate || detail?.created || detail?.date || detail?.timeCreated ||
                detail?.createdAt || detail?.creationDate || detail?.dateCreated || detail?.createdDateTime || detail?.creationDateTime ||
                detail?.submitTimeUtc || detail?.clientReferenceInformation?.transactionTimestamp
              );
              if (!parsed.paymentLinks[idx].created && created) {
                try {
                  const d = new Date(String(created));
                  parsed.paymentLinks[idx].created = Number.isNaN(d.getTime()) ? String(created) : d.toISOString().slice(0,10);
                } catch { parsed.paymentLinks[idx].created = String(created); }
              }
              // Merge paymentLink URL
              const link = (
                detail?.purchaseInformation?.paymentLink ||
                detail?.paymentLinkInformation?.url ||
                detail?.paymentLink || detail?.paymentLinkUrl || detail?.shortUrl || detail?.link ||
                detail?.invoiceInformation?.paymentLink || detail?.paymentPageUrl || detail?.hostedPaymentPageUrl || detail?.hostedUrl
              );
              if (!parsed.paymentLinks[idx].paymentLink && link) parsed.paymentLinks[idx].paymentLink = link;
              // Amount/currency fallback
              const ad = detail?.orderInformation?.amountDetails || detail?.amountDetails || {};
              if (!parsed.paymentLinks[idx].amount && ad?.totalAmount) parsed.paymentLinks[idx].amount = ad.totalAmount;
              if (!parsed.paymentLinks[idx].currency && ad?.currency) parsed.paymentLinks[idx].currency = ad.currency;
            } catch (e) {
              console.warn('[API] enrich payment-link failed', { id, err: (e as any)?.message || String(e) });
            }
            return null;
          })());
          await Promise.allSettled(tasks);
        }
      }
      console.log('[API] GET /api/payment-links OK (SANDBOX)', { total: parsed?.total });
      return res.json(parsed);
    } catch (e: any) {
      console.error('[API] GET /api/payment-links FAIL (SANDBOX)', e?.response?.body || e);
      return res.status(502).json({ error: true, message: 'Failed to list payment links (SANDBOX)', detail: String(e?.message || e) });
    }
  }
  const limit = Number(req.query.limit ?? 5);
  const offset = Number(req.query.offset ?? 0);
  const slice = mock.paylinks.slice(offset, offset + limit);
  res.json({ paymentLinks: slice, total: mock.paylinks.length });
});
// Create pay link
app.post('/api/payment-links', async (req, res) => {
  const { amount, currency, memo, linkType, minAmount, maxAmount } = req.body || {};
  if (!currency) return res.status(400).json({ error: true, message: 'currency required' });

  if (sandboxEnabled && visaApi) {
    try {
      const lt = String(linkType || '').toUpperCase() === 'DONATION' ? 'DONATION' : 'PURCHASE';
      const payload: any = {
        linkType: lt,
        purchaseNumber: genId('P').replace(/[^A-Za-z0-9]/g, '').slice(0, 18),
        currency: String(currency).toUpperCase(),
        totalAmount: lt === 'PURCHASE' ? twoDecimals(amount || 0) : undefined,
        lineItems: [
          {
            productName: memo ? String(memo).slice(0, 50) : 'Pay-by-Link',
            quantity: '1',
            unitPrice: lt === 'PURCHASE' ? twoDecimals(amount || 0) : '0.00',
            productDescription: memo ? String(memo).slice(0, 200) : 'Created via Web UI',
          },
        ],
      };
      if (lt === 'DONATION') {
        if (minAmount) (payload as any).minAmount = twoDecimals(minAmount);
        if (maxAmount) (payload as any).maxAmount = twoDecimals(maxAmount);
      }
      const body = await visaApi.run('create_payment_link', payload);
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      console.log('[API] POST /api/payment-links OK (SANDBOX)', { id: parsed?.id || parsed?.paymentLinkId });
      return res.json(parsed);
    } catch (e: any) {
      console.error('[API] POST /api/payment-links FAIL (SANDBOX)', e?.response?.body || e);
      return res.status(502).json({ error: true, message: 'Failed to create payment link (SANDBOX)', detail: String(e?.message || e), response: e?.response?.body || e?.response?.text });
    }
  }

  // Local mock fallback
  const id = genId('PL');
  const created = new Date().toISOString().split('T')[0];
  const rec: PayLinkRec = {
    id,
    currency: String(currency).toUpperCase(),
    memo: memo || undefined,
    created,
    linkType: (String(linkType || '').toUpperCase() === 'DONATION') ? 'DONATION' : 'PURCHASE',
    paymentLink: `https://example.test/pl/${id}`,
  };
  if (rec.linkType === 'PURCHASE') rec.amount = amount ? twoDecimals(amount) : '0.00';
  else {
    if (minAmount) rec.minAmount = twoDecimals(minAmount);
    if (maxAmount) rec.maxAmount = twoDecimals(maxAmount);
  }
  mock.paylinks.unshift(rec);
  res.json(rec);
});
// Get pay link by id
app.get('/api/payment-links/:id', async (req, res) => {
  const id = req.params.id;
  if (sandboxEnabled && visaApi) {
    try {
      const body = await visaApi.run('get_payment_link', { id });
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      console.log('[API] GET /api/payment-links/:id OK (SANDBOX)', { id });
      return res.json(parsed);
    } catch (e: any) {
      console.error('[API] GET /api/payment-links/:id FAIL (SANDBOX)', e?.response?.body || e);
      return res.status(502).json({ error: true, message: 'Failed to get payment link (SANDBOX)', detail: String(e?.message || e) });
    }
  }
  const pl = mock.paylinks.find(p => p.id === id);
  if (!pl) return res.status(404).json({ error: true, message: 'Payment link not found' });
  res.json(pl);
});

// Helper: enrich payment link list items (created/paymentLink fallbacks) — reused by /api/assist
async function enrichPaymentLinksListIfNeeded(parsed: any, limit: number) {
  if (!(sandboxEnabled && visaApi)) return parsed;
  if (!Array.isArray(parsed?.paymentLinks) || parsed.paymentLinks.length === 0) return parsed;
  if (limit > 5) return parsed;
  const needsEnrich = parsed.paymentLinks
    .map((pl: any, idx: number) => ({ idx, pl }))
    .filter(({ pl }: { pl: any }) => !pl?.created || !pl?.paymentLink);
  if (needsEnrich.length === 0) return parsed;
  const tasks = needsEnrich.map(({ idx, pl }: { idx: number; pl: any }) => (async () => {
    const id = pl?.id || pl?.paymentLinkId || pl?.reference || pl?.referenceId || pl?.transactionId;
    if (!id) return null;
    try {
      const detailBody = await visaApi.run('get_payment_link', { id });
      const detail = typeof detailBody === 'string' ? JSON.parse(detailBody) : detailBody;
      const created = (
        detail?.creationTime || detail?.createDate || detail?.created || detail?.date || detail?.timeCreated ||
        detail?.createdAt || detail?.creationDate || detail?.dateCreated || detail?.createdDateTime || detail?.creationDateTime ||
        detail?.submitTimeUtc || detail?.clientReferenceInformation?.transactionTimestamp
      );
      if (!parsed.paymentLinks[idx].created && created) {
        try {
          const d = new Date(String(created));
          parsed.paymentLinks[idx].created = Number.isNaN(d.getTime()) ? String(created) : d.toISOString().slice(0,10);
        } catch { parsed.paymentLinks[idx].created = String(created); }
      }
      const link = (
        detail?.purchaseInformation?.paymentLink ||
        detail?.paymentLinkInformation?.url ||
        detail?.paymentLink || detail?.paymentLinkUrl || detail?.shortUrl || detail?.link ||
        detail?.invoiceInformation?.paymentLink || detail?.paymentPageUrl || detail?.hostedPaymentPageUrl || detail?.hostedUrl
      );
      if (!parsed.paymentLinks[idx].paymentLink && link) parsed.paymentLinks[idx].paymentLink = link;
      const ad = detail?.orderInformation?.amountDetails || detail?.amountDetails || {};
      if (!parsed.paymentLinks[idx].amount && ad?.totalAmount) parsed.paymentLinks[idx].amount = ad.totalAmount;
      if (!parsed.paymentLinks[idx].currency && ad?.currency) parsed.paymentLinks[idx].currency = ad.currency;
    } catch {}
    return null;
  })());
  await Promise.allSettled(tasks);
  return parsed;
}

// Unified Assist endpoint: executes list actions immediately; requires confirmation for mutating actions
app.post('/api/assist', async (req, res) => {
  try {
    const { prompt, action, confirm, overrides } = req.body || {};
    if (typeof prompt !== 'string' || prompt.trim().length < 3) {
      return res.status(400).json({ error: true, message: 'Provide a user input string in "prompt"' });
    }
    const extractedRes: any = await runExtractFields(prompt, action);
    if (extractedRes?.error) return res.status(500).json(extractedRes);
    const actionUsed: string = extractedRes.action || action || 'unknown';
    const extracted = { ...(extractedRes.extracted || {}) };
    // Apply client-provided overrides (from confirmation edits)
    const fields = { ...extracted, ...(overrides && typeof overrides === 'object' ? overrides : {}) };

    // Helper: immediate list results
    if (actionUsed === 'list-invoices' || actionUsed === 'list_invoices') {
      const limit = 5, offset = 0;
      if (sandboxEnabled && visaApi) {
        try {
          const statusRaw = fields.status ? String(fields.status).toUpperCase() : undefined;
          const body = await visaApi.run('list_invoices', { limit, offset, status: statusRaw });
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          const minAmount = (fields.minAmount != null) ? Number(fields.minAmount) : undefined;
          if (parsed?.invoices && typeof minAmount === 'number' && !Number.isNaN(minAmount)) {
            parsed.invoices = parsed.invoices.filter((it:any) => {
              const amt = Number(it?.orderInformation?.amountDetails?.totalAmount ?? '0');
              return Number.isFinite(amt) && amt >= minAmount;
            });
          }
          if (parsed?.invoices && typeof parsed.total !== 'number') parsed.total = parsed.invoices.length;
          return res.json({ type: 'result', action: actionUsed, result: parsed });
        } catch (e:any) {
          return res.status(502).json({ error: true, message: 'Failed to list invoices (SANDBOX)', detail: String(e?.message || e) });
        }
      }
      // mock
      let list = mock.invoices.slice();
      const statusRaw = fields.status ? String(fields.status).toLowerCase() : undefined;
      if (statusRaw) list = list.filter(i => i.status?.toLowerCase() === statusRaw);
      const minAmount = (fields.minAmount != null) ? Number(fields.minAmount) : undefined;
      if (typeof minAmount === 'number' && !Number.isNaN(minAmount)) {
        list = list.filter(i => Number(i?.orderInformation?.amountDetails?.totalAmount ?? '0') >= minAmount);
      }
      const slice = list.slice(0, limit);
      return res.json({ type: 'result', action: actionUsed, result: { invoices: slice, total: list.length } });
    }
    if (actionUsed === 'list-pay-links' || actionUsed === 'list_pay_links') {
      const limit = 5, offset = 0;
      if (sandboxEnabled && visaApi) {
        try {
          const raw = fields.status ? String(fields.status).toUpperCase() : '';
          const status = raw === 'ACTIVE' || raw === 'INACTIVE' ? raw : undefined;
          const body = await visaApi.run('list_payment_links', { limit, offset, status });
          let parsed = typeof body === 'string' ? JSON.parse(body) : body;
          if (parsed?.paymentLinks && typeof parsed.total !== 'number') parsed.total = parsed.paymentLinks.length;
          parsed = await enrichPaymentLinksListIfNeeded(parsed, limit);
          return res.json({ type: 'result', action: actionUsed, result: parsed });
        } catch (e:any) {
          return res.status(502).json({ error: true, message: 'Failed to list payment links (SANDBOX)', detail: String(e?.message || e) });
        }
      }
      // mock
      const slice = mock.paylinks.slice(0, limit);
      return res.json({ type: 'result', action: actionUsed, result: { paymentLinks: slice, total: mock.paylinks.length } });
    }

    // Mutating actions require confirmation unless explicitly confirmed
    const needsConfirm = (act: string) => (
      act === 'create-invoice' || act === 'create_invoice' ||
      act === 'create-pay-link' || act === 'create_payment_link' ||
      act === 'send-invoice' || act === 'send_invoice' ||
      act === 'update-invoice' || act === 'update_invoice'
    );
    if (needsConfirm(actionUsed) && !confirm) {
      return res.json({ type: 'confirmation', action: actionUsed, fields, missing: extractedRes.missing || [] });
    }

    // Execute mutating actions when confirmed
    if (actionUsed === 'create-invoice' || actionUsed === 'create_invoice') {
      const dueDays = fields.dueDays ? Number(fields.dueDays) : (fields.dueDate ? undefined : 30);
      if (sandboxEnabled && visaApi) {
        try {
          const payload = {
            invoice_number: genId('NL').replace(/[^A-Za-z0-9]/g, '').slice(0, 18),
            totalAmount: twoDecimals(fields.amount),
            currency: String(fields.currency || 'USD').toUpperCase(),
            customerName: fields.customerName || undefined,
            customerEmail: fields.email || undefined,
            invoiceInformation: {
              description: (fields.memo || 'Created via Web UI').toString().slice(0, 50),
              dueDate: fields.dueDate || (dueDays ? futureDateFromDays(Number(dueDays)) : futureDateFromDays(30)),
              sendImmediately: true,
              deliveryMode: 'email',
            },
          };
          const body = await visaApi.run('create_invoice', payload);
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          return res.json({ type: 'result', action: actionUsed, result: parsed });
        } catch (e:any) {
          return res.status(502).json({ error: true, message: 'Failed to create invoice (SANDBOX)', detail: String(e?.message || e) });
        }
      }
      // mock
      const id = genId('INV');
      const inv: InvoiceRec = {
        id,
        status: 'draft',
        customerInformation: { name: fields.customerName || undefined, email: fields.email || undefined },
        orderInformation: { amountDetails: { totalAmount: twoDecimals(fields.amount), currency: String(fields.currency || 'USD').toUpperCase() } },
        invoiceInformation: { dueDate: fields.dueDate || (dueDays ? futureDateFromDays(Number(dueDays)) : undefined), paymentLink: `https://example.test/invoice/${id}` },
      };
      mock.invoices.unshift(inv);
      return res.json({ type: 'result', action: actionUsed, result: inv });
    }
    if (actionUsed === 'create-pay-link' || actionUsed === 'create_payment_link') {
      const lt = String(fields.linkType || '').toUpperCase() === 'DONATION' ? 'DONATION' : 'PURCHASE';
      if (sandboxEnabled && visaApi) {
        try {
          const payload: any = {
            linkType: lt,
            purchaseNumber: genId('P').replace(/[^A-Za-z0-9]/g, '').slice(0, 18),
            currency: String(fields.currency || 'USD').toUpperCase(),
            totalAmount: lt === 'PURCHASE' ? twoDecimals(fields.amount || 0) : undefined,
            lineItems: [
              {
                productName: fields.memo ? String(fields.memo).slice(0, 50) : 'Pay-by-Link',
                quantity: '1',
                unitPrice: lt === 'PURCHASE' ? twoDecimals(fields.amount || 0) : '0.00',
                productDescription: fields.memo ? String(fields.memo).slice(0, 200) : 'Created via Web UI',
              },
            ],
          };
          if (lt === 'DONATION') {
            if (fields.minAmount) (payload as any).minAmount = twoDecimals(fields.minAmount);
            if (fields.maxAmount) (payload as any).maxAmount = twoDecimals(fields.maxAmount);
          }
          const body = await visaApi.run('create_payment_link', payload);
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          return res.json({ type: 'result', action: actionUsed, result: parsed });
        } catch (e:any) {
          return res.status(502).json({ error: true, message: 'Failed to create payment link (SANDBOX)', detail: String(e?.message || e) });
        }
      }
      const id = genId('PL');
      const created = new Date().toISOString().split('T')[0];
      const rec: PayLinkRec = {
        id,
        currency: String(fields.currency || 'USD').toUpperCase(),
        memo: fields.memo || undefined,
        created,
        linkType: lt as any,
        paymentLink: `https://example.test/pl/${id}`,
      };
      if (lt === 'PURCHASE') (rec as any).amount = twoDecimals(fields.amount || 0);
      else {
        if (fields.minAmount) (rec as any).minAmount = twoDecimals(fields.minAmount);
        if (fields.maxAmount) (rec as any).maxAmount = twoDecimals(fields.maxAmount);
      }
      mock.paylinks.unshift(rec);
      return res.json({ type: 'result', action: actionUsed, result: rec });
    }
    if (actionUsed === 'send-invoice' || actionUsed === 'send_invoice') {
      const id = fields.invoiceId || fields.id;
      if (!id) return res.status(400).json({ error: true, message: 'invoiceId required' });
      if (sandboxEnabled && visaApi) {
        try {
          const body = await visaApi.run('send_invoice', { invoice_id: id });
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          return res.json({ type: 'result', action: actionUsed, result: parsed });
        } catch (e:any) {
          return res.status(502).json({ error: true, message: 'Failed to send invoice (SANDBOX)', detail: String(e?.message || e) });
        }
      }
      const inv = mock.invoices.find(i => i.id === id);
      if (!inv) return res.status(404).json({ error: true, message: 'Invoice not found' });
      inv.status = 'sent';
      return res.json({ type: 'result', action: actionUsed, result: { ok: true, id } });
    }

    if (actionUsed === 'update-invoice' || actionUsed === 'update_invoice') {
      const id = fields.invoiceId || fields.id;
      if (!id) return res.status(400).json({ error: true, message: 'invoiceId required for update' });
      // For SANDBOX via toolkit, the update tool expects nested objects
      const amount = fields.amount;
      const currency = fields.currency ? String(fields.currency).toUpperCase() : undefined;
      if (amount == null || currency == null || String(currency).trim() === '') {
        return res.status(400).json({ error: true, message: 'amount and currency required for update' });
      }
      const customerInformation: any = {
        email: fields.email || fields.customerEmail || undefined,
        name: fields.customerName || fields.name || undefined,
      };
      const invoiceInformation: any = {
        description: (fields.memo || fields.description) ? String(fields.memo || fields.description) : undefined,
        dueDate: fields.dueDate || undefined,
      };
      const orderInformation: any = {
        amountDetails: {
          totalAmount: twoDecimals(amount),
          currency: currency,
        },
      };
      if (sandboxEnabled && visaApi) {
        try {
          const payload = { id, customerInformation, invoiceInformation, orderInformation };
          const body = await visaApi.run('update_invoice', payload);
          const parsed = typeof body === 'string' ? JSON.parse(body) : body;
          return res.json({ type: 'result', action: actionUsed, result: parsed });
        } catch (e:any) {
          return res.status(502).json({ error: true, message: 'Failed to update invoice (SANDBOX)', detail: String(e?.message || e) });
        }
      }
      // mock fallback: update in-memory record
      const inv = mock.invoices.find(i => i.id === id);
      if (!inv) return res.status(404).json({ error: true, message: 'Invoice not found' });
      inv.customerInformation = inv.customerInformation || {};
      if (customerInformation.email) inv.customerInformation.email = customerInformation.email;
      if (customerInformation.name) inv.customerInformation.name = customerInformation.name;
      inv.invoiceInformation = inv.invoiceInformation ?? ({} as any);
      const ii = inv.invoiceInformation! as any;
      if (invoiceInformation.description) ii.description = invoiceInformation.description;
      if (invoiceInformation.dueDate) ii.dueDate = invoiceInformation.dueDate;
      inv.orderInformation = inv.orderInformation ?? ({} as any);
      const oi = inv.orderInformation! as any;
      oi.amountDetails = oi.amountDetails ?? ({} as any);
      const od = oi.amountDetails as any;
      od.totalAmount = twoDecimals(amount);
      od.currency = currency;
      return res.json({ type: 'result', action: actionUsed, result: inv });
    }

    return res.status(400).json({ error: true, message: `Unsupported action: ${actionUsed}` });
  } catch (err) {
    return res.status(500).json({ error: true, message: 'Assist failed', detail: String(err) });
  }
});

// Global error handler to surface unexpected exceptions
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[API] Unhandled error', err);
  res.status(500).json({ error: true, message: 'Internal Server Error', detail: String(err?.message || err) });
});

// --- Static assets for Playwright/dev (serve dist) ---
const distDir = path.resolve(process.cwd(), 'dist');
app.use(express.static(distDir));
// Fallback to index.html for client routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distDir, 'index.html'));
});

// End of app.ts
