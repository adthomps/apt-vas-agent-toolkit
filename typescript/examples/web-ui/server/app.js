"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const node_path_1 = __importDefault(require("node:path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Load env (base then local overrides)
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: node_path_1.default.resolve(process.cwd(), '.env.local') });
console.log('[VisaAcceptance] server/app.ts starting');
console.log('[VisaAcceptance] process.cwd():', process.cwd());
console.log('[VisaAcceptance] VISA_ACCEPTANCE_MERCHANT_ID:', process.env.VISA_ACCEPTANCE_MERCHANT_ID);
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
// Utility helpers
function twoDecimals(n) {
    const num = typeof n === 'number' ? n : Number(String(n).replace(/[^0-9.\-]/g, ''));
    if (!Number.isFinite(num))
        return '0.00';
    return num.toFixed(2);
}
function futureDateFromDays(days) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + Math.max(0, Math.round(days)));
    return d.toISOString().split('T')[0];
}
// Normalization helper to make extraction consistent (email/name/dueDate/currency)
function normalizeExtractedFields(rawInput, extractedIn) {
    const out = { ...(extractedIn || {}) };
    const isEmail = (s) => typeof s === 'string' && /^(?!.{255})[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(s.trim());
    const inputStr = String(rawInput || '');
    // recipient -> email/customerEmail or -> customerName
    if (out.recipient && isEmail(out.recipient)) {
        const rEmail = String(out.recipient).trim();
        out.email = rEmail;
        out.customerEmail = rEmail;
    }
    else if (out.recipient && !isEmail(out.recipient)) {
        if (!out.customerName && !out.name) {
            out.customerName = String(out.recipient).trim();
            out.name = out.customerName;
        }
    }
    // name -> customerName fallback
    if (out.name && !out.customerName)
        out.customerName = out.name;
    // email fallback from text
    if (!out.email && !out.customerEmail) {
        const em = (inputStr.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0];
        if (em) {
            out.email = em;
            out.customerEmail = em;
        }
    }
    // derive friendly name from email
    if ((!out.customerName && !out.name) && (out.email || out.customerEmail)) {
        const em = out.email || out.customerEmail;
        if (typeof em === 'string' && em.includes('@')) {
            const local = em.split('@')[0].replace(/[._\-+].*/, '').replace(/[._\-]/g, ' ');
            const words = local.split(/\s+/).filter(Boolean).map(w => w[0] ? w[0].toUpperCase() + w.slice(1) : w);
            if (words.length) {
                out.customerName = words.join(' ');
                out.name = out.customerName;
            }
        }
    }
    // dueDays -> dueDate if provided as number/string
    if (!out.dueDate && (typeof out.dueDays === 'number' || (typeof out.dueDays === 'string' && /^\d{1,3}$/.test(out.dueDays)))) {
        const dn = Number(out.dueDays);
        if (!Number.isNaN(dn) && dn > 0)
            out.dueDate = futureDateFromDays(Math.max(0, Math.round(dn)));
    }
    // infer dueDate from text
    if (!out.dueDate && !out.due_date && !out.due && inputStr) {
        const iso = (inputStr.match(/\b(\d{4}-\d{2}-\d{2})\b/) || [])[1];
        if (iso)
            out.dueDate = iso;
        else {
            const inDays = inputStr.match(/(?:\bdue\s+in\b|\bin\b)\s+(\d{1,3})\s*(day|days|week|weeks)?/i);
            if (inDays) {
                let num = Number(inDays[1]);
                const unit = (inDays[2] || '').toLowerCase();
                if (!Number.isNaN(num)) {
                    if (unit && unit.startsWith('week'))
                        num = num * 7;
                    out.dueDate = futureDateFromDays(Math.max(0, Math.round(num)));
                }
            }
            else {
                const standalone = inputStr.match(/(?<![$\d\.])\b(\d{1,3})\b(?!\s*(?:%|\.|,|\d))/);
                if (standalone) {
                    const n = Number(standalone[1]);
                    if (!Number.isNaN(n) && n > 0 && n <= 365) {
                        const amt = (inputStr.match(/\$?\s*(\d+(?:\.\d{1,2})?)/) || [])[1];
                        const amtVal = amt ? Number(amt) : NaN;
                        if (Number.isNaN(amtVal) || Math.abs(amtVal - n) > 0.0001)
                            out.dueDate = futureDateFromDays(n);
                    }
                }
            }
        }
    }
    // Currency uppercasing
    if (typeof out.currency === 'string')
        out.currency = out.currency.trim().toUpperCase();
    return out;
}
// Basic health for local dev
exports.app.get('/health', (_req, res) => {
    const localsPort = exports.app.locals?.port;
    res.json({ ok: true, port: localsPort ?? null });
});
// LLM-powered extraction endpoint (kept minimal for type-safety and tests)
exports.app.post('/api/extract-fields', async (req, res) => {
    try {
        const { input, action } = req.body || {};
        if (typeof input !== 'string' || input.trim().length < 3) {
            return res.status(400).json({ error: true, message: 'Provide a user input string' });
        }
        const schemas = {
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
        let required = schemas[action] || [];
        let prompt = '';
        let actionUsed = action;
        if (action === 'create-invoice' || action === 'create_invoice') {
            prompt = `Extract the required fields from the user input. If a field is missing or ambiguous, return null for that field.\n
Required fields (for create-invoice):\n- amount (number, include decimals, e.g. 100.00)\n- currency (3-letter code, e.g. USD)\n- email (recipient email) or customerName (customer name)\n- dueDate (YYYY-MM-DD or relative like 'in 15 days' — prefer YYYY-MM-DD when possible)\nOptional fields:\n- memo (string)\n\nExamples (return strict JSON):\n{ "amount": 450.00, "currency": "USD", "email": "billing@acme.example", "dueDate": "2025-11-12", "memo": "Website redesign" }\n\nUser input: "${input}"\nReturn JSON:`;
        }
        else if (action === 'create-pay-link' || action === 'create_payment_link') {
            prompt = `Extract the required fields from the user input. If a field is missing or ambiguous, return null for that field.\n
Required fields (for create-pay-link):\n- currency (3-letter code, e.g. USD)\n- For PURCHASE links: amount (number, e.g. 25.00) and productDescription (string)\n- For DONATION links: minAmount and/or maxAmount (numbers) and productDescription (optional)\nOptional fields:\n- memo/description (string)\n\nExamples (return strict JSON):\nPURCHASE: { "amount": 25.00, "currency": "USD", "productDescription": "Sticker Pack", "memo": "Sticker Pack" }\nDONATION: { "minAmount": 1.00, "maxAmount": 500.00, "currency": "USD", "productDescription": "Charity Drive", "memo": "Charity Drive" }\n\nUser input: "${input}"\nReturn JSON:`;
        }
        else if (action === 'send-invoice' || action === 'send_invoice') {
            prompt = `Extract the following fields from the user input. If a field is missing or ambiguous, return null for that field.\nRequired fields (for send-invoice):\n- invoiceId (string)\n- email (recipient email, optional; if omitted, use existing invoice address)\n\nExample: { "invoiceId": "NL123456", "email": "customer@example.com" }\n\nUser input: "${input}"\nReturn JSON:`;
        }
        else if (action === 'update-invoice' || action === 'update_invoice') {
            prompt = `Extract the following fields for an invoice update. If a field is missing or ambiguous, return null for that field.\nToday is ${today}.\nRequired fields (for update-invoice):\n- invoiceId (string)\nOptional update fields:\n- amount (number, e.g. 100.00)\n- currency (3-letter code, e.g. USD)\n- description (string, optional)\n- dueDate (YYYY-MM-DD, optional)\n\nExample: { "invoiceId": "NL123456", "amount": 500.00, "currency": "EUR", "description": "Updated via NL", "dueDate": "2025-11-07" }\n\nUser input: "${input}"\nReturn JSON:`;
        }
        else if (action === 'list-invoices' || action === 'list_invoices' || action === 'list-pay-links' || action === 'list_pay_links') {
            const statusMatch = (input.toLowerCase().match(/\b(pending|paid|unpaid|open|sent|draft|canceled|cancelled|expired|overdue)\b/) || [])[1];
            return res.json({ extracted: statusMatch ? { status: statusMatch } : {}, missing: [], action: action });
        }
        else if (action === 'auto') {
            const allowed = ['create-invoice', 'list-invoices', 'send-invoice', 'create-pay-link', 'list-pay-links', 'update-invoice'];
            const { openai } = await import('@ai-sdk/openai');
            const { generateText } = await import('ai');
            const classify = await generateText({
                model: openai('gpt-4o'),
                temperature: 0,
                maxTokens: 200,
                prompt: `You're an intent classifier. Choose the best matching action from this list: ${allowed.join(', ')}.\nThen extract any relevant fields for that action.\nIf action is list-invoices or list-pay-links, include optional "status" if present (e.g., "pending", "paid").\nIf action is update-invoice, include invoiceId, amount, currency, and optionally description and dueDate (YYYY-MM-DD).\nReturn strict JSON with shape: { "action": string, "extracted": object }.\nIf fields are unknown, set them to null.\nUser input: "${input}"\nReturn JSON only:`
            });
            let classifyText = classify.text.trim();
            if (classifyText.startsWith('```'))
                classifyText = classifyText.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
            let parsed;
            try {
                parsed = JSON.parse(classifyText);
            }
            catch (e) {
                return res.status(500).json({ error: true, message: 'Failed to parse LLM output (auto)', detail: String(e), raw: classify.text });
            }
            actionUsed = parsed?.action && typeof parsed.action === 'string' ? parsed.action : 'unknown';
            const extractedAutoRaw = parsed?.extracted && typeof parsed.extracted === 'object' ? parsed.extracted : {};
            const extractedAuto = normalizeExtractedFields(input, extractedAutoRaw);
            required = schemas[actionUsed] || [];
            const missingFields = required.filter(f => !extractedAuto[f]);
            return res.json({ extracted: extractedAuto, missing: missingFields, action: actionUsed });
        }
        else {
            return res.json({ extracted: {}, missing: [], action: 'unknown' });
        }
        const hasAIKey = !!process.env.OPENAI_API_KEY;
        if (!hasAIKey)
            return res.status(500).json({ error: true, message: 'No OpenAI API key configured' });
        const { openai } = await import('@ai-sdk/openai');
        const { generateText } = await import('ai');
        const result = await generateText({ model: openai('gpt-4o'), prompt, maxTokens: 256, temperature: 0 });
        let text = result.text.trim();
        if (text.startsWith('```'))
            text = text.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
        let extracted;
        try {
            extracted = JSON.parse(text);
        }
        catch (e) {
            return res.status(500).json({ error: true, message: 'Failed to parse LLM output', detail: String(e), raw: result.text });
        }
        try {
            extracted = normalizeExtractedFields(input, extracted);
        }
        catch { }
        const missingFields = required.filter(f => !extracted[f]);
        return res.json({ extracted, missing: missingFields, action: actionUsed });
    }
    catch (err) {
        return res.status(500).json({ error: true, message: 'Failed to extract fields', detail: String(err) });
    }
});
// Minimal stubs for endpoints referenced in UI (not used by Playwright tests served from dist)
exports.app.get('/api/ai/tools', (_req, res) => {
    res.json({ tools: ['create_invoice', 'list_invoices', 'send_invoice', 'get_invoice', 'create_payment_link', 'list_payment_links'] });
});
// End of app.ts
