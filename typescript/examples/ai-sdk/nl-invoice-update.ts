require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

function pad(n: number) { return n.toString().padStart(2, '0'); }
function toISODate(d: Date) { return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`; }
function addDays(base: Date, days: number) { const d = new Date(base); d.setDate(d.getDate()+days); return d; }

function parseId(text: string): string | undefined {
  const t = text.trim();
  const m1 = t.match(/\b([A-Z]{2}\d{4,})\b/);
  if (m1) return m1[1];
  const m2 = t.match(/\bid\s*[:=]?\s*([A-Za-z0-9_-]{4,})\b/i);
  if (m2) return m2[1];
  const m3 = t.match(/invoice\s+([A-Za-z0-9_-]{4,})/i);
  if (m3) return m3[1];
  return undefined;
}

function parseAmount(text: string): string | undefined {
  const m = text.match(/\$(\d+(?:\.\d{1,2})?)/i) || text.match(/\b(\d+(?:\.\d{1,2})?)\b/);
  return m ? Number(m[1]).toFixed(2) : undefined;
}
function parseCurrency(text: string): string | undefined {
  const m = text.match(/\b(USD|EUR|GBP|AUD|CAD|JPY|INR)\b/i); return m ? m[1].toUpperCase() : undefined;
}
function parseDescription(text: string): string | undefined {
  const q = text.match(/"([^"]{1,50})"/); if (q) return q[1];
  const d = text.match(/(?:desc|description)\s*[:=]\s*([^,]{1,50})/i); return d ? d[1].trim().slice(0,50) : undefined;
}
function parseDue(text: string): string | undefined {
  const on = text.match(/due\s+on\s+(\d{4}-\d{2}-\d{2})/i); if (on) return on[1];
  const rel = text.match(/due\s+in\s+(\d+)\s*(day|days|week|weeks)/i);
  if (rel) { const n = parseInt(rel[1],10); const days = rel[2].toLowerCase().startsWith('week') ? n*7 : n; return toISODate(addDays(new Date(), days)); }
  return undefined;
}

async function main() {
  const text = process.argv.slice(2).join(' ') || 'update invoice NL123456 amount $120.00 EUR due on 2025-11-15 "Updated description"';
  const id = parseId(text);
  if (!id) { console.error('Could not find an invoice id in your text. Try: "update invoice NL123456 ..."'); process.exit(1); }

  const env = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    env,
    { actions: { invoices: { update: true, read: true } } } as any
  );
  const tools = toolkit.getTools();
  const getInv = (tools as any)['get_invoice'];
  const updInv = (tools as any)['update_invoice'];
  if (!getInv || !updInv) throw new Error('tools not available');

  // Fetch existing to fill required fields
  const current = await (getInv as any).execute({ id });
  const amount = parseAmount(text) || current?.orderInformation?.amountDetails?.totalAmount;
  const currency = parseCurrency(text) || current?.orderInformation?.amountDetails?.currency;
  const dueDate = parseDue(text) || current?.invoiceInformation?.dueDate;
  const description = parseDescription(text) || current?.invoiceInformation?.description;
  const email = current?.customerInformation?.email;
  const name = current?.customerInformation?.name;

  if (!amount || !currency) {
    console.error('Missing amount/currency. Include them in text (e.g., amount $120.00 USD) or ensure the invoice has them set.');
    process.exit(1);
  }

  const params = {
    id,
    customerInformation: { email, name },
    invoiceInformation: { description, dueDate, deliveryMode: current?.invoiceInformation?.deliveryMode || 'email' },
    orderInformation: { amountDetails: { totalAmount: String(amount), currency: String(currency) } },
  };

  console.log(`Updating invoice ${id} on ${env}...`);
  const res = await (updInv as any).execute(params);
  console.log(typeof res === 'string' ? res : JSON.stringify(res, null, 2));
}

main().catch((e) => { console.error('NL invoice update failed:', e?.message || e); process.exitCode = 1; });
