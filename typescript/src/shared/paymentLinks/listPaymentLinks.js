"use strict";
/* © 2025 Visa.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPaymentLinks = exports.listPaymentLinksPrompt = exports.listPaymentLinksParameters = void 0;
const zod_1 = require("zod");
const cybersourceRestApi = require('cybersource-rest-client');
const listPaymentLinksParameters = (context = {}) => {
    return zod_1.z.object({
        offset: zod_1.z.number().describe('Pagination offset (required)'),
        limit: zod_1.z.number().describe('Pagination limit (required)'),
        status: zod_1.z.string().optional().describe('Filter by status (optional)')
    });
};
exports.listPaymentLinksParameters = listPaymentLinksParameters;
const listPaymentLinksPrompt = (context = {}) => `
This tool will list payment links from Visa Acceptance.
`;
exports.listPaymentLinksPrompt = listPaymentLinksPrompt;
const listPaymentLinks = async (visaClient, context, params) => {
    try {
        const paymentLinkApiInstance = new cybersourceRestApi.PaymentLinksApi(visaClient.configuration, visaClient.visaApiClient);
        const opts = {};
        if (params.status) {
            opts.status = params.status;
        }
        const result = await new Promise((resolve, reject) => {
            paymentLinkApiInstance.getAllPaymentLinks(params.offset, params.limit, opts, (error, data) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(data);
                }
            });
        });
        return result;
    }
    catch (error) {
        try {
            const message = error?.message || String(error);
            const response = error?.response || error?.res;
            const body = response?.text || response?.body || response;
            return `Failed to list payment links: ${message}${body ? ' | ' + (typeof body === 'string' ? body : JSON.stringify(body)) : ''}`;
        }
        catch (_e) {
            return 'Failed to list payment links';
        }
    }
};
exports.listPaymentLinks = listPaymentLinks;
const tool = (context) => ({
    method: 'list_payment_links',
    name: 'List Payment Links',
    description: (0, exports.listPaymentLinksPrompt)(context),
    parameters: (0, exports.listPaymentLinksParameters)(context),
    actions: {
        paymentLinks: {
            read: true,
        },
    },
    execute: exports.listPaymentLinks,
});
exports.default = tool;
