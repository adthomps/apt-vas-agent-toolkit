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
exports.VisaAcceptanceTool = exports.VisaAcceptanceAgentToolkit = void 0;
const toolkit_1 = __importDefault(require("./toolkit"));
exports.VisaAcceptanceAgentToolkit = toolkit_1.default;
const tool_1 = __importDefault(require("./tool"));
exports.VisaAcceptanceTool = tool_1.default;
// Export a default instance of the toolkit for ease of use
exports.default = new toolkit_1.default(process.env.VISA_ACCEPTANCE_MERCHANT_ID, process.env.VISA_ACCEPTANCE_API_KEY_ID, process.env.VISA_ACCEPTANCE_SECRET_KEY, (process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX').toUpperCase());
