"use strict";
/* © 2025 Visa.

Utility helpers to infer short, reason-specific suggestions for common
validation/API errors returned by Visa Acceptance (Invoices/Payment Links).
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferSuggestionFromApi = inferSuggestionFromApi;
exports.withSuggestion = withSuggestion;
function safeToString(x) {
    if (!x)
        return '';
    if (typeof x === 'string')
        return x;
    try {
        return JSON.stringify(x);
    }
    catch {
        return String(x);
    }
}
function collectText(...parts) {
    return parts.map(safeToString).filter(Boolean).join(' ');
}
function normalize(s) {
    return (s || '').toLowerCase();
}
// Heuristic suggestions based on common fields/messages
function inferSuggestionFromApi(payload) {
    const { status, message, responseText, responseBody } = payload || {};
    const all = normalize(collectText(message, responseText, responseBody));
    // Currency format
    if (/currency/.test(all) && /(invalid|not|supported|bad)/.test(all)) {
        return 'Use a 3-letter ISO currency code like USD or EUR (uppercase).';
    }
    // Amount > 0
    if (/(totalamount|amount)/.test(all) && /(invalid|must|greater than 0|negative|zero)/.test(all)) {
        return 'Set a positive amount like 100.00 (two decimals).';
    }
    // Due date in the future / valid format
    if (/duedate|due date/.test(all)) {
        if (/(past|before|expired)/.test(all)) {
            return 'Choose a future dueDate in YYYY-MM-DD (e.g., in 10 days).';
        }
        if (/(invalid|bad format|parse)/.test(all)) {
            return 'Provide dueDate in YYYY-MM-DD format (e.g., 2025-11-15).';
        }
    }
    // Invoice number / purchase number shape
    if (/(invoice[_\s-]?number|invoicenumber|referencenumber)/.test(all)) {
        if (/(invalid|length|characters|alphanumeric|special)/.test(all)) {
            return 'Use up to 20 alphanumeric characters for the invoice number (letters/numbers only).';
        }
    }
    if (/(purchasenumber|purchase number)/.test(all)) {
        if (/(invalid|length|characters|alphanumeric|special)/.test(all)) {
            return 'Use up to 20 alphanumeric characters for the purchase number (no spaces or punctuation).';
        }
    }
    // Email format
    if (/email/.test(all) && /(invalid|format|parse)/.test(all)) {
        return 'Use a valid email like name@example.com.';
    }
    // Line item hints (payment links)
    if (/line\s*items?/.test(all) && /(missing|required)/.test(all)) {
        return 'Include at least one line item with productName, quantity, and unitPrice.';
    }
    // Fallbacks
    if (status === 401 || /unauthoriz|credential|signature/.test(all)) {
        return 'Check API credentials and environment (SANDBOX vs PRODUCTION).';
    }
    if (status === 400 || /invalid request|validation/.test(all)) {
        return 'Double-check required fields and formats (amount, currency, dates).';
    }
    return undefined;
}
// Merge an inferred suggestion into an error-like object
function withSuggestion(err, context) {
    const suggestion = inferSuggestionFromApi({
        status: err.status,
        message: err.message,
        responseText: err.responseText,
        responseBody: err.responseBody,
        context,
    });
    if (suggestion) {
        // Use Object.assign to preserve typing while merging suggestion in a controlled cast
        return Object.assign({}, err, { suggestion });
    }
    return err;
}
