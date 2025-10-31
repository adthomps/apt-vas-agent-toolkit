import { VisaContext } from './types';
import { Configuration as ImportedConfiguration } from './types';
export type Configuration = ImportedConfiguration;
import { Tool } from './tools';
export type Object = 'invoices' | 'paymentLinks';
export type Permission = 'create' | 'update' | 'read';
export type Actions = {
    [K in Object]?: {
        [K in Permission]?: boolean;
    };
} & {
    balance?: {
        read?: boolean;
    };
};
export type Context = {
    mode?: 'modelcontextprotocol' | 'toolkit';
};
/**
 * Creates a context object for the Visa Acceptance API
 * @param options Options for creating the context
 * @returns A VisaContext object
 */
export declare function createContext(options: any): VisaContext;
/**
 * Checks if a tool is allowed based on the configuration
 * @param tool The tool to check
 * @param config The configuration to check against
 * @returns True if the tool is allowed, false otherwise
 */
export declare function isToolAllowed(tool: Tool, config: Configuration): boolean;
/**
 * Get Visa Acceptance configuration
 */
export declare function getVisaAcceptanceConfig(context: VisaContext): {
    authenticationType: string;
    runEnvironment: string;
    /**
     * Merchant credentials
     */
    merchantID: string;
    merchantKeyId: string;
    merchantsecretKey: string;
    keyAlias: string | undefined;
    keyPass: string | undefined;
    keyFileName: string | undefined;
    keysDirectory: string;
    useMetaKey: boolean;
    portfolioID: string | undefined;
    pemFileDirectory: string | undefined;
    defaultDeveloperId: string;
    logConfiguration: {
        enableLog: boolean;
        logFileName: string;
        logDirectory: string;
        logFileMaxSize: string;
        loggingLevel: string;
        enableMasking: boolean;
    };
};
