import type { Tool } from 'ai';
import { Configuration } from '../shared/types';
declare class VisaAcceptanceAgentToolkit {
    private api;
    private tools;
    private toolMap;
    private configuration;
    private credentials;
    /**
     * Creates a new Visa Acceptance Agent Toolkit
     * @param options Configuration options
     */
    constructor(merchantIdTool: string | undefined, merchantKeyIdTool: string | undefined, secretKeyTool: string | undefined, environment?: string, configuration?: Configuration);
    /**
     * Get all available tools
     * @returns Array of CoreTool objects
     */
    getTools(): {
        [key: string]: Tool;
    };
}
export default VisaAcceptanceAgentToolkit;
