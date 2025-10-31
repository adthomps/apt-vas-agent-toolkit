// Interactive NL → Invoice or Payment Link creator
// Guides the user to fill missing/invalid fields, then executes the toolkit tool.
require('dotenv').config();

import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';
import readline from 'readline';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { generateObject } from 'ai';
import * as fs from 'fs';
import * as path from 'path';

function rlQuestion(rl: readline.Interface, q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, resolve));
}

function isEmail(s: string) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(s.trim());
}

function isCurrencyCode(s: string) { return /^[A-Za-z]{3}$/.test((s||'').trim()); }
function isPosAmount(s: string) { const n = parseFloat(s); return isFinite(n) && n > 0; }
function pad(n: number) { return n.toString().padStart(2, '0'); }
function toISODate(d: Date) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`; }
function addDays(base: Date, days: number) { const d = new Date(base); d.setDate(d.getDate()+days); return d; }
function nextWeekday(base: Date, dow: number) {
  const d = new Date(base);
  const delta = ((dow - d.getDay()) + 7) % 7 || 7;
  return addDays(d, delta);
}

function humanList(items: string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return '';
  if (xs.length === 1) return xs[0];
  return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
}

async function askYesNo(rl: readline.Interface, question: string, defYes = true): Promise<boolean> {
  const def = defYes ? 'Y/n' : 'y/N';
  const ans = (await rlQuestion(rl, `${question} [${def}]: `)).trim().toLowerCase();
  if (!ans) return defYes;
  return ans.startsWith('y');
}

function friendlyFieldName(key: string) {
  const map: Record<string,string> = {
    amount: 'amount (e.g., 100.00)',
    currency: 'currency (3 letters, e.g., USD/EUR)',
    email: 'customer email',
    due: 'due date (YYYY-MM-DD or phrases like “in 10 days”)',
    desc: 'short description (<= 50 chars)',
    name: 'customer name',
    title: 'item title',
  };
  return map[key] || key;
}

function summarizeInvoice(params: any): string {
  const parts = [
    `amount ${params.totalAmount} ${params.currency}`,
    params.customerEmail ? `to ${params.customerEmail}` : undefined,
    params.customerName ? `for ${params.customerName}` : undefined,
    `due on ${params.invoiceInformation?.dueDate}`,
    params.invoiceInformation?.description ? `("${params.invoiceInformation.description}")` : undefined,
  ].filter(Boolean);
  return parts.join(' ');
}

function summarizePL(params: any): string {
  const amt = params.totalAmount ? `${params.totalAmount} ${params.currency}` : `${params.currency} (amount at checkout)`;
  const item = params.lineItems?.[0]?.productName || 'Item';
  return `${item} for ${amt}`;
}

function formatToolError(res: any): string {
  try {
    if (!res) return 'Unknown error';
    if (typeof res === 'string') return res;
    const status = res.status ? `HTTP ${res.status}` : '';
    let details = '';
    const text = res.responseText;
    const body = res.responseBody;
    if (text && typeof text === 'string') {
      try { const o = JSON.parse(text); details = o?.message || o?.reason || text; } catch { details = text; }
    } else if (body) {
      if (typeof body === 'string') details = body; else if (body.message) details = body.message; else details = JSON.stringify(body);
    }
    const msg = res.message || '';
    const base = [msg || 'Request failed', status, details].filter(Boolean).join(' - ');
    const hint = res.suggestion ? ` Try: ${res.suggestion}` : '';
    return base + hint;
  } catch {
    return 'Request failed';
  }
}

function parseAmount(text: string): string | undefined {
  const m = text.match(/\$(\d+(?:\.\d{1,2})?)/i) || text.match(/\b(\d+(?:\.\d{1,2})?)\b/);
  return m ? Number(m[1]).toFixed(2) : undefined;
}

function parseCurrency(text: string): string | undefined {
  const m = text.match(/\b(USD|EUR|GBP|AUD|CAD|JPY|INR)\b/i);
  return m ? m[1].toUpperCase() : (text.includes('$') ? 'USD' : undefined);
}

function parseEmail(text: string): string | undefined {
  const m = text.match(/\b(?:email|to)\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);
  return m ? m[1] : undefined;
}

function parseDue(text: string): string | undefined {
  const on = text.match(/due\s+on\s+(\d{4}-\d{2}-\d{2})/i);
  if (on) return on[1];
  const inRel = text.match(/due\s+in\s+(\d+)\s*(day|days|week|weeks)/i);
  if (inRel) {
    const n = parseInt(inRel[1], 10);
    const unit = inRel[2].toLowerCase();
    const days = unit.startsWith('week') ? 7*n : n;
    return toISODate(addDays(new Date(), days));
  }
  const wd = text.match(/due\s+next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (wd) {
    const map: Record<string, number> = {sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
    return toISODate(nextWeekday(new Date(), map[wd[1].toLowerCase()]));
  }
  // end of month
  if (/due\s+(at\s+the\s+)?end\s+of\s+month/i.test(text)) {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)); // last day of current month
    return toISODate(end);
  }
  // next business day (Mon-Fri)
  if (/due\s+next\s+business\s+day/i.test(text)) {
    const d = new Date();
    let add = 1;
    const dow = d.getDay();
    if (dow === 5) add = 3; // Friday -> Monday
    else if (dow === 6) add = 2; // Saturday -> Monday
    const next = addDays(d, add);
    return toISODate(next);
  }
  return undefined;
}

function rand(n=6) { return Math.floor(Math.random()*10**n).toString().padStart(n,'0'); }
function invoiceNumber() { return ('NL'+rand(6)).slice(0,18); }
function purchaseNumber() { return ('PL'+rand(8)).slice(0,18); }

async function interactiveInvoice(rl: readline.Interface, text: string, toolkit: any) {
  const tools = toolkit.getTools();
  const createInv = (tools as any)['create_invoice'];
  if (!createInv) throw new Error('create_invoice tool not available');

  let totalAmount = parseAmount(text) || '';
  let currency = parseCurrency(text) || '';
  let customerEmail = parseEmail(text) || '';
  let dueDate = parseDue(text) || '';
  let customerName = '';
  let description = '';

  // AI-assisted extraction (optional)
  if (process.env.OPENAI_API_KEY) {
    try {
      const InvoiceExtract = z.object({
        amount: z.string().optional(),
        currency: z.string().optional(),
        customerEmail: z.string().optional(),
        customerName: z.string().optional(),
        dueDate: z.string().optional(),
        description: z.string().optional(),
      });
      const system = `You extract invoice fields from user requests. Return only fields you are confident in.`;
      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: InvoiceExtract,
        system,
        prompt: `Text: ${text}\nExtract any of: amount (like 100.00), currency (3 letters), customerEmail, customerName, dueDate (YYYY-MM-DD or compute from phrases like 'in 10 days' or 'next Friday' using today's date), description (<=50 chars). Today is ${toISODate(new Date())}.`,
      });
      if (object?.amount && isPosAmount(object.amount)) totalAmount = Number(parseFloat(object.amount)).toFixed(2);
      if (object?.currency && isCurrencyCode(object.currency)) currency = object.currency.toUpperCase();
      if (object?.customerEmail && isEmail(object.customerEmail)) customerEmail = object.customerEmail;
      if (object?.customerName) customerName = object.customerName;
      if (object?.description) description = object.description.slice(0,50);
      if (object?.dueDate) {
        // allow natural phrase via parseDue by faking a phrase
        const d = parseDue(`due on ${object.dueDate}`) || parseDue(`due in ${object.dueDate}`) || object.dueDate;
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dueDate = d;
      }
    } catch {}
  }

  console.log('\nInteractive Invoice Creator');
  // Friendly notice of missing info
  const missingInitial: string[] = [];
  if (!isPosAmount(totalAmount)) missingInitial.push('amount');
  if (!isCurrencyCode(currency)) missingInitial.push('currency');
  if (!dueDate) missingInitial.push('due');
  if (missingInitial.length) {
    console.log(`I can create this invoice, I just need ${humanList(missingInitial.map(friendlyFieldName))}.`);
  }

  while (!isPosAmount(totalAmount)) {
    const ans = await rlQuestion(rl, `What amount should I use? (e.g., 100.00): `);
    totalAmount = ans.trim();
    if (!isPosAmount(totalAmount)) console.log('A positive number like 100.00 works best.');
  }
  while (!isCurrencyCode(currency)) {
    const ans = await rlQuestion(rl, `Which currency? (3 letters, e.g., USD/EUR): `);
    currency = (ans.trim() || '').toUpperCase();
    if (!isCurrencyCode(currency)) console.log('Please enter a 3-letter currency code like USD or EUR.');
  }
  if (!customerEmail) {
    const ans = await rlQuestion(rl, `Customer email (optional, press Enter to skip): `);
    customerEmail = ans.trim();
    if (customerEmail && !isEmail(customerEmail)) {
      console.log('That email looks off; I will ignore it unless you correct it later.');
      customerEmail = '';
    }
  }
  if (!dueDate) {
    const ans = await rlQuestion(rl, `When should it be due? (YYYY-MM-DD or 'in 15 days' or 'next Friday', default 30 days): `);
    const t = ans.trim();
    if (!t) dueDate = toISODate(addDays(new Date(), 30));
    else {
      // reuse parser by faking a phrase
      dueDate = parseDue('due on '+t) || parseDue('due in '+t) || t;
    }
  }
  if (!/\d{4}-\d{2}-\d{2}/.test(dueDate)) {
    dueDate = toISODate(addDays(new Date(), 30));
  }
  if (!description) {
    const ans = await rlQuestion(rl, `Add a short description? (<=50 chars, default 'Invoice for customer'): `);
    description = (ans.trim() || 'Invoice for customer').slice(0,50);
  }
  if (!customerName && customerEmail) {
    const ans = await rlQuestion(rl, `Customer name (optional, press Enter to skip): `);
    customerName = ans.trim();
  }

  const params: any = {
    invoice_number: invoiceNumber(),
    totalAmount,
    currency,
    customerName: customerName || undefined,
    customerEmail: customerEmail || undefined,
    invoiceInformation: {
      description,
      dueDate,
      sendImmediately: true,
      deliveryMode: 'email',
    }
  };

  console.log('\nHere is what I will create:');
  console.log('-', summarizeInvoice(params));
  const proceed = await askYesNo(rl, 'Proceed to create the invoice?');
  if (!proceed) {
    while (true) {
      const field = (await rlQuestion(rl, `Which field do you want to change? (amount/currency/email/due/desc/name) or press Enter to continue: `)).trim().toLowerCase();
      if (!field) break;
      if (field.startsWith('amount')) {
        const v = await rlQuestion(rl, 'Amount: '); if (isPosAmount(v)) params.totalAmount = v.trim(); else console.log('Please enter a positive number e.g., 100.00');
      } else if (field.startsWith('currency')) {
        const v = await rlQuestion(rl, 'Currency (USD/EUR/...): '); if (isCurrencyCode(v)) params.currency = v.trim().toUpperCase(); else console.log('3-letter currency code required.');
      } else if (field.startsWith('email')) {
        const v = await rlQuestion(rl, 'Email: '); if (!v || isEmail(v)) params.customerEmail = v.trim(); else console.log('That doesn’t look like a valid email.');
      } else if (field.startsWith('due')) {
        const v = await rlQuestion(rl, 'Due date (YYYY-MM-DD): '); params.invoiceInformation.dueDate = v.trim();
      } else if (field.startsWith('desc')) {
        const v = await rlQuestion(rl, 'Description: '); params.invoiceInformation.description = (v.trim() || 'Invoice for customer').slice(0,50);
      } else if (field.startsWith('name')) {
        const v = await rlQuestion(rl, 'Customer name: '); params.customerName = v.trim();
      }
    }
  }

  // Attempt create with basic retry on error by editing fields
  while (true) {
    const res = await (createInv as any).execute(params);
    if (res && typeof res === 'object' && (res as any).error) {
      console.log('\nHmm, that didn’t go through.');
      console.log('Reason:', formatToolError(res));
      const fix = (await rlQuestion(rl, 'What would you like to do? (amount/currency/email/due/desc/name) or (r)etry / (q)uit: ')).trim().toLowerCase();
      if (fix === 'q') break;
      if (fix === 'r') continue; // retry last attempt as-is
      if (fix.startsWith('amount')) {
        const v = await rlQuestion(rl, 'New amount (e.g., 100.00): ');
        if (isPosAmount(v)) params.totalAmount = v.trim(); else console.log('Please enter a positive number.');
      } else if (fix.startsWith('currency')) {
        const v = await rlQuestion(rl, 'New currency (3 letters): ');
        if (isCurrencyCode(v)) params.currency = v.trim().toUpperCase(); else console.log('3-letter currency code required.');
      } else if (fix.startsWith('email')) {
        const v = await rlQuestion(rl, 'New email: ');
        if (!v || isEmail(v)) params.customerEmail = v.trim(); else console.log('That doesn’t look like a valid email.');
      } else if (fix.startsWith('due')) {
        const v = await rlQuestion(rl, 'New due date (YYYY-MM-DD): ');
        params.invoiceInformation.dueDate = v.trim();
      } else if (fix.startsWith('desc')) {
        const v = await rlQuestion(rl, 'New description: ');
        params.invoiceInformation.description = (v.trim() || 'Invoice for customer').slice(0,50);
      } else if (fix.startsWith('name')) {
        const v = await rlQuestion(rl, 'New customer name: ');
        params.customerName = v.trim();
      }
      continue;
    }
    console.log('\nAll set — your invoice has been created.');
    console.log(typeof res === 'string' ? res : JSON.stringify(res));
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        type: 'invoice',
        summary: summarizeInvoice(params),
        id: ((): string | undefined => { try { const o = typeof res === 'string' ? JSON.parse(res) : res; return o?.id || o?.invoiceId; } catch { return undefined; } })(),
        params,
      };
      const auditPath = path.join(process.cwd(), 'audit-log.jsonl');
      fs.appendFileSync(auditPath, JSON.stringify(entry) + '\n');
      console.log('Audit log written to', auditPath);
    } catch {}
    break;
  }
}

