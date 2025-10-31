require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

function parseId(text: string): string | undefined {
  const t = text.trim();
  const m1 = t.match(/\b(PL[0-9A-Z\-]{3,})\b/i); // e.g., PLABC123
  if (m1) return m1[1];
  const m2 = t.match(/\bid\s*[:=]?\s*([A-Za-z0-9_-]{4,})\b/i);
  if (m2) return m2[1];
  const m3 = t.match(/payment\s+link\s+([A-Za-z0-9_-]{4,})/i);
  if (m3) return m3[1];
  return undefined;
}

async function main() {
  const text = process.argv.slice(2).join(' ') || 'get payment link PL123456';
  const id = parseId(text);
  if (!id) { console.error('Could not find a payment link id in your text. Try: "get payment link PL123456"'); process.exit(1); }

  const env = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    env,
    { actions: { paymentLinks: { read: true } } } as any
  );
  const tools = toolkit.getTools();
  const getPL = (tools as any)['get_payment_link'];
  if (!getPL) throw new Error('get_payment_link tool not available');
  console.log(`Getting payment link ${id} on ${env}...`);
  const res = await (getPL as any).execute({ id });
  console.log(typeof res === 'string' ? res : JSON.stringify(res, null, 2));
}

main().catch((e) => { console.error('NL payment link get failed:', e?.message || e); process.exitCode = 1; });
