// Natural Language to Invoice creation using AI tools (with local fallback)
// Loads env, parses a user-provided NL command, and creates an invoice via Visa Acceptance.
require('dotenv').config();

import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

type ParsedInvoice = {
  totalAmount: string;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
};

function pad(num: number) {
  return num.toString().padStart(2, '0');
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function nextWeekday(base: Date, targetDow: number): Date {
  const d = new Date(base);
  const todayDow = d.getDay(); // 0=Sun
  let delta = (targetDow - todayDow + 7) % 7;
  if (delta === 0) delta = 7; // "next Friday" when today is Friday → 7 days ahead
  return addDays(d, delta);
}

function toISODate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// Very small, robust parser for common phrasing like:
// "Create an invoice for $450 in EUR for ACME Corp, due in 15 days"
function parseNL(input: string): ParsedInvoice {
  const text = input.trim();

  // Amount
  // Prefer $123.45 style; else fallback to first number
  const moneyMatch = text.match(/\$(\d+(?:\.\d{1,2})?)/i) || text.match(/\b(\d+(?:\.\d{1,2})?)\b/);
  const amount = moneyMatch ? moneyMatch[1] : '100.00';

  // Currency (look for explicit 3-letter code); if $ present and no explicit, default USD
  const currMatch = text.match(/\b(USD|EUR|GBP|AUD|CAD|JPY|INR)\b/i);
  let currency = currMatch ? currMatch[1].toUpperCase() : (text.includes('$') ? 'USD' : 'USD');

  // Customer name: prefer the 'for <name>' AFTER currency mention, to avoid capturing the amount.
  let customerName: string | undefined;
  const currencyPos = (() => {
    const cm = text.match(/\b(USD|EUR|GBP|AUD|CAD|JPY|INR)\b/i);
    return cm ? (cm.index ?? 0) + cm[0].length : 0;
  })();
  const tail = text.slice(currencyPos);
  const nameMatch = tail.match(/\bfor\s+([^,]+?)(?=\s+due\b|,|$)/i) || text.match(/\bfor\s+([^,]+?)(?=\s+due\b|,|$)/i);
  if (nameMatch) {
    const candidate = nameMatch[1].trim();
    // Ignore candidates that look like amounts ($100, 100.00) or emails
    if (!/^\$|^\d/.test(candidate) && !/@/.test(candidate)) {
      customerName = candidate;
    }
  }

  // Optional explicit customer email: "email someone@example.com" OR "to someone@example.com"
  const emailMatch = text.match(/\b(?:email|to)\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);
  const customerEmail = emailMatch ? emailMatch[1] : undefined;

  // Due date: "due in 15 days" | "due in 2 weeks" | "due on 2025-11-05"
  const dueInDays = (() => {
    const m = text.match(/due\s+in\s+(\d+)\s*(day|days|week|weeks)/i);
    if (!m) return undefined;
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    return unit.startsWith('week') ? n * 7 : n;
  })();
  const dueOn = (() => {
    const m = text.match(/due\s+on\s+(\d{4}-\d{2}-\d{2})/i);
    if (m) return m[1];
    const wd = text.match(/due\s+next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (wd) {
      const dayMap: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const base = new Date();
      const dt = nextWeekday(base, dayMap[wd[1].toLowerCase()]);
      return toISODate(dt);
    }
    if (/due\s+(at\s+the\s+)?end\s+of\s+month/i.test(text)) {
      const now = new Date();
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
      return toISODate(end);
    }
    if (/due\s+next\s+business\s+day/i.test(text)) {
      const d = new Date();
      const dow = d.getDay();
      let add = 1;
      if (dow === 5) add = 3; else if (dow === 6) add = 2;
      return toISODate(addDays(d, add));
    }
    return undefined;
  })();

  const base = new Date();
  const dueDate = dueOn ? dueOn : toISODate(addDays(base, dueInDays ?? 30));

  // Description: short summary
  const description = `Invoice for ${customerName || 'customer'} (${currency} ${amount})`;

  return {
    totalAmount: Number(amount).toFixed(2),
    currency,
    customerName,
    customerEmail,
    description,
    dueDate,
  };
}

function randomInvoiceNumber(prefix = 'NL') {
  const n = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `${prefix}${n}`.slice(0, 18); // keep <20 chars
}

async function runWithAI(toolkit: any, userCommand: string) {
  const tools = toolkit.getTools();

  const today = toISODate(new Date());
  const system = `
You translate natural language commands about invoicing into a single tool call.
Rules:
- Always call the create_invoice tool exactly once.
- invoice_number must be letters/numbers only, <20 chars. If not provided, make one like NL######.
- Compute invoiceInformation.dueDate as YYYY-MM-DD. For phrases like "in 15 days", add from today.
- Set invoiceInformation.sendImmediately=true and deliveryMode="email" by default.
- Keep invoiceInformation.description short (<=50 chars).
 - Today is ${today} (UTC). Never choose a dueDate in the past; if ambiguous, pick a future date.
`;

  const result = await generateText({
    model: openai('gpt-4o'),
    tools: { ...tools },
    maxSteps: 5,
    system,
    prompt: userCommand,
  });

  return result;
}

async function runLocally(toolkit: any, userCommand: string) {
  const tools = toolkit.getTools();
  const createInvoice = (tools as any)['create_invoice'];
  if (!createInvoice) throw new Error('create_invoice tool not available');

  const parsed = parseNL(userCommand);
  const params = {
    invoice_number: randomInvoiceNumber(),
    totalAmount: parsed.totalAmount,
    currency: parsed.currency,
    customerName: parsed.customerName,
    customerEmail: parsed.customerEmail || 'billing@example.com',
    invoiceInformation: {
      description: parsed.description,
      dueDate: parsed.dueDate,
      sendImmediately: true,
      deliveryMode: 'email',
    },
  };

  const output = await (createInvoice as any).execute(params);
  return { text: 'Invoice created (local parsing).', toolResults: [{ toolName: 'create_invoice', result: output }] };
}

async function main() {
  // Note: On Windows PowerShell, $ expands; prefer quoting or omit the $ in args.
  // Default CLI prompt includes amount, currency, recipient (email or customer), and due date
  const userCommand = process.argv.slice(2).join(' ') || 'Create an invoice for 450.00 EUR to billing@acme.example for ACME Corp, due in 15 days. Memo: Consulting services.';

  const configuration = {
    actions: {
      invoices: { create: true },
    },
  } as const;

  const visaEnvironment = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    visaEnvironment,
    configuration as any
  );

  const hasAIKey = !!process.env.OPENAI_API_KEY;
  console.log(`NL → Invoice on ${visaEnvironment}. Using ${hasAIKey ? 'AI tools' : 'local parser'}...`);
  try {
    let result = hasAIKey ? await runWithAI(toolkit, userCommand) : await runLocally(toolkit, userCommand);

    // Inspect tool results for failure; if failed or empty, fallback to local execution
    const toolResultsRaw: any[] = (result as any).toolResults || (result as any).steps?.flatMap((s: any) => s.toolResults?.map((tr: any) => tr.result) || []) || [];
    const failed = toolResultsRaw.length === 0 || toolResultsRaw.some((r) => (typeof r === 'string' && /Failed to create invoice/i.test(r)) || (r && typeof r === 'object' && r.error));
    if (failed && hasAIKey) {
      try {
        if (toolResultsRaw.length) {
          console.warn('AI tool call error details:', JSON.stringify(toolResultsRaw, null, 2));
          // Surface any suggestion
          const hint = toolResultsRaw.find((r: any) => r && typeof r === 'object' && r.suggestion)?.suggestion;
          if (hint) console.warn('Tip:', hint);
        }
      } catch {}
      console.warn('AI tool call did not succeed; retrying with local parsing...');
      result = await runLocally(toolkit, userCommand);
    }

    // Try to surface the created invoice id if present
    let printed = false;
    const toolResults: any[] = (result as any).toolResults || (result as any).steps?.flatMap((s: any) => s.toolCalls?.map((c: any) => c.result) || []) || [];
    for (const r of toolResults) {
      if (!r) continue;
      try {
        const obj = typeof r === 'string' ? JSON.parse(r) : r;
        const id = obj?.id || obj?.invoiceId || obj?.invoice?.id;
        const status = obj?.status;
        const dueDate = obj?.invoiceInformation?.dueDate;
        if (id) {
          console.log('Created invoice:', { id, status, dueDate });
          printed = true;
          break;
        }
      } catch {}
    }
    if (!printed) {
      console.log('Result:', JSON.stringify(result, null, 2));
    }
  } catch (err: any) {
    console.error('NL invoice failed:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
