require('dotenv').config();
import { VisaAcceptanceAgentToolkit } from '../../src/ai-sdk';

async function main() {
  const id = process.argv[2] || process.env.PAYMENT_LINK_ID;
  if (!id) {
    console.error('Missing payment link id. Usage: npm run pl:get -- <PAYMENT_LINK_ID>  (or set PAYMENT_LINK_ID)');
    process.exit(1);
  }

  const configuration = { actions: { paymentLinks: { read: true } } } as const;
  const env = (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase();
  const toolkit = new VisaAcceptanceAgentToolkit(
    process.env.VISA_ACCEPTANCE_MERCHANT_ID,
    process.env.VISA_ACCEPTANCE_API_KEY_ID,
    process.env.VISA_ACCEPTANCE_SECRET_KEY,
    env,
    configuration as any
  );

  const tool = (toolkit.getTools() as any)['get_payment_link'];
  if (!tool) throw new Error('get_payment_link tool not available.');

  console.log('Getting payment link', id, 'on', env, '...');
  try {
    const result = await tool.execute({ id } as any);
    let out: any = result;
    try { out = JSON.parse(result); } catch {}
    console.log('Payment link get result:', out);
  } catch (err: any) {
    console.error('Failed to get payment link:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
