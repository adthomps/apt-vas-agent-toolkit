require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

async function main() {
  const id = process.argv[2] || process.env.INVOICE_ID;
  if (!id) {
    console.error('Missing invoice id. Usage: npm run inv:cancel -- <INVOICE_ID>  (or set INVOICE_ID)');
    process.exit(1);
  }

  const configuration = { actions: { invoices: { update: true } } } as const;
  const env = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    env,
    configuration as any
  );

  const tool = (toolkit.getTools() as any)['cancel_invoice'];
  if (!tool) throw new Error('cancel_invoice tool not available.');

  console.log('Canceling invoice', id, 'on', env, '...');
  try {
    const result = await tool.execute({ invoice_id: id } as any);
    let out: any = result;
    try { out = JSON.parse(result); } catch {}
    console.log('Invoice cancel result:', out);
  } catch (err: any) {
    console.error('Failed to cancel invoice:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
