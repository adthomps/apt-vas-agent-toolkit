require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

async function main() {
  const id = process.argv[2] || process.env.INVOICE_ID;
  if (!id) {
    console.error('Missing invoice id. Usage: npm run inv:update -- <INVOICE_ID>  (or set INVOICE_ID)');
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

  const tool = (toolkit.getTools() as any)['update_invoice'];
  if (!tool) throw new Error('update_invoice tool not available.');

  const params = {
    id,
    customerInformation: { name: 'Jane Doe' },
    invoiceInformation: {
      description: 'Updated description',
      dueDate: new Date(Date.now() + 10*24*60*60*1000).toISOString().slice(0,10),
      allowPartialPayments: false,
      deliveryMode: 'email'
    },
    orderInformation: {
      amountDetails: {
        totalAmount: '100.00',
        currency: 'USD'
      }
    }
  } as any;

  console.log('Updating invoice', id, 'on', env, '...');
  try {
    const result = await tool.execute(params);
    let out: any = result;
    try { out = JSON.parse(result); } catch {}
    console.log('Invoice update result:', out);
  } catch (err: any) {
    console.error('Failed to update invoice:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
