import { VisaContext } from './types';
import { Tool } from './tools';
/**
 * API Client for Visa Acceptance API
 */
declare class VisaAcceptanceAPI {
    private requestHost;
    private merchantId;
    private merchantKeyId;
    private merchantSecretKey;
    _apiClient: any;
    context: VisaContext;
    tools: Tool[];
    /**
     * Creates a new VisaAcceptanceAPI instance
     * @param context The Visa context containing credentials
     */
    constructor(context: VisaContext);
    run(method: string, arg: any): Promise<string>;
}
export default VisaAcceptanceAPI;
export { VisaAcceptanceAPI };
