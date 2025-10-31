require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

function parseId(text: string): string | undefined {
  const t = text.trim();
  const m1 = t.match(/\b(PL[0-9A-Z\-]{3,})\b/i);
  if (m1) return m1[1];
  const m2 = t.match(/\bid\s*[:=]?\s*([A-Za-z0-9_-]{4,})\b/i);
  if (m2) return m2[1];
  const m3 = t.match(/payment\s+link\s+([A-Za-z0-9_-]{4,})/i);
  if (m3) return m3[1];
  return undefined;
}

function parseAmount(text: string): string | undefined {
  const m = text.match(/\$?(\d+(?:\.\d{1,2})?)/);
  return m ? Number(m[1]).toFixed(2) : undefined;
}

function parseTitle(text: string): string | undefined {
  const m = text.match(/for\s+"([^\"]+)"|for\s+([^,\.]+)/i);
  if (m) return (m[1] || m[2]).trim();
  return undefined;
}

async function main() {
  const text = process.argv.slice(2).join(' ') || 'update payment link PL123456 set amount to 25.00 for "New Item"';
  const id = parseId(text);
  if (!id) { console.error('Could not find a payment link id in your text. Try: "update payment link PL123456 set amount to 25.00"'); process.exit(1); }

  const amount = parseAmount(text);
  const title = parseTitle(text);

  const env = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    env,
    { actions: { paymentLinks: { update: true } } } as any
  );
  const tools = toolkit.getTools();
  const updatePL = (tools as any)['update_payment_link'];
  if (!updatePL) throw new Error('update_payment_link tool not available');

  const params: any = { id };
  if (amount) params.totalAmount = amount;
  if (title) params.lineItems = [{ productName: title, quantity: '1', unitPrice: amount || '1.00' }];

  console.log(`Updating payment link ${id} on ${env} with`, params);
  const res = await (updatePL as any).execute(params);
  console.log(typeof res === 'string' ? res : JSON.stringify(res, null, 2));
}

main().catch((e) => { console.error('NL payment link update failed:', e?.message || e); process.exitCode = 1; });
