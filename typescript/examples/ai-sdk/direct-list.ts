// Direct list runner to validate sandbox connectivity with minimal inputs
require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

async function main() {
  const configuration = {
    actions: {
      paymentLinks: {
        read: true,
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
  const listPaymentLinks = tools['list_payment_links'];
  if (!listPaymentLinks) {
    throw new Error('list_payment_links tool is not available. Check configuration.actions.');
  }

  const params = {
    offset: 0,
    limit: 5,
  } as any;

  console.log('Listing payment links on SANDBOX...');
  try {
    const result = await (listPaymentLinks as any).execute(params);
    console.log('List payment links result:', result);
  } catch (err: any) {
    console.error('Failed to list payment links:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
