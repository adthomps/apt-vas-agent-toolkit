"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tools_1 = __importDefault(require("../tools"));
describe('tool-schema-to-JSON conversion (smoke)', () => {
    it('converts each tool.parameters into a JSON-ish inputSchema without throwing', () => {
        const ctx = { merchantId: 'm', apiKeyId: 'k', secretKey: 's', environment: 'SANDBOX' };
        const toolDefinitions = (0, tools_1.default)(ctx);
        expect(Array.isArray(toolDefinitions)).toBe(true);
        const toolsList = toolDefinitions.map((tool) => {
            const paramShape = tool.parameters.shape || tool.parameters._def?.shape || {};
            const properties = {};
            const required = [];
            Object.entries(paramShape).forEach(([key, field]) => {
                if (key.startsWith('_'))
                    return;
                // Best-effort mapping used by toolkit.ts — this test asserts it completes
                let type = 'string';
                try {
                    if (field._def?.typeName === 'ZodNumber')
                        type = 'number';
                    else if (field._def?.typeName === 'ZodBoolean')
                        type = 'boolean';
                    else if (field._def?.typeName === 'ZodArray')
                        type = 'array';
                    else if (field._def?.typeName === 'ZodObject')
                        type = 'object';
                }
                catch { }
                if (!field.isOptional?.()) {
                    required.push(key);
                }
                properties[key] = { type, description: field._def?.description || '' };
            });
            return { name: tool.name, inputSchema: { type: 'object', properties, required } };
        });
        // Basic sanity checks
        expect(toolsList.length).toBeGreaterThan(0);
        for (const t of toolsList) {
            expect(typeof t.name).toBe('string');
            expect(t.inputSchema).toBeTruthy();
            expect(t.inputSchema.type).toBe('object');
        }
    });
});
