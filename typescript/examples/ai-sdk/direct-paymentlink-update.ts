require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

async function main() {
  const id = process.argv[2] || process.env.PAYMENT_LINK_ID;
  if (!id) {
    console.error('Missing payment link id. Usage: npm run pl:update -- <PAYMENT_LINK_ID>  (or set PAYMENT_LINK_ID)');
    process.exit(1);
  }

  const configuration = { actions: { paymentLinks: { update: true } } } as const;
  const env = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    env,
    configuration as any
  );

  const tool = (toolkit.getTools() as any)['update_payment_link'];
  if (!tool) throw new Error('update_payment_link tool not available.');

  const params = {
    id,
    currency: 'USD',
    totalAmount: '100.00',
    clientReferenceCode: process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    lineItems: [
      {
        productName: 'Updated Item',
        quantity: '1',
        unitPrice: '100.00',
        productDescription: 'Updated description'
      }
    ]
  } as any;

  console.log('Updating payment link', id, 'on', env, '...');
  try {
    const result = await tool.execute(params);
    let out: any = result;
    try { out = JSON.parse(result); } catch {}
    console.log('Payment link update result:', out);
  } catch (err: any) {
    console.error('Failed to update payment link:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
