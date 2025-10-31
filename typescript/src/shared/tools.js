"use strict";
/* © 2025 Visa.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTools = createTools;
exports.tools = createTools;
// We need to update all the invoice and payment link files to use named exports
// For now, let's use default imports until all files are updated
const createInvoice_1 = __importDefault(require("./invoices/createInvoice"));
const updateInvoice_1 = __importDefault(require("./invoices/updateInvoice"));
const getInvoice_1 = __importDefault(require("./invoices/getInvoice"));
const listInvoices_1 = __importDefault(require("./invoices/listInvoices"));
const sendInvoice_1 = __importDefault(require("./invoices/sendInvoice"));
const cancelInvoice_1 = __importDefault(require("./invoices/cancelInvoice"));
const createPaymentLink_1 = __importDefault(require("./paymentLinks/createPaymentLink"));
const updatePaymentLink_1 = __importDefault(require("./paymentLinks/updatePaymentLink"));
const getPaymentLink_1 = __importDefault(require("./paymentLinks/getPaymentLink"));
const listPaymentLinks_1 = __importDefault(require("./paymentLinks/listPaymentLinks"));
// Rename the function to avoid naming conflict with the export
function createTools(context) {
    return [
        (0, createInvoice_1.default)(context),
        (0, updateInvoice_1.default)(context),
        (0, getInvoice_1.default)(context),
        (0, listInvoices_1.default)(context),
        (0, sendInvoice_1.default)(context),
        (0, cancelInvoice_1.default)(context),
        (0, createPaymentLink_1.default)(context),
        (0, updatePaymentLink_1.default)(context),
        (0, getPaymentLink_1.default)(context),
        (0, listPaymentLinks_1.default)(context)
    ];
}
exports.default = createTools;
