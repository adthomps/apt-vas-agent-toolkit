"use strict";
/* © 2025 Visa.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvoice = exports.getInvoicePrompt = exports.getInvoiceParameters = void 0;
const zod_1 = require("zod");
const util_1 = require("../utils/util");
const cybersourceRestApi = require('cybersource-rest-client');
const getInvoiceParameters = (context = {}) => {
    return zod_1.z.object({
        id: zod_1.z.string().describe('Invoice ID (required)')
    });
};
exports.getInvoiceParameters = getInvoiceParameters;
const getInvoicePrompt = (context = {}) => `
This tool will get a specific invoice from Visa Acceptance.
`;
exports.getInvoicePrompt = getInvoicePrompt;
const getInvoice = async (visaClient, context, params) => {
    try {
        const invoiceApiInstance = new cybersourceRestApi.InvoicesApi(visaClient.configuration, visaClient.visaApiClient);
        const result = await new Promise((resolve, reject) => {
            invoiceApiInstance.getInvoice(params.id, (error, data) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(data);
                }
            });
        });
        const maskedResult = (0, util_1.maskInvoiceCustomerInfo)(result);
        return maskedResult;
    }
    catch (error) {
        return 'Failed to get invoice';
    }
};
exports.getInvoice = getInvoice;
const tool = (context) => ({
    method: 'get_invoice',
    name: 'Get Invoice',
    description: (0, exports.getInvoicePrompt)(context),
    parameters: (0, exports.getInvoiceParameters)(context),
    actions: {
        invoices: {
            read: true,
        },
    },
    execute: exports.getInvoice,
});
exports.default = tool;
