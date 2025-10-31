// Direct runner to exercise the Visa Acceptance toolkit without AI
require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

async function main() {
  const configuration = {
    actions: {
      paymentLinks: {
        create: true,
      },
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
  const createPaymentLink = tools['create_payment_link'];
  if (!createPaymentLink) {
    throw new Error('create_payment_link tool is not available. Check configuration.actions.');
  }

  // Minimal payload for sandbox: adjust values as needed
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  const params = {
    linkType: 'PURCHASE',
    purchaseNumber: 'DEMO' + rand, // Alphanumeric only, no spaces
    currency: 'USD',
    totalAmount: '100.00',
    requestPhone: false,
    requestShipping: false,
    clientReferenceCode: process.env.VISA_ACCEPTANCE_MERCHANT_ID || 'demo-ref',
    lineItems: [
      {
        productName: 'Ski Trip - Whistler',
        productSKU: 'SKI-TRIP-001',
        productDescription: 'Whistler winter package',
        quantity: '1',
        unitPrice: '100.00',
      },
    ],
  } as any;

  console.log('Creating payment link on SANDBOX...');
  try {
    const result = await (createPaymentLink as any).execute(params);
    let out: any = result;
    try { out = JSON.parse(result); } catch {}
    console.log('Payment link result:', out);
  } catch (err: any) {
    console.error('Failed to create payment link:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
