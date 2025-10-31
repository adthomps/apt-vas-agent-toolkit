"use strict";
/* © 2025 Visa.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInvoiceParameters = exports.updateInvoice = exports.updateInvoicePrompt = void 0;
const zod_1 = require("zod");
const util_1 = require("../utils/util");
const cybersourceRestApi = require('cybersource-rest-client');
const updateInvoicePrompt = (context = {}) => `
This tool will update an invoice in Visa Acceptance.
`;
exports.updateInvoicePrompt = updateInvoicePrompt;
const updateInvoice = async (visaClient, context, params) => {
    try {
        const { id, ...updateData } = params;
        const invoiceApiInstance = new cybersourceRestApi.InvoicesApi(visaClient.configuration, visaClient.visaApiClient);
        if (!updateData.customerInformation || !updateData.invoiceInformation || !updateData.orderInformation) {
            return 'Failed to update invoice: Missing required nested objects';
        }
        if (!updateData.orderInformation.amountDetails ||
            !updateData.orderInformation.amountDetails.totalAmount ||
            !updateData.orderInformation.amountDetails.currency) {
            return 'Failed to update invoice: Missing required fields in orderInformation.amountDetails';
        }
        const requestObj = {
            customerInformation: updateData.customerInformation,
            orderInformation: updateData.orderInformation,
            invoiceInformation: updateData.invoiceInformation
        };
        const result = await new Promise((resolve, reject) => {
            invoiceApiInstance.updateInvoice(id, requestObj, (error, data) => {
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
        return 'Failed to update invoice';
    }
};
exports.updateInvoice = updateInvoice;
const updateInvoiceParameters = (context = {}) => {
    return zod_1.z.object({
        id: zod_1.z.string().describe('Invoice ID (required)'),
        customerInformation: zod_1.z.object({
            email: zod_1.z.string().optional().describe('Customer email (optional)'),
            name: zod_1.z.string().optional().describe('Customer name (optional)')
        }).describe('Customer information object (required even if properties are optional)'),
        invoiceInformation: zod_1.z.object({
            description: zod_1.z.string().optional().describe('Invoice description (required)'),
            dueDate: zod_1.z.string().optional().describe('Due date (required)'),
            allowPartialPayments: zod_1.z.boolean().optional().describe('Whether to allow partial payments (optional)'),
            deliveryMode: zod_1.z.string().optional().describe('Delivery mode (optional)')
        }).describe('Invoice information object (required even if properties are optional)'),
        orderInformation: zod_1.z.object({
            amountDetails: zod_1.z.object({
                totalAmount: zod_1.z.string().describe('Total amount (required)'),
                currency: zod_1.z.string().describe('Currency code (required)'),
                discountAmount: zod_1.z.string().optional().describe('Discount amount (optional)'),
                discountPercent: zod_1.z.number().optional().describe('Discount percent (optional)'),
                subAmount: zod_1.z.number().optional().describe('Sub amount (optional)'),
                minimumPartialAmount: zod_1.z.number().optional().describe('Minimum partial amount (optional)')
            }).describe('Amount details object (required with totalAmount and currency)')
        }).describe('Order information object (required)')
    });
};
exports.updateInvoiceParameters = updateInvoiceParameters;
const tool = (context) => ({
    method: 'update_invoice',
    name: 'Update Invoice',
    description: (0, exports.updateInvoicePrompt)(context),
    parameters: (0, exports.updateInvoiceParameters)(context),
    actions: {
        invoices: {
            update: true,
        },
    },
    execute: exports.updateInvoice,
});
exports.default = tool;
