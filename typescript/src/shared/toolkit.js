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
exports.VisaAcceptanceAgentToolkit = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const dotenv_1 = __importDefault(require("dotenv"));
const tools_1 = __importDefault(require("./tools"));
const api_1 = __importDefault(require("./api"));
/**
 * Visa Acceptance Agent Toolkit class
 * Encapsulates the MCP server functionality
 */
class VisaAcceptanceAgentToolkit {
    server;
    context = {
        mode: 'modelcontextprotocol'
    };
    visaContext;
    /**
     * Creates a new Visa Acceptance Agent Toolkit
     * @param options Configuration options
     */
    constructor(options = {}) {
        dotenv_1.default.config();
        this.visaContext = {
            merchantId: options.merchantId || process.env.MERCHANT_ID || process.env.VISA_ACCEPTANCE_MERCHANT_ID || '',
            apiKeyId: options.apiKeyId || process.env.API_KEY_ID || process.env.VISA_ACCEPTANCE_API_KEY_ID || '',
            secretKey: options.secretKey || process.env.SECRET_KEY || process.env.VISA_ACCEPTANCE_SECRET_KEY || '',
            environment: options.environment || 'SANDBOX'
        };
        if ((!this.visaContext.merchantId || !this.visaContext.apiKeyId || !this.visaContext.secretKey)) {
            throw new Error('Missing Visa Acceptance API credentials. Please provide them in options or set environment variables.');
        }
        this.server = new index_js_1.Server({
            name: 'visa-acceptance',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {
                    enabled: true
                },
            },
        });
        this.setupToolHandlers();
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    /**
     * Set up tool handlers for the MCP server
     */
    setupToolHandlers() {
        const visaContext = {
            merchantId: process.env.VISA_ACCEPTANCE_MERCHANT_ID || '',
            apiKeyId: process.env.VISA_ACCEPTANCE_API_KEY_ID || '',
            secretKey: process.env.VISA_ACCEPTANCE_SECRET_KEY || '',
            environment: process.env.VISA_ACCEPTANCE_ENVIRONMENT || 'SANDBOX'
        };
        const toolDefinitions = (0, tools_1.default)(visaContext);
        const methodToMcpName = {};
        console.error('Available tools:');
        toolDefinitions.forEach((tool) => {
            const mcpName = methodToMcpName[tool.method] || `custom.${tool.method}`;
            console.error(`- ${tool.name} (${tool.method} → ${mcpName}): ${tool.description.substring(0, 50)}...`);
        });
        /**
         * Handle tool listing requests - converts Zod schemas to JSON Schema format
         */
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            const toolsList = toolDefinitions.map((tool) => {
                const name = methodToMcpName[tool.method] || `custom.${tool.method}`;
                const properties = {};
                const required = [];
                const paramShape = tool.parameters.shape || tool.parameters._def?.shape || {};
                Object.entries(paramShape).forEach(([key, field]) => {
                    if (key.startsWith('_'))
                        return;
                    let type = 'string';
                    if (field._def.typeName === 'ZodNumber') {
                        type = 'number';
                    }
                    else if (field._def.typeName === 'ZodBoolean') {
                        type = 'boolean';
                    }
                    else if (field._def.typeName === 'ZodArray') {
                        type = 'array';
                    }
                    else if (field._def.typeName === 'ZodObject') {
                        type = 'object';
                    }
                    const description = field._def.description || '';
                    if (!field.isOptional()) {
                        required.push(key);
                    }
                    properties[key] = {
                        type,
                        description
                    };
                    if (field._def.typeName === 'ZodObject' && field.shape) {
                        properties[key].properties = {};
                        const nestedRequired = [];
                        Object.entries(field.shape).forEach(([nestedKey, nestedField]) => {
                            if (nestedKey.startsWith('_'))
                                return;
                            let nestedType = 'string';
                            if (nestedField._def.typeName === 'ZodNumber') {
                                nestedType = 'number';
                            }
                            else if (nestedField._def.typeName === 'ZodBoolean') {
                                nestedType = 'boolean';
                            }
                            const nestedDescription = nestedField._def.description || '';
                            if (!nestedField.isOptional()) {
                                nestedRequired.push(nestedKey);
                            }
                            properties[key].properties[nestedKey] = {
                                type: nestedType,
                                description: nestedDescription
                            };
                        });
                        if (nestedRequired.length > 0) {
                            properties[key].required = nestedRequired;
                        }
                    }
                    if (field._def.typeName === 'ZodArray' && field._def.type) {
                        properties[key].items = {
                            type: 'object',
                            properties: {}
                        };
                        if (field._def.type._def.typeName === 'ZodObject' && field._def.type.shape) {
                            const arrayItemRequired = [];
                            Object.entries(field._def.type.shape).forEach(([itemKey, itemField]) => {
                                if (itemKey.startsWith('_'))
                                    return;
                                let itemType = 'string';
                                if (itemField._def.typeName === 'ZodNumber') {
                                    itemType = 'number';
                                }
                                else if (itemField._def.typeName === 'ZodBoolean') {
                                    itemType = 'boolean';
                                }
                                const itemDescription = itemField._def.description || '';
                                if (!itemField.isOptional()) {
                                    arrayItemRequired.push(itemKey);
                                }
                                properties[key].items.properties[itemKey] = {
                                    type: itemType,
                                    description: itemDescription
                                };
                            });
                            if (arrayItemRequired.length > 0) {
                                properties[key].items.required = arrayItemRequired;
                            }
                        }
                    }
                });
                const inputSchema = {
                    type: 'object',
                    properties: properties,
                    required: required
                };
                return {
                    name: name,
                    description: tool.description,
                    inputSchema: inputSchema
                };
            });
            console.error(`Responding with ${toolsList.length} tools`);
            return { tools: toolsList };
        });
        const mcpNameToMethod = {};
        Object.entries(methodToMcpName).forEach(([method, mcpName]) => {
            mcpNameToMethod[mcpName] = method;
        });
        /**
         * Handle tool execution requests
         */
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const mcpToolName = request.params.name;
            const args = request.params.arguments;
            let toolName;
            if (mcpNameToMethod[mcpToolName]) {
                toolName = mcpNameToMethod[mcpToolName];
            }
            else if (mcpToolName.startsWith('custom.')) {
                toolName = mcpToolName.substring(7);
            }
            else {
                toolName = mcpToolName;
            }
            try {
                const tool = toolDefinitions.find((t) => t.method === toolName);
                if (!tool) {
                    throw new Error(`Unknown tool: ${toolName}`);
                }
                const visaClient = new api_1.default(this.visaContext)._apiClient;
                const result = await tool.execute(visaClient, this.visaContext, args);
                return this.formatResponse({ success: true, result });
            }
            catch (error) {
                console.error(`Error executing tool ${toolName}:`, error);
                const errorMessage = error instanceof Error ? error.message : `Unknown error occurred with ${toolName}`;
                return this.formatResponse({ success: false, error: errorMessage }, true);
            }
        });
    }
    /**
     * Format the response for the MCP server
     */
    formatResponse(response, isError = false) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(response, null, 2)
                }
            ],
            isError
        };
    }
    /**
     * Connect and run the MCP server
     */
    async connect(transport) {
        const serverTransport = transport || new stdio_js_1.StdioServerTransport();
        await this.server.connect(serverTransport);
        console.error('Visa Acceptance MCP server running on stdio');
        if (this.visaContext.environment === 'PRODUCTION') {
            console.error('⚠️ Running in PRODUCTION ENVIRONMENT');
        }
        else {
            console.error('⚠️ Running in SANDBOX ENVIRONMENT');
        }
    }
    /**
     * Close the MCP server
     */
    async close() {
        await this.server.close();
    }
}
exports.VisaAcceptanceAgentToolkit = VisaAcceptanceAgentToolkit;
exports.default = VisaAcceptanceAgentToolkit;