async function interactivePL(rl: readline.Interface, text: string, toolkit: any) {
  const tools = toolkit.getTools();
  const createPL = (tools as any)['create_payment_link'];
  if (!createPL) throw new Error('create_payment_link tool not available');

  let amount = parseAmount(text) || '';
  let currency = parseCurrency(text) || '';
  let title = (text.match(/\bfor\s+([^,]+?)(?=\.|$|\s+in\b|\s+USD|\s+EUR|,)/i)?.[1] || '').trim();
  if (!title) title = 'Item';

  // AI-assisted extraction (optional)
  if (process.env.OPENAI_API_KEY) {
    try {
      const PLExtract = z.object({ amount: z.string().optional(), currency: z.string().optional(), title: z.string().optional() });
      const system = `You extract payment link fields from user requests. Return only fields you are confident in.`;
      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: PLExtract,
        system,
        prompt: `Text: ${text}\nExtract any of: amount (like 129.99), currency (3 letters), title (<=50 chars).`,
      });
      if (object?.amount && isPosAmount(object.amount)) amount = Number(parseFloat(object.amount)).toFixed(2);
      if (object?.currency && isCurrencyCode(object.currency)) currency = object.currency.toUpperCase();
      if (object?.title) title = object.title.slice(0,50);
    } catch {}
  }

  console.log('\nInteractive Payment Link Creator');
  while (!isCurrencyCode(currency)) {
    const ans = await rlQuestion(rl, `Which currency? (3 letters, e.g., USD/EUR): `);
    currency = ans.trim().toUpperCase();
  }
  if (!amount) {
    const fixed = await askYesNo(rl, 'Should this link collect a fixed amount?', false);
    if (fixed) {
      const a = await rlQuestion(rl, 'What amount? (e.g., 129.99): ');
      if (isPosAmount(a)) amount = Number(parseFloat(a)).toFixed(2); else console.log('Please enter a positive number like 129.99');
    }
  }
  const params: any = {
    linkType: 'PURCHASE',
    purchaseNumber: purchaseNumber(),
    currency,
    totalAmount: amount || undefined,
    requestPhone: false,
    requestShipping: false,
    lineItems: [
      { productName: title.slice(0,50), productSKU: undefined, productDescription: title.slice(0,50), quantity: '1', unitPrice: amount || '1.00' }
    ]
  };

  console.log('\nHere is what I will create:');
  console.log('-', summarizePL(params));
  const proceed = await askYesNo(rl, 'Proceed to create the payment link?');
  if (!proceed) {
    const field = (await rlQuestion(rl, `Change (amount/currency/title) or press Enter to continue: `)).trim().toLowerCase();
    if (field.startsWith('amount')) {
      const v = await rlQuestion(rl, 'Amount: '); if (isPosAmount(v)) params.totalAmount = Number(parseFloat(v)).toFixed(2);
    } else if (field.startsWith('currency')) {
      const v = await rlQuestion(rl, 'Currency: '); if (isCurrencyCode(v)) params.currency = v.trim().toUpperCase();
    } else if (field.startsWith('title')) {
      const v = await rlQuestion(rl, 'Title: '); params.lineItems[0].productName = (v.trim() || 'Item').slice(0,50);
    }
  }

  const res = await (createPL as any).execute(params);
  if (res && typeof res === 'object' && (res as any).error) {
    console.log('\nHmm, that didn’t go through.');
    console.log('Reason:', formatToolError(res));
    // Offer retry
    const again = await askYesNo(rl, 'Retry with the same details?', false);
    if (again) {
      const retry = await (createPL as any).execute(params);
      if (retry && typeof retry === 'object' && (retry as any).error) {
        console.log('\nStill not working.');
        console.log('Reason:', formatToolError(retry));
        return;
      }
      console.log('\nYour payment link is ready.');
      console.log(typeof retry === 'string' ? retry : JSON.stringify(retry));
      try {
        const entry = {
          timestamp: new Date().toISOString(),
          type: 'payment_link',
          summary: summarizePL(params),
          id: ((): string | undefined => { try { const o = typeof retry === 'string' ? JSON.parse(retry) : retry; return o?.id || o?.purchaseInformation?.purchaseNumber; } catch { return undefined; } })(),
          params,
        };
        const auditPath = path.join(process.cwd(), 'audit-log.jsonl');
        fs.appendFileSync(auditPath, JSON.stringify(entry) + '\n');
        console.log('Audit log written to', auditPath);
      } catch {}
      return;
    }
  } else {
    console.log('\nYour payment link is ready.');
    console.log(typeof res === 'string' ? res : JSON.stringify(res));
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        type: 'payment_link',
        summary: summarizePL(params),
        id: ((): string | undefined => { try { const o = typeof res === 'string' ? JSON.parse(res) : res; return o?.id || o?.purchaseInformation?.purchaseNumber; } catch { return undefined; } })(),
        params,
      };
      const auditPath = path.join(process.cwd(), 'audit-log.jsonl');
      fs.appendFileSync(auditPath, JSON.stringify(entry) + '\n');
      console.log('Audit log written to', auditPath);
    } catch {}
  }
}

