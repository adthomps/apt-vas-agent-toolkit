// Direct runner to create a payment link without AI
require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

async function main() {
  const configuration = {
    actions: {
      paymentLinks: { create: true },
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
  const createPL = (tools as any)['create_payment_link'];
  if (!createPL) throw new Error('create_payment_link tool not available.');

  const pn = 'PL' + Math.random().toString(36).slice(2, 10).toUpperCase();
  const params: any = {
    linkType: 'PURCHASE',
    purchaseNumber: pn,
    currency: 'USD',
    totalAmount: '9.99',
    requestPhone: false,
    requestShipping: false,
    clientReferenceCode: undefined,
    lineItems: [
      {
        productName: 'Example Item',
        productSKU: pn,
        productDescription: 'An example purchase item',
        quantity: '1',
        unitPrice: '9.99',
      }
    ]
  };

  console.log('Creating payment link on', visaEnvironment, '...');
  try {
    const result = await (createPL as any).execute(params);
    let out: any = result;
    try { out = JSON.parse(result); } catch {}
    console.log('Payment link creation result:', out);
  } catch (err: any) {
    console.error('Failed to create payment link:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
