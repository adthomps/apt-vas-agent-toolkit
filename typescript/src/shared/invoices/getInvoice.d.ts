import { z } from 'zod';
import { Tool } from '../tools';
import { VisaContext } from '../types';
export declare const getInvoiceParameters: (context?: VisaContext) => z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const getInvoicePrompt: (context?: VisaContext) => string;
export declare const getInvoice: (visaClient: any, context: VisaContext, params: z.infer<ReturnType<typeof getInvoiceParameters>>) => Promise<any>;
declare const tool: (context: VisaContext) => Tool;
export default tool;
