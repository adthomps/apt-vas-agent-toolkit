"use strict";
/* © 2025 Visa.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelInvoice = exports.cancelInvoicePrompt = exports.cancelInvoiceParameters = void 0;
const zod_1 = require("zod");
const util_1 = require("../utils/util");
const cybersourceRestApi = require('cybersource-rest-client');
const cancelInvoiceParameters = (context = {}) => {
    return zod_1.z.object({
        invoice_id: zod_1.z.string().describe('Invoice ID (required)')
    });
};
exports.cancelInvoiceParameters = cancelInvoiceParameters;
const cancelInvoicePrompt = (context = {}) => `
This tool will cancel an invoice in Visa Acceptance.
`;
exports.cancelInvoicePrompt = cancelInvoicePrompt;
const cancelInvoice = async (visaClient, context, params) => {
    try {
        const invoiceApiInstance = new cybersourceRestApi.InvoicesApi(visaClient.configuration, visaClient.visaApiClient);
        const result = await new Promise((resolve, reject) => {
            invoiceApiInstance.performCancelAction(params.invoice_id, (error, data, response) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve({
                        data,
                        status: response['status']
                    });
                }
            });
        });
        const maskedResult = (0, util_1.maskInvoiceCustomerInfo)(result);
        return maskedResult;
    }
    catch (error) {
        return 'Failed to cancel invoice';
    }
};
exports.cancelInvoice = cancelInvoice;
const tool = (context) => ({
    method: 'cancel_invoice',
    name: 'Cancel Invoice',
    description: (0, exports.cancelInvoicePrompt)(context),
    parameters: (0, exports.cancelInvoiceParameters)(context),
    actions: {
        invoices: {
            update: true,
        },
    },
    execute: exports.cancelInvoice,
});
exports.default = tool;
