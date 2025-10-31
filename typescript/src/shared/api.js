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
exports.VisaAcceptanceAPI = void 0;
const tools_1 = __importDefault(require("./tools"));
const configuration_1 = require("./configuration");
const cybersourceRestApi = require('cybersource-rest-client');
/**
 * API Client for Visa Acceptance API
 */
class VisaAcceptanceAPI {
    requestHost;
    merchantId;
    merchantKeyId;
    merchantSecretKey;
    _apiClient;
    context;
    tools;
    /**
     * Creates a new VisaAcceptanceAPI instance
     * @param context The Visa context containing credentials
     */
    constructor(context) {
        this.merchantId = context.merchantId;
        this.merchantKeyId = context.apiKeyId;
        this.merchantSecretKey = context.secretKey;
        this.requestHost = context.environment === 'SANDBOX' ?
            'apitest.cybersource.com' : 'api.cybersource.com';
        this.context = context || {};
        this.tools = (0, tools_1.default)(this.context);
        // Get proper configuration and initialize the API client with it
        const config = (0, configuration_1.getVisaAcceptanceConfig)(context);
        // Override config with context values if provided
        const configObj = {
            authenticationType: config.authenticationType,
            runEnvironment: this.requestHost,
            merchantID: this.merchantId || config.merchantID,
            merchantKeyId: this.merchantKeyId || config.merchantKeyId,
            merchantsecretKey: this.merchantSecretKey || config.merchantsecretKey,
            keyAlias: config.keyAlias,
            keyPass: config.keyPass,
            keyFileName: config.keyFileName,
            keysDirectory: config.keysDirectory,
            useMetaKey: config.useMetaKey,
            portfolioID: config.portfolioID,
            pemFileDirectory: config.pemFileDirectory,
            defaultDeveloperId: 'A2R8EP3K',
            logConfiguration: config.logConfiguration
        };
        // Initialize the API client and set the configuration
        const apiClient = new cybersourceRestApi.ApiClient();
        apiClient.setConfiguration(configObj);
        this._apiClient = {
            visaApiClient: apiClient,
            configuration: configObj
        };
    }
    async run(method, arg) {
        // Test/mock mode: return a deterministic fake response so tests can run in CI
        // without real SANDBOX credentials.
        const mockFlag = (process.env.VISA_ACCEPTANCE_API_MOCK || '').toLowerCase();
        if (mockFlag === '1' || mockFlag === 'true') {
            // Provide more realistic, method-aware mock payloads so UI and Playwright
            // tests can assert on fields like `linkType`.
            const m = String(method || '').toLowerCase();
            // Simple helper to generate timestamps
            const now = new Date().toISOString();
            if (m.includes('payment') || m.includes('payment-links') || (arg && String(arg).includes('payment-links'))) {
                // Provide nested objects that mirror typical provider responses so the UI
                // normalization logic can exercise multiple fallback paths.
                const fake = {
                    mock: true,
                    paymentLinks: [
                        {
                            id: `MOCK-PL-${Math.random().toString(36).slice(2, 6)}`,
                            // top-level simple fields
                            amount: '25.00',
                            currency: 'USD',
                            memo: 'Sticker Pack',
                            created: now,
                            linkType: 'PURCHASE',
                            paymentLinkUrl: 'https://example.com/pay/1',
                            // nested canonical structure
                            orderInformation: {
                                amountDetails: { totalAmount: '25.00', currency: 'USD' },
                                lineItems: [{ productName: 'Sticker Pack', productDescription: 'Vinyl sticker pack', unitPrice: '25.00', quantity: 1 }]
                            },
                            purchaseInformation: { linkType: 'PURCHASE' },
                            paymentInformation: { description: 'Sticker Pack' }
                        },
                        {
                            id: `MOCK-PL-${Math.random().toString(36).slice(2, 6)}`,
                            minAmount: '1.00',
                            maxAmount: '500.00',
                            currency: 'USD',
                            memo: 'Charity Drive',
                            created: now,
                            linkType: 'DONATION',
                            paymentLinkUrl: 'https://example.com/pay/2',
                            orderInformation: {
                                amountDetails: { totalAmount: undefined, currency: 'USD' },
                                lineItems: [{ productName: 'Donation', productDescription: 'Support the cause', unitPrice: undefined, quantity: 0 }]
                            },
                            purchaseInformation: { minAmount: '1.00', maxAmount: '500.00', link_type: 'DONATION' },
                            paymentInformation: { description: 'Charity Drive' }
                        }
                    ],
                    total: 2,
                };
                return JSON.stringify(fake);
            }
            if (m.includes('invoice') || m.includes('invoices')) {
                const fake = {
                    mock: true,
                    invoices: [
                        {
                            id: `MOCK-INV-${Math.random().toString(36).slice(2, 6)}`,
                            orderInformation: {
                                amountDetails: { totalAmount: '450.00', currency: 'EUR' },
                                lineItems: [{ productName: 'Consulting', productDescription: 'Dev work', unitPrice: '450.00', quantity: 1 }]
                            },
                            customerInformation: { name: 'ACME Corp', email: 'billing@acme.example' },
                            status: 'SENT',
                            invoiceInformation: { dueDate: new Date(Date.now() + (15 * 24 * 60 * 60 * 1000)).toISOString(), paymentLink: 'https://example.com/invoice/1' }
                        }
                    ],
                    total: 1,
                };
                return JSON.stringify(fake);
            }
            // Generic fallback mock
            const fake = {
                mock: true,
                method,
                params: arg,
                timestamp: now,
                id: `MOCK-${Math.random().toString(36).slice(2, 8)}`,
            };
            return JSON.stringify(fake);
        }
        const tool = this.tools.find((t) => t.method === method);
        if (tool) {
            const output = JSON.stringify(await tool.execute(this._apiClient, this.context, arg));
            return output;
        }
        else {
            throw new Error('Invalid method ' + method);
        }
    }
}
exports.VisaAcceptanceAPI = VisaAcceptanceAPI;
exports.default = VisaAcceptanceAPI;
