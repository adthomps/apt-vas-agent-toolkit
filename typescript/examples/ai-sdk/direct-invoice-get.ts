require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

async function main() {
  const id = process.argv[2] || process.env.INVOICE_ID;
  if (!id) {
    console.error('Missing invoice id. Usage: npm run inv:get -- <INVOICE_ID>  (or set INVOICE_ID in environment)');
    process.exit(1);
  }

  const configuration = { actions: { invoices: { read: true } } } as const;
  const env = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    env,
    configuration as any
  );

  const tool = (toolkit.getTools() as any)['get_invoice'];
  if (!tool) throw new Error('get_invoice tool not available.');

  console.log('Getting invoice', id, 'on', env, '...');
  try {
    const result = await tool.execute({ id } as any);
    let out: any = result;
    try { out = JSON.parse(result); } catch {}
    console.log('Invoice get result:', out);
  } catch (err: any) {
    console.error('Failed to get invoice:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
