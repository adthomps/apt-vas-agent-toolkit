import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
/**
 * API response interface
 */
export interface ApiResponse {
    success: boolean;
    result?: any;
    error?: string;
}
/**
 * Tool response interface for MCP
 */
export interface ToolResponse {
    content: {
        type: string;
        text: string;
    }[];
    isError?: boolean;
}
/**
 * Visa context interface
 */
export interface VisaContext {
    merchantId: string;
    apiKeyId: string;
    secretKey: string;
    environment: string;
}
/**
 * Configuration interface for Visa Acceptance Agent Toolkit
 *
 */
export interface VisaAcceptanceAgentToolkitOptions {
    merchantId?: string;
    apiKeyId?: string;
    secretKey?: string;
    environment?: string;
    configuration?: {
        actions?: {
            invoices?: {
                create?: boolean;
                read?: boolean;
                update?: boolean;
            };
            paymentLinks?: {
                create?: boolean;
                read?: boolean;
                update?: boolean;
            };
        };
    };
}
/**
 * Visa Acceptance Agent Toolkit class
 * Encapsulates the MCP server functionality
 */
export declare class VisaAcceptanceAgentToolkit {
    private server;
    private context;
    private visaContext;
    /**
     * Creates a new Visa Acceptance Agent Toolkit
     * @param options Configuration options
     */
    constructor(options?: VisaAcceptanceAgentToolkitOptions);
    /**
     * Set up tool handlers for the MCP server
     */
    private setupToolHandlers;
    /**
     * Format the response for the MCP server
     */
    private formatResponse;
    /**
     * Connect and run the MCP server
     */
    connect(transport?: StdioServerTransport): Promise<void>;
    /**
     * Close the MCP server
     */
    close(): Promise<void>;
}
export default VisaAcceptanceAgentToolkit;
