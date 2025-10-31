// Direct runner to list invoices without AI
require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

async function main() {
  const configuration = {
    actions: {
      invoices: { read: true },
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

  const tools = toolkit.getTools();
  const listInvoices = (tools as any)['list_invoices'];
  if (!listInvoices) throw new Error('list_invoices tool not available.');

  const params = { offset: 0, limit: 5 } as any;

  console.log('Listing invoices on', visaEnvironment, '...');
  try {
    const result = await (listInvoices as any).execute(params);
    let out: any = result;
    try { out = JSON.parse(result); } catch {}
    console.log('List invoices result:', out);
  } catch (err: any) {
    console.error('Failed to list invoices:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
