// Debug runner to call Cybersource REST client directly for verbose error output
require('dotenv').config();
import { VisaAcceptanceAPI } from '../../src/shared/api';

async function main() {
  const ctx = {
    merchantId: process.env.VISA_ACCEPTANCE_MERCHANT_ID || '',
    apiKeyId: process.env.VISA_ACCEPTANCE_API_KEY_ID || '',
    secretKey: process.env.VISA_ACCEPTANCE_SECRET_KEY || '',
    environment: 'SANDBOX',
    mode: 'agent-toolkit',
  } as const;

  const api = new VisaAcceptanceAPI(ctx as any);
  const cybersourceRestApi = require('cybersource-rest-client');
  const paymentLinkApi = new cybersourceRestApi.PaymentLinksApi(api._apiClient.configuration, api._apiClient.visaApiClient);
  const invoicesApi = new cybersourceRestApi.InvoicesApi(api._apiClient.configuration, api._apiClient.visaApiClient);

  const logError = (label: string, error: any) => {
    console.error(`[${label}] Raw error keys:`, Object.keys(error || {}));
    try { console.error(`[${label}] message:`, error.message); } catch {}
    try { console.error(`[${label}] status:`, (error.response||{}).status); } catch {}
    try { console.error(`[${label}] headers:`, (error.response||{}).header); } catch {}
    try { console.error(`[${label}] text:`, (error.response||{}).text); } catch {}
    try { console.error(`[${label}] body:`, (error.response||{}).body); } catch {}
  };

  console.log('Debug: getAllPaymentLinks(0,1)');
  await new Promise<void>((resolve) => {
    paymentLinkApi.getAllPaymentLinks(0, 1, {}, (error: any, data: any, response: any) => {
      if (error) {
        logError('PL/LIST', error);
      } else {
        console.log('[PL/LIST] data:', data);
      }
      resolve();
    });
  });

  console.log('Debug: getAllInvoices(0,1)');
  await new Promise<void>((resolve) => {
    invoicesApi.getAllInvoices(0, 1, {}, (error: any, data: any, response: any) => {
      if (error) {
        logError('INV/LIST', error);
      } else {
        console.log('[INV/LIST] data:', data);
      }
      resolve();
    });
  });

  console.log('Debug: createInvoice minimal');
  await new Promise<void>((resolve) => {
    const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    const req = {
      merchantId: ctx.merchantId,
      customerInformation: { name: 'John Debug', email: 'john.debug@example.com' },
      orderInformation: { amountDetails: { totalAmount: '5.00', currency: 'USD' } },
      invoiceInformation: {
        description: 'Debug invoice',
        dueDate: new Date(Date.now()+3*24*60*60*1000).toISOString().slice(0,10),
        invoiceNumber: 'INV' + rand,
        sendImmediately: false,
        deliveryMode: 'email',
      },
    };
    invoicesApi.createInvoice(req, (error: any, data: any, response: any) => {
      if (error) {
        logError('INV/CREATE', error);
      } else {
        console.log('[INV/CREATE] data:', data);
      }
      resolve();
    });
  });
}

main();
