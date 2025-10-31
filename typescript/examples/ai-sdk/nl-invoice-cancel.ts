require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

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

async function main() {
  const text = process.argv.slice(2).join(' ') || 'cancel invoice NL123456';
  const invoice_id = parseId(text);
  if (!invoice_id) { console.error('Could not find an invoice id in your text. Try: "cancel invoice NL123456"'); process.exit(1); }

  const env = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    env,
    { actions: { invoices: { update: true } } } as any
  );
  const tools = toolkit.getTools();
  const cancelInv = (tools as any)['cancel_invoice'];
  if (!cancelInv) throw new Error('cancel_invoice tool not available');
  console.log(`Canceling invoice ${invoice_id} on ${env}...`);
  const res = await (cancelInv as any).execute({ invoice_id });
  console.log(typeof res === 'string' ? res : JSON.stringify(res, null, 2));
}

main().catch((e) => { console.error('NL invoice cancel failed:', e?.message || e); process.exitCode = 1; });
