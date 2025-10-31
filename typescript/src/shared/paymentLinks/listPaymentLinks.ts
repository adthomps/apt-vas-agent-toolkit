/* © 2025 Visa.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
import { Context } from '../configuration';
import { maskPII } from '../utils/util';
const cybersourceRestApi = require('cybersource-rest-client');

export const listPaymentLinksParameters = (
  context: VisaContext = {} as VisaContext
) => {
  return z.object({
    offset: z.number().describe('Pagination offset (required)'),
    limit: z.number().describe('Pagination limit (required)'),
    status: z.string().optional().describe('Filter by status (optional)')
  });
};

export const listPaymentLinksPrompt = (context: VisaContext = {} as VisaContext) => `
This tool will list payment links from Visa Acceptance.
`;

export const listPaymentLinks = async (
  visaClient: any,
  context: VisaContext,
  params: z.infer<ReturnType<typeof listPaymentLinksParameters>>
) => {
  try {
    const paymentLinkApiInstance = new cybersourceRestApi.PaymentLinksApi(visaClient.configuration, visaClient.visaApiClient);
    
    const opts: { status?: string } = {};
    if (params.status) {
      opts.status = params.status;
    }
    
    const result = await new Promise((resolve, reject) => {
      paymentLinkApiInstance.getAllPaymentLinks(
        params.offset,
        params.limit,
        opts,
        (error: any, data: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(data);
          }
        }
      );
    });
    // Normalize output to match the web UI server shape: { paymentLinks: [...], total }
    // The Cybersource SDK response shape can vary; be defensive and extract a list from common locations
    const typed = result as any;
    // Try common list container shapes first
    let rawList: any[] = Array.isArray(typed?.paymentLinks)
      ? typed.paymentLinks
      : Array.isArray(typed?.items)
        ? typed.items
        : Array.isArray(typed?.data?.paymentLinks)
          ? typed.data.paymentLinks
          : Array.isArray(typed?.data?.items)
            ? typed.data.items
            : Array.isArray(typed?._embedded?.paymentLinks)
              ? typed._embedded.paymentLinks
              : Array.isArray(typed?._embedded?.items)
                ? typed._embedded.items
                : Array.isArray(typed)
                  ? typed
                  : [];

    // As a last resort, scan first-level object values and pick the first non-empty array
    if (!rawList || rawList.length === 0) {
      try {
        const arrays = Object.values(typed || {}).filter(v => Array.isArray(v)) as any[];
        const nonEmpty = arrays.find(a => Array.isArray(a) && a.length > 0);
        if (nonEmpty) rawList = nonEmpty;
      } catch {}
    }

    const normalizeDate = (d: any): string | undefined => {
      if (!d) return undefined;
      try {
        const s = String(d);
        // If it's ISO-like, return YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
        const dt = new Date(s);
        if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      } catch {}
      return undefined;
    };

    const toTwo = (n: any): string | undefined => {
      if (n == null) return undefined;
      const num = typeof n === 'number' ? n : Number(String(n).replace(/[^0-9.\-]/g, ''));
      if (!Number.isFinite(num)) return undefined;
      return num.toFixed(2);
    };

    const normList = rawList.map((item: any) => {
      const amountDetails = item?.orderInformation?.amountDetails || item?.amountDetails || {};
      const lineItems = item?.orderInformation?.lineItems || item?.lineItems || [];
      const linkTypeRaw = item?.processingInformation?.linkType || item?.linkType;
      const linkType = typeof linkTypeRaw === 'string' ? linkTypeRaw.toUpperCase() : undefined;
      const totalAmount = amountDetails?.totalAmount ?? amountDetails?.amount;
      const minAmount = amountDetails?.minAmount;
      const maxAmount = amountDetails?.maxAmount;

      // Choose a reasonable memo/description (prefer product name/description first)
      const memo = (
        lineItems?.[0]?.productName ||
        lineItems?.[0]?.productDescription ||
        item?.description ||
        item?.memo ||
        item?.purchaseInformation?.purchaseNumber ||
        item?.clientReferenceInformation?.code ||
        undefined
      );

      const created = normalizeDate(
        item?.creationTime ||
        item?.createDate ||
        item?.created ||
        item?.date ||
        item?.timeCreated ||
        item?.createdAt ||
        item?.creationDate ||
        item?.dateCreated ||
        item?.createdDateTime ||
        item?.creationDateTime ||
        item?.submitTimeUtc ||
        item?.clientReferenceInformation?.transactionTimestamp
      );

      const paymentLink =
        item?.purchaseInformation?.paymentLink ||
        item?.paymentLinkInformation?.url ||
        item?.paymentLink ||
        item?.paymentLinkUrl ||
        item?.shortUrl ||
        item?.link ||
        item?.invoiceInformation?.paymentLink ||
        item?.paymentPageUrl ||
        item?.hostedPaymentPageUrl ||
        item?.hostedUrl;

      const base = {
        id: item?.id || item?.paymentLinkId || item?.referenceId || item?.transactionId,
        currency: (amountDetails?.currency || item?.currency || '').toString().toUpperCase() || undefined,
        memo,
        created,
        linkType: linkType === 'DONATION' ? 'DONATION' : 'PURCHASE',
        paymentLink,
      } as any;

      if (base.linkType === 'DONATION') {
        if (minAmount != null) base.minAmount = toTwo(minAmount);
        if (maxAmount != null) base.maxAmount = toTwo(maxAmount);
      } else {
        if (totalAmount != null) base.amount = toTwo(totalAmount);
      }

      return base;
    });

    const total = (typed && typeof typed.total === 'number') ? typed.total : (Array.isArray(rawList) ? rawList.length : 0);
    return { paymentLinks: normList, total };
  } catch (error) {
    try {
      const message = (error as any)?.message || String(error);
      const response = (error as any)?.response || (error as any)?.res;
      const body = response?.text || response?.body || response;
      return `Failed to list payment links: ${message}${body ? ' | ' + (typeof body === 'string' ? body : JSON.stringify(body)) : ''}`;
    } catch (_e) {
      return 'Failed to list payment links';
    }
  }
};

const tool = (context: VisaContext): Tool => ({
  method: 'list_payment_links',
  name: 'List Payment Links',
  description: listPaymentLinksPrompt(context),
  parameters: listPaymentLinksParameters(context),
  actions: {
    paymentLinks: {
      read: true,
    },
  },
  execute: listPaymentLinks,
});

export default tool;