async function main() {
  const initial = process.argv.slice(2).join(' ');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    let text = initial;
    if (!text) text = await rlQuestion(rl, 'Describe what you want (e.g., "Create an invoice for 100.00 USD to jane@example.com due in 15 days" or "Create a payment link for 129.99 USD for Pro Plan"): ');

    const configuration = { actions: { invoices: { create: true }, paymentLinks: { create: true } } } as const;
    const visaEnvironment = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
    const toolkit = new VisaAcceptanceAgentToolkit(
      process.env.VISA_ACCEPTANCE_MERCHANT_ID,
      process.env.VISA_ACCEPTANCE_API_KEY_ID,
      process.env.VISA_ACCEPTANCE_SECRET_KEY,
      visaEnvironment,
      configuration as any
    );

    let mode: 'invoice'|'pl'|'' = '';
    if (/\binvoice\b/i.test(text)) mode = 'invoice';
    if (/payment\s+link|pay\s*by\s*link/i.test(text)) mode = 'pl';
    if (!mode) {
      const pick = await rlQuestion(rl, 'Create an (i)nvoice or (p)ayment link? [i/p]: ');
      mode = pick.trim().toLowerCase().startsWith('p') ? 'pl' : 'invoice';
    }

    if (mode === 'invoice') await interactiveInvoice(rl, text, toolkit);
    else await interactivePL(rl, text, toolkit);
  } finally {
    rl.close();
  }
}

main();
