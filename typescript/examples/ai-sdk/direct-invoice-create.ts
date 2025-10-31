// Direct runner to create an invoice without AI
require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

async function main() {
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

  const tools = toolkit.getTools();
  const createInvoice = (tools as any)['create_invoice'];
  if (!createInvoice) throw new Error('create_invoice tool not available.');

  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  const params = {
    invoice_number: 'INV' + rand, // letters & numbers only, <20 chars
    totalAmount: '100.00',
    currency: 'USD',
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    invoiceInformation: {
      description: 'Test invoice', // keep short
      dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0,10),
      sendImmediately: true,
      deliveryMode: 'email',
    },
  } as any;

  console.log('Creating invoice on', visaEnvironment, '...');
  try {
    const result = await (createInvoice as any).execute(params);
    let out: any = result;
    try { out = JSON.parse(result); } catch {}
    console.log('Invoice creation result:', out);
  } catch (err: any) {
    console.error('Failed to create invoice:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
