// Natural Language to Payment Link List (local parsing)
require('dotenv').config();

import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

function parseListPL(text: string): { offset: number; limit: number; status?: string } {
  const t = (text || '').trim();
  const mLast = t.match(/last\s+(\d{1,3})\b/i);
  const limit = mLast ? Math.min(parseInt(mLast[1], 10), 100) : 10;
  let offset = 0;
  const mPage = t.match(/page\s+(\d{1,4})\b/i);
  if (mPage) {
    const p = Math.max(1, parseInt(mPage[1], 10));
    offset = (p - 1) * limit;
  }
  const mStatus = t.match(/status\s*[:=]?\s*(\w+)/i);
  const status = mStatus ? mStatus[1].toUpperCase() : undefined;
  return { offset, limit, status };
}

function printSummary(data: any) {
  try {
    const plain = JSON.parse(JSON.stringify(data));
    const items = Array.isArray(plain?.content) ? plain.content : (Array.isArray(plain) ? plain : []);
    console.log(`Found ${items.length} payment link(s).`);
    const rows = items.slice(0, 20).map((it: any) => {
      const id = it?.id || it?.referenceNumber || it?._links?.self?.href || '';
      const status = it?.status || it?.state || it?.processingInformation?.state || '';
      const amt = it?.orderInformation?.amountDetails?.totalAmount;
      const curr = it?.orderInformation?.amountDetails?.currency;
      const amount = amt != null && curr ? `${amt} ${curr}` : (amt != null ? String(amt) : '');
      return { id, status, amount };
    });
    if (rows.length) {
      const header = ['ID','STATUS','AMOUNT'];
      const widths = [
        Math.max(2, ...rows.map(r=>r.id.length), header[0].length),
        Math.max(6, ...rows.map(r=>r.status.length), header[1].length),
        Math.max(6, ...rows.map(r=>r.amount.length), header[2].length),
      ];
      const fmt = (vals: string[]) => vals.map((v,i)=>v.padEnd(widths[i])).join('  ');
      console.log(fmt(header));
      console.log(fmt(widths.map(w=>'-'.repeat(w))));
      for (const r of rows) console.log(fmt([r.id, r.status, r.amount]));
    }
  } catch {
    console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  }
}

async function main() {
  const userText = process.argv.slice(2).join(' ') || 'list last 10 payment links';
  const visaEnvironment = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    visaEnvironment,
    { actions: { paymentLinks: { read: true } } } as any
  );
  const tools = toolkit.getTools();
  const listPL = (tools as any)['list_payment_links'];
  if (!listPL) throw new Error('list_payment_links tool not available');

  const params = parseListPL(userText);
  console.log(`Listing payment links on ${visaEnvironment} with`, params);
  const result = await (listPL as any).execute(params);
  printSummary(result);
}

main().catch((e) => { console.error('NL payment link list failed:', e?.message || e); process.exitCode = 1; });
