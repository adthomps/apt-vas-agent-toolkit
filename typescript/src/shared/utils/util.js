"use strict";
/* © 2025 Visa.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskInvoicesCustomerInfo = exports.maskInvoiceCustomerInfo = exports.maskPII = void 0;
exports.setDeveloperId = setDeveloperId;
/**
 * Sets the developer ID in the request object based on the context mode
 * @param requestObj The request object to update
 * @param context The Visa context containing the mode
 * @returns The updated request object
 */
function setDeveloperId(requestObj, context) {
    // Initialize clientReferenceInformation if it doesn't exist
    if (!requestObj.clientReferenceInformation) {
        requestObj.clientReferenceInformation = {};
    }
    // Initialize partner object if it doesn't exist
    if (!requestObj.clientReferenceInformation.partner) {
        requestObj.clientReferenceInformation.partner = {};
    }
    // Set the developer ID based on the context mode, but do not overwrite if already present
    if (!requestObj.clientReferenceInformation.partner.developerId) {
        requestObj.clientReferenceInformation.partner.developerId =
            context?.mode === 'modelcontextprotocol' ? 'N05YN5UH' : 'A2R8EP3K';
    }
    return requestObj;
}
/**
 * Masks personally identifiable information (PII) in a string
 * @param value The string to mask
 * @param maskPosition Position to apply masking (start, end, or random)
 * @returns The masked string
 */
const maskPII = (value, maskPosition = 'end') => {
    try {
        if (!value)
            return value;
        const maxVisibleChars = Math.min(3, Math.floor(value.length * 0.3));
        const charsToMask = value.length - maxVisibleChars;
        const mask = '*'.repeat(charsToMask);
        switch (maskPosition) {
            case 'start':
                return mask + value.slice(-maxVisibleChars);
            case 'end':
                return value.slice(0, maxVisibleChars) + mask;
            case 'random':
                const chars = value.split('');
                const positions = Array.from({ length: value.length }, (_, i) => i);
                for (let i = positions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [positions[i], positions[j]] = [positions[j], positions[i]];
                }
                for (let i = 0; i < charsToMask; i++) {
                    chars[positions[i]] = '*';
                }
                return chars.join('');
        }
        return value;
    }
    catch (error) {
        return 'Failed to mask PII';
    }
};
exports.maskPII = maskPII;
/**
 * Masks customer information in an invoice object
 * @param invoice The invoice object to mask
 * @param context The context
 * @returns The masked invoice object
 */
const maskInvoiceCustomerInfo = (invoice, context) => {
    try {
        if (!invoice)
            return invoice;
        const maskedInvoice = JSON.parse(JSON.stringify(invoice));
        if (maskedInvoice.customerInformation) {
            if (maskedInvoice.customerInformation.name) {
                maskedInvoice.customerInformation.name = (0, exports.maskPII)(maskedInvoice.customerInformation.name, 'end');
            }
            if (maskedInvoice.customerInformation.email) {
                const emailParts = maskedInvoice.customerInformation.email.split('@');
                if (emailParts.length === 2) {
                    const maskedLocalPart = (0, exports.maskPII)(emailParts[0], 'end');
                    maskedInvoice.customerInformation.email = `${maskedLocalPart}@${emailParts[1]}`;
                }
                else {
                    maskedInvoice.customerInformation.email = (0, exports.maskPII)(maskedInvoice.customerInformation.email, 'end');
                }
            }
        }
        return maskedInvoice;
    }
    catch (error) {
        return 'Failed to mask invoice customer information';
    }
};
exports.maskInvoiceCustomerInfo = maskInvoiceCustomerInfo;
/**
 * Masks customer information in an array of invoice objects
 * @param invoices The array of invoice objects to mask
 * @param context The context
 * @returns The array of masked invoice objects
 */
const maskInvoicesCustomerInfo = (invoices, context) => {
    try {
        if (!invoices || !Array.isArray(invoices))
            return invoices;
        return invoices.map(invoice => (0, exports.maskInvoiceCustomerInfo)(invoice, context));
    }
    catch (error) {
        return [];
    }
};
exports.maskInvoicesCustomerInfo = maskInvoicesCustomerInfo;
