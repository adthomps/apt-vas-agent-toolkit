"use strict";
/* © 2025 Visa.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInvoices = exports.listInvoicesPrompt = exports.listInvoicesParameters = void 0;
const zod_1 = require("zod");
const util_1 = require("../utils/util");
const cybersourceRestApi = require('cybersource-rest-client');
const listInvoicesParameters = (context = {}) => {
    return zod_1.z.object({
        offset: zod_1.z.number().describe('Pagination offset (required)'),
        limit: zod_1.z.number().describe('Pagination limit (required)'),
        status: zod_1.z.string().optional().describe('Filter by status (optional)')
    });
};
exports.listInvoicesParameters = listInvoicesParameters;
const listInvoicesPrompt = (context = {}) => `
This tool will list invoices from Visa Acceptance.
`;
exports.listInvoicesPrompt = listInvoicesPrompt;
const listInvoices = async (visaClient, context, params) => {
    try {
        const invoiceApiInstance = new cybersourceRestApi.InvoicesApi(visaClient.configuration, visaClient.visaApiClient);
        const opts = {};
        if (params.status != null && params.status !== '') {
            opts.status = params.status;
        }
        console.log('Sending request with params:', JSON.stringify({ offset: params.offset, limit: params.limit, opts }));
        const result = await new Promise((resolve, reject) => {
            invoiceApiInstance.getAllInvoices(params.offset, params.limit, opts, (error, data, response) => {
                if (error) {
                    console.error('Error in listInvoices:', JSON.stringify(error));
                    reject(error);
                }
                else {
                    console.log('Response from getAllInvoices:', JSON.stringify(response));
                    resolve(data);
                }
            });
        });
        const typedResult = result;
        // API returns a wrapper object with an 'invoices' array
        const invoices = Array.isArray(typedResult?.invoices) ? typedResult.invoices : [];
        const maskedInvoices = (0, util_1.maskInvoicesCustomerInfo)(invoices);
        return { ...(typedResult || {}), invoices: maskedInvoices };
    }
    catch (error) {
        console.error('Failed to list invoices:', error);
        return 'Failed to list invoices';
    }
};
exports.listInvoices = listInvoices;
const tool = (context) => ({
    method: 'list_invoices',
    name: 'List Invoices',
    description: (0, exports.listInvoicesPrompt)(context),
    parameters: (0, exports.listInvoicesParameters)(context),
    actions: {
        invoices: {
            read: true,
        },
    },
    execute: exports.listInvoices,
});
exports.default = tool;
