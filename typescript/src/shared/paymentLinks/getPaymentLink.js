"use strict";
/* © 2025 Visa.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentLink = exports.getPaymentLinkPrompt = exports.getPaymentLinkParameters = void 0;
const zod_1 = require("zod");
const cybersourceRestApi = require('cybersource-rest-client');
const getPaymentLinkParameters = (context = {}) => {
    return zod_1.z.object({
        id: zod_1.z.string().describe('Payment link ID (required)')
    });
};
exports.getPaymentLinkParameters = getPaymentLinkParameters;
const getPaymentLinkPrompt = (context = {}) => `
This tool will get a specific payment link from Visa Acceptance.
`;
exports.getPaymentLinkPrompt = getPaymentLinkPrompt;
const getPaymentLink = async (visaClient, context, params) => {
    try {
        const paymentLinkApiInstance = new cybersourceRestApi.PaymentLinksApi(visaClient.configuration, visaClient.visaApiClient);
        const result = await new Promise((resolve, reject) => {
            paymentLinkApiInstance.getPaymentLink(params.id, (error, data) => {
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
        return 'Failed to get payment link';
    }
};
exports.getPaymentLink = getPaymentLink;
const tool = (context) => ({
    method: 'get_payment_link',
    name: 'Get Payment Link',
    description: (0, exports.getPaymentLinkPrompt)(context),
    parameters: (0, exports.getPaymentLinkParameters)(context),
    actions: {
        paymentLinks: {
            read: true,
        },
    },
    execute: exports.getPaymentLink,
});
exports.default = tool;
