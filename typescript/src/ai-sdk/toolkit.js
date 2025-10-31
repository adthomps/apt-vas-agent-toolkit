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
const api_1 = require("../shared/api");
const tool_1 = __importDefault(require("./tool"));
const configuration_1 = require("../shared/configuration");
const tools_1 = require("../shared/tools");
class VisaAcceptanceAgentToolkit {
    api;
    tools;
    toolMap = new Map();
    configuration;
    credentials;
    /**
     * Creates a new Visa Acceptance Agent Toolkit
     * @param options Configuration options
     */
    constructor(merchantIdTool, merchantKeyIdTool, secretKeyTool, environment, configuration = {}) {
        this.credentials = {
            secretKey: secretKeyTool || process.env.VISA_ACCEPTANCE_SECRET_KEY,
            merchantId: merchantIdTool || process.env.VISA_ACCEPTANCE_MERCHANT_ID,
            merchantKeyId: merchantKeyIdTool || process.env.VISA_ACCEPTANCE_API_KEY_ID
        };
        // Initialize API client with credentials
        // Convert credentials to match VisaContext type
        const visaContext = {
            merchantId: this.credentials.merchantId || '',
            apiKeyId: this.credentials.merchantKeyId || '',
            secretKey: this.credentials.secretKey || '',
            environment: environment || 'SANDBOX',
            mode: 'agent-toolkit'
        };
        this.api = new api_1.VisaAcceptanceAPI(visaContext);
        this.tools = {};
        // Set configuration with defaults
        this.configuration = configuration;
        const allTools = (0, tools_1.tools)(visaContext);
        const filteredTools = allTools.filter((tool) => {
            const allowed = (0, configuration_1.isToolAllowed)(tool, configuration);
            return allowed;
        });
        filteredTools.forEach((tool) => {
            this.tools[tool.method] = (0, tool_1.default)(this.api, tool.method, tool.description, tool.parameters);
        });
    }
    /**
     * Get all available tools
     * @returns Array of CoreTool objects
     */
    getTools() {
        return this.tools;
    }
}
exports.default = VisaAcceptanceAgentToolkit;
