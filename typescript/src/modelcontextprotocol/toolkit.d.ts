import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Configuration } from '../shared/configuration.js';
declare class VisaAcceptanceAgentToolkit extends McpServer {
    private _visaAcceptanceAPI;
    private credentials;
    constructor(options?: {
        merchantId?: string;
        apiKeyId?: string;
        secretKey?: string;
        environment?: string;
        configuration?: Configuration;
    });
}
export default VisaAcceptanceAgentToolkit;
