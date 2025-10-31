/* © 2025 Visa.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
import { Context } from '../configuration';
import { maskInvoiceCustomerInfo } from '../utils/util';
import { withSuggestion } from '../utils/errorHints';
const cybersourceRestApi = require('cybersource-rest-client');



export const createInvoiceParameters = (
  context: VisaContext = {} as VisaContext
) => {
  const schema = z.object({
    invoice_number: z
      .string()
      .max(19, 'invoice_number must be <20 characters')
      .regex(/^[A-Za-z0-9]+$/, 'invoice_number must be alphanumeric')
      .describe('Unique invoice number (letters & numbers only, <20 chars)'),
    totalAmount: z
      .string()
      .describe('Invoice total amount e.g. "100.00"'),
    currency: z
      .string()
      .regex(/^[A-Za-z]{3}$/i, 'currency must be 3-letter code')
      .describe('Invoice currency code e.g. "USD"'),
    customerName: z.string().optional().describe('Customer name for invoice'),
    customerEmail: z.string().optional().describe('Customer email for invoice'),
    invoiceInformation: z
      .object({
        description: z.string().max(50, 'description must be <=50 chars').describe('Short invoice description (max 50 characters)'),
        dueDate: z.string().describe('Due date in YYYY-MM-DD format'),
        sendImmediately: z.boolean().describe('Whether to send the invoice immediately'),
        deliveryMode: z.string().describe('Delivery mode e.g. "email"')
      })
      .required()
      .describe('Invoice information object'),
  }).superRefine((val, ctx) => {
    const amt = parseFloat(val.totalAmount);
    if (!(isFinite(amt) && amt > 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['totalAmount'], message: 'totalAmount must be a positive number' });
    }
    // Due date must not be in the past (UTC date-only comparison)
    const today = new Date();
    const [y, m, d] = (val.invoiceInformation?.dueDate || '').split('-').map((s) => parseInt(s, 10));
    if (y && m && d) {
      const due = new Date(Date.UTC(y, (m - 1) || 0, d || 1));
      const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      if (due.getTime() < todayUTC.getTime()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['invoiceInformation', 'dueDate'], message: 'dueDate must not be in the past' });
      }
    }
  });
  return schema;
};

export const createInvoicePrompt = (context: VisaContext = {} as VisaContext) => `
This tool will create an invoice in Visa Acceptance.
`;

export const createInvoice = async (
  visaClient: any,
  context: VisaContext,
  params: z.infer<ReturnType<typeof createInvoiceParameters>>
) => {
  try {
    const invoiceApiInstance = new cybersourceRestApi.InvoicesApi(visaClient.configuration, visaClient.visaApiClient);
    
    const requestObj = {
      merchantId: context.merchantId,
      customerInformation: {
        name: params.customerName,
        email: params.customerEmail
      },
      orderInformation: {
        amountDetails: {
          totalAmount: params.totalAmount,
          currency: params.currency
        }
      },
      invoiceInformation: {
        description: params.invoiceInformation?.description,
        dueDate: params.invoiceInformation?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        invoiceNumber: params.invoice_number,
        sendImmediately: params.invoiceInformation?.sendImmediately !== undefined ? params.invoiceInformation.sendImmediately : true,
        deliveryMode: params.invoiceInformation?.deliveryMode || 'email'
      }
    };
    
    const result = await new Promise((resolve, reject) => {
      invoiceApiInstance.createInvoice(requestObj, (error: any, data: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
    
    const maskedResult = maskInvoiceCustomerInfo(result);
    return maskedResult;
  } catch (error) {
    const e: any = error || {};
    const response = e.response || e.res || {};
    const text = response.text;
    const body = response.body;
    const status = response.status || e.status;
    const message = e.message || 'Unknown error';
    const baseErr = {
      error: true,
      message: `Failed to create invoice: ${message}`,
      status,
      responseText: typeof text === 'string' ? text : undefined,
      responseBody: body,
    } as any;
    return withSuggestion(baseErr, 'invoice');
  }
};

const tool = (context: VisaContext): Tool => ({
  method: 'create_invoice',
  name: 'Create Invoice',
  description: createInvoicePrompt(context),
  parameters: createInvoiceParameters(context),
  actions: {
    invoices: {
      create: true,
    },
  },
  execute: createInvoice,
});

export default tool;
