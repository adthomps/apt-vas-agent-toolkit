// Natural Language to Invoice List (local parsing)
require('dotenv').config();

import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

function parseListInvoices(text: string): { offset: number; limit: number; status?: string } {
  const t = (text || '').trim();
  // last N
  const mLast = t.match(/last\s+(\d{1,3})\b/i);
  const limit = mLast ? Math.min(parseInt(mLast[1], 10), 100) : 10;
  let offset = 0;
  // page N (1-based)
  const mPage = t.match(/page\s+(\d{1,4})\b/i);
  if (mPage) {
    const p = Math.max(1, parseInt(mPage[1], 10));
    offset = (p - 1) * limit;
  }
  // status filter: map human phrases to canonical statuses
  // Allowed: DRAFT, CREATED, SENT, PARTIAL, PAID, CANCELED
  const lower = t.toLowerCase();
  const tokens = Array.from(lower.matchAll(/\b(draft|created|new|sent|open|unpaid|pending|outstanding|overdue|partial|partially(?:[-\s])?paid|paid|canceled|cancelled|void)\b/g)).map(m => m[1]);
  const direct = (lower.match(/status\s*[:=]?\s*(\w+)/i) || [])[1];
  if (direct) tokens.unshift(direct.toLowerCase());
  const toCanonical = (w: string): string | undefined => {
    if (!w) return undefined;
    if (w === 'draft') return 'DRAFT';
    if (w === 'created' || w === 'new') return 'CREATED';
    if (w === 'sent' || w === 'open' || w === 'unpaid' || w === 'pending' || w === 'outstanding' || w === 'overdue') return 'SENT';
    if (w === 'partial' || w.startsWith('partially')) return 'PARTIAL';
    if (w === 'paid') return 'PAID';
    if (w === 'canceled' || w === 'cancelled' || w === 'void') return 'CANCELED';
    return undefined;
  };
  const priority = ['CANCELED','PAID','PARTIAL','SENT','CREATED','DRAFT'] as const;
  let status: string | undefined;
  for (const p of priority) {
    if (tokens.some(tok => toCanonical(tok) === p)) { status = p; break; }
  }
  return { offset, limit, status };
}

function printSummary(data: any) {
  try {
    const plain = JSON.parse(JSON.stringify(data));
    let items: any[] = [];
    if (plain && plain.invoices) {
      items = Array.isArray(plain.invoices) ? plain.invoices : Object.values(plain.invoices);
    } else if (Array.isArray(plain?.content)) {
      items = plain.content;
    } else if (Array.isArray(plain)) {
      items = plain;
    }
    const count = items.filter((x: any) => x && typeof x === 'object').length;
      console.log(`Found ${count} invoice(s).`);
      const rows = items.slice(0, 20).map((it: any) => {
        const id = it?.id || it?.invoiceId || '';
        const status = it?.status || it?.invoiceInformation?.status || '';
        const dueRaw = it?.invoiceInformation?.dueDate || '';
        const due = typeof dueRaw === 'string' ? dueRaw.replace('T00:00:00.000Z','') : '';
        const amt = it?.orderInformation?.amountDetails?.totalAmount;
        const curr = it?.orderInformation?.amountDetails?.currency;
        const amount = amt != null && curr ? `${amt} ${curr}` : (amt != null ? String(amt) : '');
        return { id, status, amount, due };
      });
      if (rows.length) {
        const header = ['ID','STATUS','AMOUNT','DUE'];
        const widths = [
          Math.max(2, ...rows.map(r=>r.id.length), header[0].length),
          Math.max(6, ...rows.map(r=>r.status.length), header[1].length),
          Math.max(6, ...rows.map(r=>r.amount.length), header[2].length),
          Math.max(3, ...rows.map(r=>r.due.length), header[3].length),
        ];
        const fmt = (vals: string[]) => vals.map((v,i)=>v.padEnd(widths[i])).join('  ');
        console.log(fmt(header));
        console.log(fmt(widths.map(w=>'-'.repeat(w))));
        for (const r of rows) console.log(fmt([r.id, r.status, r.amount, r.due]));
      }
  } catch {
    console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  }
}

async function main() {
  const userText = process.argv.slice(2).join(' ') || 'list last 10 invoices';
  const visaEnvironment = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    visaEnvironment,
    { actions: { invoices: { read: true } } } as any
  );
  const tools = toolkit.getTools();
  const listInv = (tools as any)['list_invoices'];
  if (!listInv) throw new Error('list_invoices tool not available');

  const params = parseListInvoices(userText);
  console.log(`Listing invoices on ${visaEnvironment} with`, params);
  const result = await (listInv as any).execute(params);
  try {
    printSummary(result);
  } catch {}
  try {
    console.log('Raw:', typeof result === 'string' ? result : JSON.stringify(result).slice(0, 400)+'...');
  } catch {}
}

main().catch((e) => { console.error('NL invoice list failed:', e?.message || e); process.exitCode = 1; });
