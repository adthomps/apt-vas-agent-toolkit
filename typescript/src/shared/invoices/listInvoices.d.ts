import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
export declare const listInvoicesParameters: (context?: VisaContext) => z.ZodObject<{
    offset: z.ZodNumber;
    limit: z.ZodNumber;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    offset: number;
    limit: number;
    status?: string | undefined;
}, {
    offset: number;
    limit: number;
    status?: string | undefined;
}>;
export declare const listInvoicesPrompt: (context?: VisaContext) => string;
export declare const listInvoices: (visaClient: any, context: VisaContext, params: z.infer<ReturnType<typeof listInvoicesParameters>>) => Promise<any>;
declare const tool: (context: VisaContext) => Tool;
export default tool;
